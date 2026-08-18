import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../auth/auth.service';
import { Tenant, TenantService } from '../../services/tenants.service';
import { Branch, BranchService } from '../../services/branches.service';
import { BranchPrice, Dish, DishService, RecipeLine } from '../../services/dishes.service';
import { Ingredient, IngredientService } from '../../services/ingredients.service';

interface RecipeFormLine {
  ingredientId: string;
  quantity: number;
}

interface DishForm {
  tenantId: string;
  name: string;
  salePrice: number;
  recipe: RecipeFormLine[];
  branchPrices: BranchPrice[];
  category: string;
  icon: string;
}

const EMPTY_FORM: DishForm = {
  tenantId: '',
  name: '',
  salePrice: 0,
  recipe: [],
  branchPrices: [],
  category: '',
  icon: '',
};

@Component({
  selector: 'app-dishes',
  imports: [FormsModule],
  templateUrl: './dishes.component.html',
})
export class DishesComponent implements OnInit {
  readonly #dishService = inject(DishService);
  readonly #ingredientService = inject(IngredientService);
  readonly #tenantService = inject(TenantService);
  readonly #branchService = inject(BranchService);
  readonly #authService = inject(AuthService);

  readonly tenants = signal<Tenant[]>([]);
  readonly ingredients = signal<Ingredient[]>([]);
  readonly branches = signal<Branch[]>([]);
  readonly dishes = signal<Dish[]>([]);
  readonly selectedTenantId = signal<string>('');
  readonly selectedBranchId = signal<string>('');
  readonly search = signal('');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly saving = signal(false);
  readonly creating = signal(false);

  readonly isSysadmin = this.#authService.user()?.role === 'sysadmin';

  editing: Dish | null = null;
  newDish: DishForm = { ...EMPTY_FORM };

  ngOnInit(): void {
    this.#loadTenants();
    this.#loadIngredients();
    this.#loadBranches();
    this.#loadDishes();
  }

  onTenantChange(tenantId: string): void {
    this.selectedTenantId.set(tenantId);
    this.selectedBranchId.set('');
    this.#loadBranches();
    this.#loadDishes();
  }

  onBranchChange(branchId: string): void {
    this.selectedBranchId.set(branchId);
    this.#loadDishes();
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    this.#loadDishes();
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

  #loadDishes(): void {
    this.loading.set(true);
    this.error.set('');

    const tenantId = this.isSysadmin ? this.selectedTenantId() || undefined : undefined;
    const q = this.search() || undefined;
    const branchId = this.selectedBranchId() || undefined;

    this.#dishService.list(tenantId, q, branchId).subscribe({
      next: (dishes) => {
        this.dishes.set(dishes);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar los platos.');
      },
    });
  }

  tenantName(tenantId: string): string {
    return this.tenants().find((t) => t._id === tenantId)?.name ?? '—';
  }

  ingredientName(ingredientId: string): string {
    return this.ingredients().find((i) => i._id === ingredientId)?.name ?? '—';
  }

  ingredientUnit(ingredientId: string): string {
    return this.ingredients().find((i) => i._id === ingredientId)?.unit ?? '';
  }

  branchPriceOf(target: { branchPrices?: BranchPrice[] }, branchId: string): number | null {
    return (
      target.branchPrices?.find((entry) => entry.branchId === branchId)?.price ?? null
    );
  }

  setBranchPrice(
    target: { branchPrices?: BranchPrice[] },
    branchId: string,
    value: string
  ): void {
    const price = Number(value);

    if (!target.branchPrices) {
      target.branchPrices = [];
    }

    const index = target.branchPrices.findIndex((entry) => entry.branchId === branchId);

    if (!Number.isFinite(price) || price <= 0) {
      if (index >= 0) {
        target.branchPrices.splice(index, 1);
      }
      return;
    }

    if (index >= 0) {
      target.branchPrices[index].price = price;
    } else {
      target.branchPrices.push({ branchId, price });
    }
  }

  formatCost(value: number | undefined): string {
    if (value === undefined || value === null) {
      return '—';
    }
    return `$${value.toLocaleString('es-CL')}`;
  }

  marginPercent(dish: Dish): number {
    if (dish.salePrice <= 0 || dish.cost === undefined || dish.cost === null) {
      return 0;
    }
    return Math.round(((dish.salePrice - dish.cost) / dish.salePrice) * 100);
  }

  addRecipeLine(target: { recipe: Array<{ ingredientId: string; quantity: number }> }): void {
    const first = this.ingredients()[0]?._id ?? '';
    target.recipe.push({ ingredientId: first, quantity: 1 });
  }

  removeRecipeLine(
    target: { recipe: Array<{ ingredientId: string; quantity: number }> },
    index: number
  ): void {
    target.recipe.splice(index, 1);
  }

  startCreate(): void {
    this.newDish = {
      ...EMPTY_FORM,
      tenantId: this.isSysadmin
        ? this.selectedTenantId()
        : this.#authService.user()?.tenantId ?? '',
    };
    this.addRecipeLine(this.newDish);
    this.creating.set(true);
    this.error.set('');
  }

  cancelCreate(): void {
    this.creating.set(false);
  }

  saveCreate(): void {
    if (!this.newDish.tenantId) {
      this.error.set('Selecciona un tenant para el plato.');
      return;
    }

    if (this.newDish.recipe.some((line) => !line.ingredientId || line.quantity <= 0)) {
      this.error.set(
        'Completa cada línea de la receta con un ingrediente y una cantidad mayor a cero.'
      );
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const { tenantId, name, salePrice } = this.newDish;
    const recipe: RecipeLine[] = this.newDish.recipe.map((line) => ({
      ingredientId: line.ingredientId,
      quantity: line.quantity,
      unit: this.ingredientUnit(line.ingredientId),
    }));
    const branchPrices = this.newDish.branchPrices?.length ? this.newDish.branchPrices : undefined;
    const category = this.newDish.category.trim() || undefined;
    const icon = this.newDish.icon.trim() || undefined;

    this.#dishService
      .create({ tenantId, name, salePrice, recipe, branchPrices, active: true, category, icon })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.creating.set(false);
          this.#loadDishes();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err.error?.error ?? 'No se pudo crear el plato.');
        },
      });
  }

  startEdit(dish: Dish): void {
    this.editing = {
      ...dish,
      category: dish.category ?? '',
      icon: dish.icon ?? '',
      recipe: dish.recipe.map((line) => ({ ...line })),
      branchPrices: (dish.branchPrices ?? []).map((entry) => ({ ...entry })),
    };
  }

  cancelEdit(): void {
    this.editing = null;
  }

  saveEdit(): void {
    if (!this.editing) {
      return;
    }

    if (this.editing.recipe.some((line) => !line.ingredientId || line.quantity <= 0)) {
      this.error.set(
        'Completa cada línea de la receta con un ingrediente y una cantidad mayor a cero.'
      );
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const { _id, name, salePrice } = this.editing;
    const recipe: RecipeLine[] = this.editing.recipe.map((line) => ({
      ingredientId: line.ingredientId,
      quantity: line.quantity,
      unit: this.ingredientUnit(line.ingredientId),
    }));
    const branchPrices = this.editing.branchPrices?.length
      ? this.editing.branchPrices
      : undefined;
    const category = this.editing.category?.trim() || undefined;
    const icon = this.editing.icon?.trim() || undefined;

    this.#dishService
      .update(_id, { name, salePrice, recipe, branchPrices, category, icon })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.editing = null;
          this.#loadDishes();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err.error?.error ?? 'No se pudo guardar el plato.');
        },
      });
  }
}