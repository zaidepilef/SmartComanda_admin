import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { DeliveryFields } from '../utils/delivery';

export interface OrderItemInput {
  dishId: string;
  quantity: number;
  stockApplied: boolean;
}

export interface OrderItem {
  dishId: string;
  name: string;
  price: number;
  quantity: number;
  stockApplied: boolean;
  note?: string;
}

export type OrderStatus =
  | 'new'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'rejected'
  | 'cancelled';
export type OrderType = 'takeaway' | 'dinein' | 'delivery' | 'qr';
export type PaymentMethod = 'cash' | 'debit' | 'credit' | 'transfer';
export type PaymentStatus = 'pending' | 'paid' | 'declined' | 'voided' | 'refunded';

/** Medio que el cliente dijo que usaría en la app (`card` = débito o crédito). */
export type ExpectedPaymentMethod = 'cash' | 'debit' | 'credit' | 'card';

export interface PaymentHistoryEntry {
  status: PaymentStatus;
  method?: string | null;
  at: string;
  by?: string | null;
  note?: string | null;
}

export interface Order extends DeliveryFields {
  _id: string;
  tenantId: string;
  foodtruckId: string;
  status: string;
  number?: number;
  orderType?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  /** Nombre de quien cobró el pedido (null si no está cobrado o es anterior al registro). */
  paidByName?: string | null;
  paidAt?: string | null;
  clientContact?: string;
  clientName?: string | null;
  clientPhone?: string | null;
  items: OrderItem[];
  total: number;
  createdAt: string;
  statusHistory?: Array<{ status: string; at: string; by?: string }>;
  /** Flujo de compra de la app (change customer-purchase-flow). */
  expectedPaymentMethod?: ExpectedPaymentMethod | null;
  cashTendered?: number | null;
  driverName?: string | null;
  rejectionReason?: string | null;
  rejectedAt?: string | null;
  cancelReason?: string | null;
  paymentHistory?: PaymentHistoryEntry[];
}

export interface OrderListQuery {
  tenantId?: string;
  branchId?: string;
  status?: string;
  orderType?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  from?: string;
  to?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface MissingIngredient {
  ingredientId: string;
  ingredientName: string;
  available: number;
  needed: number;
}

export interface OrderWarning {
  itemIndex: number;
  dishId: string;
  dishName: string;
  missing: MissingIngredient[];
}

export interface CreateOrderResult {
  order: Order;
  warnings: OrderWarning[];
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  readonly #http = inject(HttpClient);

  create(payload: {
    foodtruckId: string;
    clientContact?: string;
    items: OrderItemInput[];
  }): Observable<CreateOrderResult> {
    return this.#http.post<CreateOrderResult>(`${environment.apiUrl}/api/orders`, payload);
  }

  list(query: OrderListQuery = {}): Observable<Order[]> {
    let params = new HttpParams();

    const set = (key: string, value?: string | number): void => {
      if (value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    };

    set('tenantId', query.tenantId);
    set('branchId', query.branchId);
    set('status', query.status);
    set('orderType', query.orderType);
    set('paymentStatus', query.paymentStatus);
    set('paymentMethod', query.paymentMethod);
    set('from', query.from);
    set('to', query.to);
    set('q', query.q);
    set('limit', query.limit);
    set('offset', query.offset);

    return this.#http.get<Order[]>(`${environment.apiUrl}/api/orders`, { params });
  }

  getById(id: string): Observable<Order> {
    return this.#http.get<Order>(`${environment.apiUrl}/api/orders/${id}`);
  }
}
