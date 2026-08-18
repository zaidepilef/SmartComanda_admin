import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../auth/auth.service';
import { Branch, BranchService } from '../../services/branches.service';
import { Order, OrderService, OrderStatus } from '../../services/orders.service';

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Nuevo',
  preparing: 'En preparación',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const STATUS_BADGES: Record<OrderStatus, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  preparing: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  ready: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  delivered: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  takeaway: 'Para llevar',
  dinein: 'En salón',
  delivery: 'Delivery',
  qr: 'QR',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  debit: 'Débito',
  credit: 'Crédito',
  transfer: 'Transferencia',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
};

@Component({
  selector: 'app-orders',
  imports: [FormsModule],
  templateUrl: './orders.component.html'
})
export class OrdersComponent implements OnInit {
  readonly #orderService = inject(OrderService);
  readonly #branchService = inject(BranchService);
  readonly #authService = inject(AuthService);

  readonly orders = signal<Order[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  branches: Branch[] = [];
  branchesById = new Map<string, string>();

  branchId = '';
  status = '';
  orderType = '';
  paymentStatus = '';
  paymentMethod = '';
  q = '';
  from = '';
  to = '';

  offset = 0;
  limit = 50;

  expanded = new Set<string>();

  get isCashier(): boolean {
    return this.#authService.user()?.role === 'cashier';
  }

  ngOnInit(): void {
    this.#loadBranches();
    this.#load();
  }

  #loadBranches(): void {
    this.#branchService.list(this.#authService.user()?.tenantId).subscribe({
      next: (branches) => {
        this.branches = branches;
        this.branchesById = new Map(branches.map((branch) => [branch._id, branch.name]));
      }
    });
  }

  #load(): void {
    this.loading.set(true);
    this.error.set('');

    this.#orderService
      .list({
        branchId: this.branchId || undefined,
        status: this.status || undefined,
        orderType: this.orderType || undefined,
        paymentStatus: this.paymentStatus || undefined,
        paymentMethod: this.paymentMethod || undefined,
        q: this.q || undefined,
        from: this.from || undefined,
        to: this.to || undefined,
        limit: this.limit,
        offset: this.offset,
      })
      .subscribe({
        next: (orders) => {
          this.orders.set(orders);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('No se pudieron cargar los pedidos.');
        }
      });
  }

  applyFilters(): void {
    this.offset = 0;
    this.#load();
  }

  resetFilters(): void {
    this.branchId = '';
    this.status = '';
    this.orderType = '';
    this.paymentStatus = '';
    this.paymentMethod = '';
    this.q = '';
    this.from = '';
    this.to = '';
    this.offset = 0;
    this.#load();
  }

  previousPage(): void {
    if (this.offset > 0) {
      this.offset = Math.max(0, this.offset - this.limit);
      this.#load();
    }
  }

  nextPage(): void {
    if (this.orders().length === this.limit) {
      this.offset += this.limit;
      this.#load();
    }
  }

  toggleDetail(orderId: string): void {
    if (this.expanded.has(orderId)) {
      this.expanded.delete(orderId);
    } else {
      this.expanded.add(orderId);
    }
  }

  isExpanded(orderId: string): boolean {
    return this.expanded.has(orderId);
  }

  branchName(branchId: string | undefined): string {
    return branchId ? (this.branchesById.get(branchId) ?? '—') : '—';
  }

  statusLabel(status: string): string {
    return STATUS_LABELS[status as OrderStatus] ?? status;
  }

  statusBadge(status: string): string {
    return STATUS_BADGES[status as OrderStatus] ?? 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300';
  }

  orderTypeLabel(orderType: string | undefined): string {
    return orderType ? (ORDER_TYPE_LABELS[orderType] ?? orderType) : '—';
  }

  paymentMethodLabel(method: string | undefined): string {
    return method ? (PAYMENT_METHOD_LABELS[method] ?? method) : '—';
  }

  paymentStatusLabel(status: string | undefined): string {
    return status ? (PAYMENT_STATUS_LABELS[status] ?? status) : '—';
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString('es-AR');
  }

  formatMoney(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(value);
  }
}