import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export type BranchType = 'Sucursal' | 'FoodTruck';

export type PaymentMethod = 'cash' | 'debit' | 'credit' | 'transfer';

export interface Branch {
  _id: string;
  tenantId: string;
  name: string;
  type: BranchType;
  address?: string;
  city?: string;
  phone?: string;
  active: boolean;
  paymentMethods?: PaymentMethod[];
}

export interface BranchCreatePayload {
  tenantId: string;
  name: string;
  type: BranchType;
  address?: string;
  city?: string;
  phone?: string;
  active: boolean;
  paymentMethods?: PaymentMethod[];
}

export interface BranchUpdatePayload {
  tenantId?: string;
  name?: string;
  type?: BranchType;
  address?: string;
  city?: string;
  phone?: string;
  active?: boolean;
  paymentMethods?: PaymentMethod[];
}

@Injectable({ providedIn: 'root' })
export class BranchService {
  readonly #http = inject(HttpClient);

  list(tenantId?: string, q?: string, active?: 'true' | 'false'): Observable<Branch[]> {
    let params = new HttpParams();

    if (tenantId) {
      params = params.set('tenantId', tenantId);
    }

    if (q && q.trim() !== '') {
      params = params.set('q', q.trim());
    }

    if (active) {
      params = params.set('active', active);
    }

    return this.#http.get<Branch[]>(`${environment.apiUrl}/api/branches`, {
      params,
    });
  }

  getById(id: string): Observable<Branch> {
    return this.#http.get<Branch>(`${environment.apiUrl}/api/branches/${id}`);
  }

  create(payload: BranchCreatePayload): Observable<Branch> {
    return this.#http.post<Branch>(`${environment.apiUrl}/api/branches`, payload);
  }

  update(id: string, payload: BranchUpdatePayload): Observable<Branch> {
    return this.#http.put<Branch>(`${environment.apiUrl}/api/branches/${id}`, payload);
  }
}
