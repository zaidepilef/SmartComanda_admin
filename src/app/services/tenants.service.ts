import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface Tenant {
  _id: string;
  name: string;
  rut?: string;
  razonSocial?: string;
  active: boolean;
  userCount: number;
  branchCount: number;
  loyalty?: {
    pointsPerAmount: number;
    currency?: string;
  };
}

export interface TenantCreatePayload {
  name: string;
  rut?: string;
  razonSocial?: string;
  active: boolean;
}

export interface TenantUpdatePayload {
  name?: string;
  rut?: string;
  razonSocial?: string;
  active?: boolean;
  loyalty?: { pointsPerAmount: number; currency?: string } | null;
}

@Injectable({ providedIn: 'root' })
export class TenantService {
  readonly #http = inject(HttpClient);

  list(activeOnly = true): Observable<Tenant[]> {
    const httpParams = new HttpParams().set('active', String(activeOnly));

    return this.#http.get<Tenant[]>(`${environment.apiUrl}/api/tenants`, {
      params: httpParams,
    });
  }

  listAll(): Observable<Tenant[]> {
    return this.#http.get<Tenant[]>(`${environment.apiUrl}/api/tenants`);
  }

  create(payload: TenantCreatePayload): Observable<Tenant> {
    return this.#http.post<Tenant>(`${environment.apiUrl}/api/tenants`, payload);
  }

  update(id: string, payload: TenantUpdatePayload): Observable<Tenant> {
    return this.#http.put<Tenant>(`${environment.apiUrl}/api/tenants/${id}`, payload);
  }
}