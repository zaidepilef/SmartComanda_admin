import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export type IngredientDimension = 'count' | 'mass' | 'volume';

export interface Ingredient {
  _id: string;
  tenantId: string;
  name: string;
  unit: string;
  dimension: IngredientDimension;
  unitCost: number;
  notes?: string;
}

export interface IngredientPayload {
  tenantId: string;
  name: string;
  unit: string;
  dimension: IngredientDimension;
  unitCost: number;
  notes?: string;
}

export interface IngredientUpdatePayload {
  name?: string;
  unit?: string;
  dimension?: IngredientDimension;
  unitCost?: number;
  notes?: string;
}

export const DIMENSION_LABELS: Record<IngredientDimension, string> = {
  count: 'Por unidad',
  mass: 'Peso',
  volume: 'Volumen',
};

@Injectable({ providedIn: 'root' })
export class IngredientService {
  readonly #http = inject(HttpClient);

  list(tenantId?: string, q?: string): Observable<Ingredient[]> {
    let params = new HttpParams();

    if (tenantId) {
      params = params.set('tenantId', tenantId);
    }

    if (q && q.trim() !== '') {
      params = params.set('q', q.trim());
    }

    return this.#http.get<Ingredient[]>(`${environment.apiUrl}/api/ingredients`, { params });
  }

  create(payload: IngredientPayload): Observable<Ingredient> {
    return this.#http.post<Ingredient>(`${environment.apiUrl}/api/ingredients`, payload);
  }

  update(id: string, payload: IngredientUpdatePayload): Observable<Ingredient> {
    return this.#http.put<Ingredient>(`${environment.apiUrl}/api/ingredients/${id}`, payload);
  }
}
