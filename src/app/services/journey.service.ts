import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

// Recorrido de clientes del flujo QR (spec customer-journey-viewer).

export type JourneyStage =
  | 'qr_opened'
  | 'identified'
  | 'with_cart'
  | 'order_submitted'
  | 'order_failed'
  | 'order_created';

export type JourneyEventType =
  | 'qr_opened'
  | 'menu_loaded'
  | 'menu_failed'
  | 'identity_submitted'
  | 'item_added'
  | 'item_removed'
  | 'cart_opened'
  | 'order_submitted'
  | 'order_created'
  | 'order_failed'
  | 'mode_selected'
  | 'customer_looked_up'
  | 'address_confirmed'
  | 'address_out_of_range'
  | 'summary_opened';

export interface JourneyFailure {
  status: number;
  reason?: string;
}

export interface JourneySession {
  sessionId: string;
  startedAt: string;
  lastActivityAt: string;
  eventCount: number;
  identified: boolean;
  cartQuantity: number;
  stage: JourneyStage;
  abandoned: boolean;
  lastFailure: JourneyFailure | null;
  customerName: string | null;
  customerPhone: string | null;
  orderId: string | null;
  orderNumber: number | null;
  orderTotal: number | null;
}

export interface JourneyEvent {
  id: string;
  sessionId: string;
  type: JourneyEventType;
  source: 'client' | 'server';
  customerId: string | null;
  orderId: string | null;
  data: Record<string, unknown>;
  occurredAt: string;
}

export interface JourneyTimeline {
  sessionId: string;
  events: JourneyEvent[];
}

export interface JourneyFunnel {
  from: string;
  to: string;
  sessions: number;
  qrOpened: number;
  identified: number;
  withCart: number;
  orderSubmitted: number;
  orderCreated: number;
  failedAttempts: number;
}

export interface JourneyRange {
  from: Date;
  to: Date;
}

@Injectable({ providedIn: 'root' })
export class JourneyService {
  readonly #http = inject(HttpClient);
  readonly #baseUrl = `${environment.apiUrl}/api/branches`;

  #rangeParams({ from, to }: JourneyRange): HttpParams {
    return new HttpParams().set('from', from.toISOString()).set('to', to.toISOString());
  }

  listSessions(branchId: string, range: JourneyRange): Observable<JourneySession[]> {
    return this.#http.get<JourneySession[]>(
      `${this.#baseUrl}/${encodeURIComponent(branchId)}/journey/sessions`,
      { params: this.#rangeParams(range) }
    );
  }

  getTimeline(branchId: string, sessionId: string): Observable<JourneyTimeline> {
    return this.#http.get<JourneyTimeline>(
      `${this.#baseUrl}/${encodeURIComponent(branchId)}/journey/sessions/${encodeURIComponent(sessionId)}`
    );
  }

  getFunnel(branchId: string, range: JourneyRange): Observable<JourneyFunnel> {
    return this.#http.get<JourneyFunnel>(
      `${this.#baseUrl}/${encodeURIComponent(branchId)}/journey/funnel`,
      { params: this.#rangeParams(range) }
    );
  }
}
