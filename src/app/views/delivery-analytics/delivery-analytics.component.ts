import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import * as L from 'leaflet';

import { AuthService } from '../../auth/auth.service';
import { Branch, BranchService } from '../../services/branches.service';
import { DeliveryAnalytics, DeliveryAnalyticsService } from '../../services/delivery-analytics.service';
import { deliveryEstimateLabel, deliveryMapUrl } from '../../utils/delivery';

const DEFAULT_CENTER: L.LatLngTuple = [-33.4489, -70.6693];
const COLORS = { branch: '#2563eb', inRange: '#16a34a', outOfRange: '#dc2626', unknown: '#6b7280' };

const BUCKET_LABELS: Record<string, string> = {
  '0-2': '0 a 2 km',
  '2-5': '2 a 5 km',
  '5-10': '5 a 10 km',
  '10+': 'Más de 10 km',
};

function dateInput(date: Date): string {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function parseDateInput(value: string, endOfDay = false): Date {
  const [year, month, day] = value.split('-').map(Number);
  return endOfDay ? new Date(year, month - 1, day + 1) : new Date(year, month - 1, day);
}

const formatNumber = (value: number | null, digits = 1): string =>
  value == null ? '—' : value.toLocaleString('es-CL', { maximumFractionDigits: digits });

/**
 * Análisis de delivery: distancia y tiempo estimado de los pedidos a domicilio de una sucursal,
 * con mapa de cobertura (ver spec delivery-analytics).
 */
@Component({
  selector: 'app-delivery-analytics',
  imports: [FormsModule, RouterLink],
  templateUrl: './delivery-analytics.component.html',
})
export class DeliveryAnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly #service = inject(DeliveryAnalyticsService);
  readonly #branchService = inject(BranchService);
  readonly #authService = inject(AuthService);

  readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('mapEl');

  readonly branches = signal<Branch[]>([]);
  readonly report = signal<DeliveryAnalytics | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  readonly deliveryMapUrl = deliveryMapUrl;
  readonly deliveryEstimateLabel = deliveryEstimateLabel;
  readonly formatNumber = formatNumber;
  readonly colors = COLORS;

  branchId = '';
  fromDay = dateInput(new Date(Date.now() - 29 * 86400000));
  toDay = dateInput(new Date());

  readonly cards = computed(() => {
    const summary = this.report()?.summary;

    if (!summary) {
      return [];
    }

    return [
      { label: 'Pedidos a domicilio', value: String(summary.totalOrders), hint: `${summary.withEstimate} con estimación` },
      { label: 'Distancia promedio', value: `${formatNumber(summary.avgDistanceKm)} km`, hint: 'Por calles (aprox.)' },
      { label: 'Tiempo promedio', value: `${formatNumber(summary.avgEtaMinutes, 0)} min`, hint: 'Solo trayecto' },
      {
        label: 'Fuera de rango',
        value: summary.outOfRangePct == null ? '—' : `${formatNumber(summary.outOfRangePct)}%`,
        hint: `${summary.outOfRangeCount} pedidos`,
      },
    ];
  });

  readonly buckets = computed(() => {
    const summary = this.report()?.summary;

    if (!summary) {
      return [];
    }

    const max = Math.max(1, ...summary.buckets.map((bucket) => bucket.count));
    return summary.buckets.map((bucket) => ({
      label: BUCKET_LABELS[bucket.key] ?? bucket.key,
      count: bucket.count,
      percent: Math.round((bucket.count / max) * 100),
    }));
  });

  readonly branchHasLocation = computed(() => {
    const branch = this.report()?.branch;
    return branch?.lat != null && branch?.lng != null;
  });

  #map: L.Map | null = null;
  #layer: L.LayerGroup | null = null;

  ngOnInit(): void {
    const tenantId = this.#authService.user()?.tenantId;

    this.#branchService.list(tenantId).subscribe({
      next: (branches) => {
        this.branches.set(branches);

        if (!this.branchId && branches.length > 0) {
          this.branchId = branches[0]._id;
          this.refresh();
        }
      },
      error: () => this.error.set('No se pudieron cargar las sucursales.'),
    });
  }

  ngAfterViewInit(): void {
    this.#map = L.map(this.mapEl().nativeElement).setView(DEFAULT_CENTER, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.#map);
    this.#layer = L.layerGroup().addTo(this.#map);
    this.#drawMap();
  }

  ngOnDestroy(): void {
    this.#map?.remove();
    this.#map = null;
  }

  refresh(): void {
    if (!this.branchId || !this.fromDay || !this.toDay) {
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.#service
      .get({
        branchId: this.branchId,
        from: parseDateInput(this.fromDay),
        to: parseDateInput(this.toDay, true),
      })
      .subscribe({
        next: (report) => {
          this.report.set(report);
          this.loading.set(false);
          this.#drawMap();
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.error?.error ?? 'No se pudo cargar el análisis de delivery.');
        },
      });
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
  }

  #drawMap(): void {
    const report = this.report();

    if (!this.#map || !this.#layer || !report) {
      return;
    }

    this.#layer.clearLayers();
    const bounds: L.LatLngTuple[] = [];
    const branch = report.branch;

    if (branch?.lat != null && branch.lng != null) {
      const origin: L.LatLngTuple = [branch.lat, branch.lng];
      bounds.push(origin);

      if (branch.deliveryMaxKm) {
        // El límite es por calles (línea recta × 1,4): el radio en línea recta es menor.
        L.circle(origin, {
          radius: (branch.deliveryMaxKm / 1.4) * 1000,
          color: COLORS.branch,
          weight: 1,
          fillOpacity: 0.05,
        })
          .bindTooltip(`Límite: ${formatNumber(branch.deliveryMaxKm)} km por calles`)
          .addTo(this.#layer);
      }

      L.circleMarker(origin, { radius: 9, color: '#fff', weight: 2, fillColor: COLORS.branch, fillOpacity: 1 })
        .bindTooltip(branch.name)
        .addTo(this.#layer);
    }

    for (const order of report.orders) {
      if (order.deliveryLat == null || order.deliveryLng == null) {
        continue;
      }

      const point: L.LatLngTuple = [order.deliveryLat, order.deliveryLng];
      bounds.push(point);
      const color =
        order.deliveryOutOfRange == null
          ? COLORS.unknown
          : order.deliveryOutOfRange
            ? COLORS.outOfRange
            : COLORS.inRange;

      L.circleMarker(point, { radius: 6, color: '#fff', weight: 1, fillColor: color, fillOpacity: 0.9 })
        .bindTooltip(`#${order.number} · ${deliveryEstimateLabel(order) ?? 'sin estimación'}`)
        .addTo(this.#layer);
    }

    if (bounds.length === 1) {
      this.#map.setView(bounds[0], 14);
    } else if (bounds.length > 1) {
      this.#map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
    }

    setTimeout(() => this.#map?.invalidateSize(), 0);
  }
}
