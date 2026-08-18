import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService } from '../../auth/auth.service';
import { AppIconName, IconComponent } from '../../icons/icon.component';
import { Branch, BranchService, BranchType, PaymentMethod } from '../../services/branches.service';
import { Tenant, TenantService } from '../../services/tenants.service';

interface BranchForm {
  tenantId: string;
  name: string;
  type: BranchType;
  address: string;
  city: string;
  phone: string;
  active: boolean;
  paymentMethods: PaymentMethod[];
}

const EMPTY_FORM: BranchForm = {
  tenantId: '',
  name: '',
  type: 'Sucursal',
  address: '',
  city: '',
  phone: '',
  active: true,
  paymentMethods: [],
};

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'debit', label: 'Débito' },
  { value: 'credit', label: 'Crédito' },
  { value: 'transfer', label: 'Transferencia' },
];

const BRANCH_TYPE_LABELS: Record<BranchType, string> = {
  Sucursal: 'Sucursal',
  FoodTruck: 'Food Truck',
};

const BRANCH_TYPE_BADGES: Record<BranchType, string> = {
  Sucursal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  FoodTruck: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
};

const BRANCH_TYPE_ICONS: Record<BranchType, AppIconName> = {
  Sucursal: 'building',
  FoodTruck: 'basket',
};

const BRANCH_TYPE_ICON_BG: Record<BranchType, string> = {
  Sucursal: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
  FoodTruck: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300',
};

export type ActiveFilter = 'all' | 'true' | 'false';

@Component({
  selector: 'app-branches',
  imports: [FormsModule, RouterLink, IconComponent],
  templateUrl: './branches.component.html'
})
export class BranchesComponent implements OnInit {
  readonly #branchService = inject(BranchService);
  readonly #tenantService = inject(TenantService);
  readonly #authService = inject(AuthService);
  readonly #route = inject(ActivatedRoute);

  readonly tenants = signal<Tenant[]>([]);
  readonly branches = signal<Branch[]>([]);
  readonly selectedTenantId = signal<string>('');
  readonly search = signal('');
  readonly activeFilter = signal<ActiveFilter>('all');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly saving = signal(false);
  readonly creating = signal(false);

  readonly paymentMethodOptions = PAYMENT_METHOD_OPTIONS;

  readonly isSysadmin = this.#authService.user()?.role === 'sysadmin';

  editing: Branch | null = null;
  newBranch: BranchForm = { ...EMPTY_FORM };

  ngOnInit(): void {
    const tenantId = this.#route.snapshot.queryParamMap.get('tenantId');

    if (tenantId) {
      this.selectedTenantId.set(tenantId);
    }

    this.#loadTenants();
    this.#loadBranches();
  }

  onTenantChange(tenantId: string): void {
    this.selectedTenantId.set(tenantId);
    this.#loadBranches();
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    this.#loadBranches();
  }

  onActiveFilterChange(value: ActiveFilter): void {
    this.activeFilter.set(value);
    this.#loadBranches();
  }

  #loadTenants(): void {
    this.#tenantService.listAll().subscribe({
      next: (tenants) => this.tenants.set(tenants),
      error: () => this.error.set('No se pudieron cargar los tenants.')
    });
  }

  #loadBranches(): void {
    this.loading.set(true);
    this.error.set('');

    const tenantId = this.isSysadmin ? this.selectedTenantId() || undefined : undefined;
    const q = this.search() || undefined;
    const activeFilter = this.activeFilter();
    const active: 'true' | 'false' | undefined = activeFilter === 'all' ? undefined : activeFilter;

    this.#branchService.list(tenantId, q, active).subscribe({
      next: (branches) => {
        this.branches.set(branches);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar las sucursales.');
      }
    });
  }

  tenantName(tenantId: string): string {
    return this.tenants().find((t) => t._id === tenantId)?.name ?? '—';
  }

  typeLabel(type: BranchType): string {
    return BRANCH_TYPE_LABELS[type] ?? type;
  }

  typeBadge(type: BranchType): string {
    return BRANCH_TYPE_BADGES[type] ?? 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300';
  }

  typeIcon(type: BranchType): AppIconName {
    return BRANCH_TYPE_ICONS[type] ?? 'building';
  }

  typeIconBg(type: BranchType): string {
    return BRANCH_TYPE_ICON_BG[type] ?? BRANCH_TYPE_ICON_BG.Sucursal;
  }

  startCreate(): void {
    this.newBranch = {
      ...EMPTY_FORM,
      tenantId: this.isSysadmin ? this.selectedTenantId() : this.#authService.user()?.tenantId ?? ''
    };
    this.creating.set(true);
    this.error.set('');
  }

  cancelCreate(): void {
    this.creating.set(false);
  }

  toggleNewPaymentMethod(method: PaymentMethod): void {
    const index = this.newBranch.paymentMethods.indexOf(method);

    if (index >= 0) {
      this.newBranch.paymentMethods.splice(index, 1);
    } else {
      this.newBranch.paymentMethods.push(method);
    }
  }

  saveCreate(): void {
    if (!this.newBranch.tenantId) {
      this.error.set('Selecciona un tenant para la sucursal.');
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const { tenantId, name, type, address, city, phone, active } = this.newBranch;
    const paymentMethods = this.newBranch.paymentMethods?.length
      ? this.newBranch.paymentMethods
      : undefined;

    this.#branchService
      .create({
        tenantId,
        name,
        type,
        address: address || undefined,
        city: city || undefined,
        phone: phone || undefined,
        active,
        paymentMethods,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.creating.set(false);
          this.#loadBranches();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err.error?.error ?? 'No se pudo crear la sucursal.');
        }
      });
  }

  startEdit(branch: Branch): void {
    this.editing = { ...branch };
  }

  cancelEdit(): void {
    this.editing = null;
  }

  saveEdit(): void {
    if (!this.editing) {
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const { _id, tenantId, name, type, address, city, phone, active } = this.editing;

    this.#branchService
      .update(_id, {
        tenantId,
        name,
        type,
        address: address || undefined,
        city: city || undefined,
        phone: phone || undefined,
        active,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.editing = null;
          this.#loadBranches();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err.error?.error ?? 'No se pudo guardar la sucursal.');
        }
      });
  }

  toggleActive(branch: Branch): void {
    this.saving.set(true);
    this.error.set('');

    this.#branchService.update(branch._id, { active: !branch.active }).subscribe({
      next: () => {
        this.saving.set(false);
        this.#loadBranches();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.error ?? 'No se pudo cambiar el estado de la sucursal.');
      }
    });
  }
}
