import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../auth/auth.service';
import { Tenant, TenantService } from '../../services/tenants.service';
import {
  DIMENSION_LABELS,
  Ingredient,
  IngredientDimension,
  IngredientService,
} from '../../services/ingredients.service';

interface IngredientForm {
  tenantId: string;
  name: string;
  unit: string;
  dimension: IngredientDimension;
  unitCost: number;
}

const EMPTY_FORM: IngredientForm = {
  tenantId: '',
  name: '',
  unit: '',
  dimension: 'count',
  unitCost: 0,
};

const DIMENSION_BADGES: Record<IngredientDimension, string> = {
  count: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  mass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  volume: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
};

const DIMENSIONS: IngredientDimension[] = ['count', 'mass', 'volume'];

@Component({
  selector: 'app-ingredients',
  imports: [FormsModule],
  templateUrl: './ingredients.component.html',
})
export class IngredientsComponent implements OnInit {
  readonly #ingredientService = inject(IngredientService);
  readonly #tenantService = inject(TenantService);
  readonly #authService = inject(AuthService);

  readonly tenants = signal<Tenant[]>([]);
  readonly ingredients = signal<Ingredient[]>([]);
  readonly selectedTenantId = signal<string>('');
  readonly search = signal('');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly saving = signal(false);
  readonly creating = signal(false);

  readonly isSysadmin = this.#authService.user()?.role === 'sysadmin';

  readonly dimensions = DIMENSIONS;

  editing: Ingredient | null = null;
  newIngredient: IngredientForm = { ...EMPTY_FORM };

  ngOnInit(): void {
    this.#loadTenants();
    this.#loadIngredients();
  }

  onTenantChange(tenantId: string): void {
    this.selectedTenantId.set(tenantId);
    this.#loadIngredients();
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    this.#loadIngredients();
  }

  #loadTenants(): void {
    this.#tenantService.listAll().subscribe({
      next: (tenants) => this.tenants.set(tenants),
      error: () => this.error.set('No se pudieron cargar los tenants.'),
    });
  }

  #loadIngredients(): void {
    this.loading.set(true);
    this.error.set('');

    const tenantId = this.isSysadmin ? this.selectedTenantId() || undefined : undefined;
    const q = this.search() || undefined;

    this.#ingredientService.list(tenantId, q).subscribe({
      next: (ingredients) => {
        this.ingredients.set(ingredients);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar los ingredientes.');
      },
    });
  }

  dimensionLabel(dimension: IngredientDimension): string {
    return DIMENSION_LABELS[dimension] ?? dimension;
  }

  dimensionBadge(dimension: IngredientDimension): string {
    return DIMENSION_BADGES[dimension] ?? 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300';
  }

  tenantName(tenantId: string): string {
    return this.tenants().find((t) => t._id === tenantId)?.name ?? '—';
  }

  startCreate(): void {
    this.newIngredient = {
      ...EMPTY_FORM,
      tenantId: this.isSysadmin ? this.selectedTenantId() : this.#authService.user()?.tenantId ?? '',
    };
    this.creating.set(true);
    this.error.set('');
  }

  cancelCreate(): void {
    this.creating.set(false);
  }

  saveCreate(): void {
    if (!this.newIngredient.tenantId) {
      this.error.set('Selecciona un tenant para el ingrediente.');
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const { tenantId, name, unit, dimension, unitCost } = this.newIngredient;

    this.#ingredientService
      .create({ tenantId, name, unit, dimension, unitCost })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.creating.set(false);
          this.#loadIngredients();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err.error?.error ?? 'No se pudo crear el ingrediente.');
        },
      });
  }

  startEdit(ingredient: Ingredient): void {
    this.editing = { ...ingredient };
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

    const { _id, name, unit, dimension, unitCost } = this.editing;

    this.#ingredientService
      .update(_id, { name, unit, dimension, unitCost })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.editing = null;
          this.#loadIngredients();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err.error?.error ?? 'No se pudo guardar el ingrediente.');
        },
      });
  }
}
