import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type UserStatus = 'active' | 'inactive' | 'pending';

export type UserRole = 'sysadmin' | 'owner' | 'admin' | 'cashier';

export const CREATABLE_ROLES: UserRole[] = ['sysadmin', 'owner', 'admin', 'cashier'];

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: UserStatus;
  name?: string;
  role?: UserRole;
  tenantId?: string;
  branchId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserListResponse {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserCreatePayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  status?: UserStatus;
  name?: string;
  role?: UserRole;
  tenantId?: string;
  branchId?: string;
}

export interface UserUpdatePayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: UserStatus;
  password?: string;
  name?: string;
  role?: UserRole;
  tenantId?: string;
  branchId?: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  readonly #http = inject(HttpClient);

  list(params: { page?: number; limit?: number; status?: string }): Observable<UserListResponse> {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 1))
      .set('limit', String(params.limit ?? 10));

    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.#http.get<UserListResponse>(`${environment.apiUrl}/api/users`, {
      params: httpParams,
    });
  }

  create(payload: UserCreatePayload): Observable<User> {
    return this.#http.post<User>(`${environment.apiUrl}/api/users`, payload);
  }

  update(id: string, payload: UserUpdatePayload): Observable<User> {
    return this.#http.put<User>(`${environment.apiUrl}/api/users/${id}`, payload);
  }
}