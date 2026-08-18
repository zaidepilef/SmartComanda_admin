import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../auth/auth.service';
import { Tenant, TenantService } from '../../services/tenants.service';
import { Branch, BranchService } from '../../services/branches.service';
import { InventoryService, Movement, StockItem } from '../../services/inventory.service';
import { Ingredient, IngredientService } from '../../services/ingredients.service';

interface AdjustmentForm {
  tenantId: string;
  ingredientId: string;
  branchId: string;
  type: 'entry' | 'exit';
  quantity: number;
  reason: string;
  unitCost: number | null;
}

const EMPTY_FORM: AdjustmentForm = {
  tenantId: '',
  ingredientId: '',
  branchId: '',
  type: 'entry',
  quantity: 1,
  reason: '',
  unitCost: null,
};

@Component({
  selector: 'app-inventory',
  imports: [FormsModule],
  templateUrl: './inventory.component.html',
})
export class InventoryComponent implements OnInit {
  readonly #inventoryService = inject(InventoryService);
  readonly #ingredientService = inject(IngredientService);
  readonly #tenantService = inject(TenantService);
  readonly #branchService = inject(BranchService);
  readonly #authService = inject(AuthService);

  readonly tenants = signal<Tenant[]>([]);
  readonly ingredients = signal<Ingredient[]>([]);
  readonly branches = signal<Branch[]>([]);
  readonly stock = signal<StockItem[]>([]);
  readonly movements = signal<Movement[]>([]);
  readonly selectedTenantId = signal<string>('');
  readonly selectedBranchId = signal<string>('');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly saving = signal(false);
  readonly showAdjustment = signal(false);

  readonly isSysadmin = this.#authService.user()?.role === 'sysadmin';

  adjustment: AdjustmentForm = { ...EMPTY_FORM };

  ngOnInit(): void {
    this.#loadTenants();
    this.#loadIngredients();
    this.#loadBranches();
    this.#loadStock();
    this.#loadMovements();
  }

  onTenantChange(tenantId: string): void {
    this.selectedTenantId.set(tenantId);
    this.selectedBranchId.set('');
    this.#loadBranches();
    this.#loadIngredients();
    this.#loadStock();
    this.#loadMovements();
  }

  onBranchChange(branchId: string): void {
    this.selectedBranchId.set(branchId);
    this.#loadStock();
  }

  #loadTenants(): void {
    this.#tenantService.listAll().subscribe({
      next: (tenants) => this.tenants.set(tenants),
      error: () => this.error.set('No se pudieron cargar los tenants.'),
    });
  }

  #loadIngredients(): void {
    const tenantId = this.isSysadmin ? this.selectedTenantId() || undefined : undefined;
    this.#ingredientService.list(tenantId).subscribe({
      next: (ingredients) => this.ingredients.set(ingredients),
    });
  }

  #loadBranches(): void {
    const tenantId = this.isSysadmin ? this.selectedTenantId() || undefined : undefined;
    this.#branchService.list(tenantId, undefined, 'true').subscribe({
      next: (branches) => this.branches.set(branches),
    });
  }

  #loadStock(): void {
    this.loading.set(true);
    this.error.set('');

    const tenantId = this.isSysadmin ? this.selectedTenantId() || undefined : undefined;
    const branchId = this.selectedBranchId() || undefined;

    this.#inventoryService.listStock(tenantId, branchId).subscribe({
      next: (stock) => {
        this.stock.set(stock);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error ?? 'No se pudo cargar el stock.');
      },
    });
  }

  #loadMovements(): void {
    const tenantId = this.isSysadmin ? this.selectedTenantId() || undefined : undefined;
    this.#inventoryService.listMovements(tenantId).subscribe({
      next: (movements) => this.movements.set(movements),
    });
  }

  tenantName(tenantId: string): string {
    return this.tenants().find((t) => t._id === tenantId)?.name ?? '—';
  }

  ingredientName(ingredientId: string): string {
    return this.ingredients().find((i) => i._id === ingredientId)?.name ?? '—';
  }

  branchName(branchId: string | null | undefined): string {
    if (!branchId) {
      return '—';
    }
    return this.branches().find((b) => b._id === branchId)?.name ?? '—';
  }

  formatQuantity(value: number): string {
    return value.toLocaleString('es-CL');
  }

  formatCost(value: number | undefined): string {
    if (value === undefined || value === null) {
      return '—';
    }
    return `$${value.toLocaleString('es-CL', { maximumFractionDigits: 2 })}`;
  }

  movementDate(date: string): string {
    return new Date(date).toLocaleString('es-CL');
  }

  startAdjustment(): void {
    this.adjustment = {
      ...EMPTY_FORM,
      tenantId: this.isSysadmin
        ? this.selectedTenantId()
        : this.#authService.user()?.tenantId ?? '',
    };
    this.showAdjustment.set(true);
    this.error.set('');
    this.success.set('');
  }

  cancelAdjustment(): void {
    this.showAdjustment.set(false);
  }

  saveAdjustment(): void {
    if (!this.adjustment.tenantId) {
      this.error.set('Selecciona un tenant.');
      return;
    }

    if (!this.adjustment.ingredientId) {
      this.error.set('Selecciona un ingrediente.');
      return;
    }

    if (!this.adjustment.branchId) {
      this.error.set('Selecciona la sucursal (bodega).');
      return;
    }

    if (this.adjustment.type === 'entry' && (this.adjustment.unitCost ?? 0) <= 0) {
      this.error.set('Ingresa el costo unitario de la compra (puesto en bodega).');
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    const { tenantId, ingredientId, branchId, type, quantity, reason, unitCost } =
      this.adjustment;

    this.#inventoryService
      .adjustStock({
        tenantId,
        ingredientId,
        branchId,
        type,
        quantity,
        reason,
        ...(type === 'entry' ? { unitCost: unitCost ?? 0 } : {}),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.showAdjustment.set(false);
          this.success.set('Ajuste de stock registrado.');
          this.#loadStock();
          this.#loadMovements();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err.error?.error ?? 'No se pudo registrar el ajuste.');
        },
      });
  }

  movementLabel(type: Movement['type']): string {
    const labels: Record<Movement['type'], string> = {
      entry: 'Entrada',
      exit: 'Salida',
      sale: 'Venta',
    };
    return labels[type] ?? type;
  }

  movementBadge(type: Movement['type']): string {
    const badges: Record<Movement['type'], string> = {
      entry: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
      exit: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
      sale: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
    };
    return badges[type] ?? 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300';
  }
}