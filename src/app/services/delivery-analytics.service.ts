import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { DeliveryFields } from '../utils/delivery';

export interface DeliveryAnalyticsBranch {
  _id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  deliveryMaxKm: number | null;
  deliveryMaxMinutes: number | null;
  deliveryAvgSpeedKmh: number;
}

export interface DeliveryAnalyticsSummary {
  totalOrders: number;
  withEstimate: number;
  avgDistanceKm: number | null;
  avgEtaMinutes: number | null;
  outOfRangeCount: number;
  outOfRangePct: number | null;
  buckets: { key: string; count: number }[];
}

export interface DeliveryAnalyticsOrder extends DeliveryFields {
  _id: string;
  number: number;
  createdAt: string;
  status: string;
  paymentStatus: string;
  clientName: string | null;
  total: number;
}

export interface DeliveryAnalytics {
  branch: DeliveryAnalyticsBranch | null;
  summary: DeliveryAnalyticsSummary;
  orders: DeliveryAnalyticsOrder[];
}

@Injectable({ providedIn: 'root' })
export class DeliveryAnalyticsService {
  readonly #http = inject(HttpClient);

  get(query: { branchId: string; from: Date; to: Date }): Observable<DeliveryAnalytics> {
    const params = new HttpParams()
      .set('branchId', query.branchId)
      .set('from', query.from.toISOString())
      .set('to', query.to.toISOString());

    return this.#http.get<DeliveryAnalytics>(`${environment.apiUrl}/api/orders/delivery-analytics`, { params });
  }
}
