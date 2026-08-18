import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../auth/auth.service';
import { Branch, BranchService } from '../../services/branches.service';
import { Dish, DishService } from '../../services/dishes.service';
import {
  OrderService,
  OrderWarning,
} from '../../services/orders.service';

interface OrderLine {
  dishId: string;
  dishName: string;
  price: number;
  quantity: number;
  stockApplied: boolean;
}

@Component({
  selector: 'app-checkout',
  imports: [FormsModule],
  templateUrl: './checkout.component.html',
})
export class CheckoutComponent implements OnInit {
  readonly #dishService = inject(DishService);
  readonly #branchService = inject(BranchService);
  readonly #orderService = inject(OrderService);
  readonly #authService = inject(AuthService);

  readonly dishes = signal<Dish[]>([]);
  readonly branches = signal<Branch[]>([]);
  readonly selectedBranchId = signal<string>('');
  readonly clientContact = signal('');
  readonly lines = signal<OrderLine[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly lastOrderTotal = signal<number | null>(null);
  readonly lastWarnings = signal<OrderWarning[]>([]);
  readonly isSysadmin = this.#authService.user()?.role === 'sysadmin';

  ngOnInit(): void {
    this.#loadBranches();
    this.#loadDishes();
  }

  #loadBranches(): void {
    this.#branchService.list(undefined, undefined, 'true').subscribe({
      next: (branches) => {
        this.branches.set(branches);

        if (!this.isSysadmin && branches.length === 1) {
          this.selectedBranchId.set(branches[0]._id);
        }
      },
    });
  }

  #loadDishes(): void {
    this.#dishService.list().subscribe({
      next: (dishes) => this.dishes.set(dishes),
    });
  }

  addDish(dish: Dish): void {
    const existing = this.lines().find((line) => line.dishId === dish._id);

    if (existing) {
      existing.quantity += 1;
      this.lines.set([...this.lines()]);
      return;
    }

    this.lines.set([
      ...this.lines(),
      {
        dishId: dish._id,
        dishName: dish.name,
        price: dish.salePrice,
        quantity: 1,
        stockApplied: true,
      },
    ]);
  }

  removeLine(index: number): void {
    this.lines.set(this.lines().filter((_, i) => i !== index));
  }

  lineTotal(line: OrderLine): number {
    return line.price * line.quantity;
  }

  orderTotal(): number {
    return this.lines().reduce((sum, line) => sum + this.lineTotal(line), 0);
  }

  submitOrder(): void {
    if (!this.selectedBranchId()) {
      this.error.set('Selecciona la sucursal donde se atiende el pedido.');
      return;
    }

    if (this.lines().length === 0) {
      this.error.set('Agrega al menos un plato al pedido.');
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.success.set('');
    this.lastWarnings.set([]);
    this.lastOrderTotal.set(null);

    const items = this.lines().map((line) => ({
      dishId: line.dishId,
      quantity: line.quantity,
      stockApplied: line.stockApplied,
    }));

    this.#orderService
      .create({
        foodtruckId: this.selectedBranchId(),
        clientContact: this.clientContact() || undefined,
        items,
      })
      .subscribe({
        next: (result) => {
          this.saving.set(false);
          this.success.set(`Pedido creado. Total: $${result.order.total.toLocaleString('es-CL')}.`);
          this.lastOrderTotal.set(result.order.total);
          this.lastWarnings.set(result.warnings);
          this.lines.set([]);
          this.clientContact.set('');
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err.error?.error ?? 'No se pudo crear el pedido.');
        },
      });
  }
}
