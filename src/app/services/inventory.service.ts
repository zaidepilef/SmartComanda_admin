import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Ingredient } from './ingredients.service';

export interface StockItem {
  _id: string;
  tenantId: string;
  ingredientId: string;
  branchId: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  batchCount: number;
  ingredient: Ingredient | null;
}

export interface StockAdjustmentPayload {
  tenantId: string;
  ingredientId: string;
  branchId: string;
  type: 'entry' | 'exit';
  quantity: number;
  reason: string;
  unitCost?: number;
}

export interface MovementBatchEntry {
  batchId: string;
  quantity: number;
  unitCost: number;
}

export interface Movement {
  _id: string;
  tenantId: string;
  ingredientId: string;
  branchId?: string;
  quantity: number;
  type: 'entry' | 'exit' | 'sale';
  unitCost?: number;
  batchId?: string;
  batches?: MovementBatchEntry[];
  orderId?: string;
  reason: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  readonly #http = inject(HttpClient);

  listStock(tenantId?: string, branchId?: string): Observable<StockItem[]> {
    let params = new HttpParams();

    if (tenantId) {
      params = params.set('tenantId', tenantId);
    }

    if (branchId) {
      params = params.set('branchId', branchId);
    }

    return this.#http.get<StockItem[]>(`${environment.apiUrl}/api/inventory/stock`, { params });
  }

  adjustStock(payload: StockAdjustmentPayload): Observable<unknown> {
    return this.#http.post<unknown>(
      `${environment.apiUrl}/api/inventory/stock/adjustments`,
      payload
    );
  }

  listMovements(tenantId?: string, ingredientId?: string): Observable<Movement[]> {
    let params = new HttpParams();

    if (tenantId) {
      params = params.set('tenantId', tenantId);
    }

    if (ingredientId) {
      params = params.set('ingredientId', ingredientId);
    }

    return this.#http.get<Movement[]>(`${environment.apiUrl}/api/inventory/movements`, { params });
  }
}