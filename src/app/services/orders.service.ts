import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

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

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
export type OrderType = 'takeaway' | 'dinein' | 'delivery' | 'qr';
export type PaymentMethod = 'cash' | 'debit' | 'credit' | 'transfer';
export type PaymentStatus = 'pending' | 'paid';

export interface Order {
  _id: string;
  tenantId: string;
  foodtruckId: string;
  status: string;
  number?: number;
  orderType?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  clientContact?: string;
  items: OrderItem[];
  total: number;
  createdAt: string;
  statusHistory?: Array<{ status: string; at: string; by?: string }>;
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
