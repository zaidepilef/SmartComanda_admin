import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';

import { LatLng, isValidPoint, parseMapsLink } from '../../utils/parse-maps-link';

/** Centro por defecto (Santiago) cuando aún no hay ubicación. */
const DEFAULT_CENTER: LatLng = { lat: -33.4489, lng: -70.6693 };
const DEFAULT_ZOOM = 12;
const POINT_ZOOM = 16;

const PIN_ICON = L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#2563eb;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);transform:rotate(-45deg)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

const round6 = (value: number): number => Math.round(value * 1e6) / 1e6;

/**
 * Selector de ubicación: coordenadas a mano, link de Google Maps o clic/arrastre en el mapa
 * (Leaflet + OpenStreetMap). Emite el punto elegido o `null` al borrarlo.
 */
@Component({
  selector: 'app-location-picker',
  imports: [FormsModule],
  template: `
    <div class="space-y-3">
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300" [for]="idPrefix() + 'MapsLink'">
          Pegar link de Google Maps o coordenadas
        </label>
        <div class="flex gap-2">
          <input
            [id]="idPrefix() + 'MapsLink'"
            type="text"
            class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            placeholder="https://www.google.com/maps/@-33.43,-70.65,17z  ó  -33.43, -70.65"
            [(ngModel)]="linkText"
            [name]="idPrefix() + 'MapsLink'"
            (keydown.enter)="$event.preventDefault(); applyLink()"
          />
          <button
            type="button"
            class="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            (click)="applyLink()"
          >
            Usar
          </button>
        </div>
        @if (linkMessage()) {
          <p class="mt-1 text-xs text-amber-700 dark:text-amber-400">{{ linkMessage() }}</p>
        }
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300" [for]="idPrefix() + 'Lat'">Latitud</label>
          <input
            [id]="idPrefix() + 'Lat'"
            type="number"
            step="0.000001"
            min="-90"
            max="90"
            class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            [ngModel]="latInput()"
            (ngModelChange)="latInput.set($event); applyInputs()"
            [name]="idPrefix() + 'Lat'"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300" [for]="idPrefix() + 'Lng'">Longitud</label>
          <input
            [id]="idPrefix() + 'Lng'"
            type="number"
            step="0.000001"
            min="-180"
            max="180"
            class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            [ngModel]="lngInput()"
            (ngModelChange)="lngInput.set($event); applyInputs()"
            [name]="idPrefix() + 'Lng'"
          />
        </div>
      </div>

      <div #mapEl class="h-72 w-full overflow-hidden rounded-lg border border-gray-300 dark:border-slate-700"></div>
      <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-slate-400">
        <span>Haz clic en el mapa o arrastra el marcador para ajustar el punto exacto.</span>
        @if (hasPoint()) {
          <span class="flex gap-3">
            <a class="text-blue-600 hover:underline dark:text-blue-400" [href]="googleMapsUrl()" target="_blank" rel="noopener">Ver en Google Maps</a>
            <button type="button" class="text-red-600 hover:underline dark:text-red-400" (click)="clear()">Quitar ubicación</button>
          </span>
        }
      </div>
    </div>
  `,
})
export class LocationPickerComponent implements AfterViewInit, OnDestroy {
  /** Prefijo para ids únicos cuando hay más de un selector en la página. */
  readonly idPrefix = input('location');
  readonly lat = input<number | null | undefined>(null);
  readonly lng = input<number | null | undefined>(null);
  readonly changed = output<LatLng | null>();

  readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('mapEl');

  readonly latInput = signal<number | null>(null);
  readonly lngInput = signal<number | null>(null);
  readonly linkMessage = signal('');
  readonly hasPoint = signal(false);

  linkText = '';

  #map: L.Map | null = null;
  #marker: L.Marker | null = null;

  constructor() {
    // Sincroniza el valor que llega del padre (p. ej. al cargar la sucursal).
    effect(() => {
      const lat = this.lat();
      const lng = this.lng();

      if (lat == null || lng == null || !isValidPoint({ lat, lng })) {
        return;
      }

      // Ignora el eco del valor que este mismo selector acaba de emitir.
      const current = untracked(() => this.#currentPoint());
      if (current && round6(current.lat) === round6(lat) && round6(current.lng) === round6(lng)) {
        return;
      }

      untracked(() => this.#showPoint({ lat, lng }, false));
    });
  }

  ngAfterViewInit(): void {
    const start = this.#currentPoint();
    this.#map = L.map(this.mapEl().nativeElement).setView(
      start ?? DEFAULT_CENTER,
      start ? POINT_ZOOM : DEFAULT_ZOOM
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.#map);

    this.#map.on('click', (event: L.LeafletMouseEvent) => this.#setPoint(event.latlng));

    if (start) {
      this.#placeMarker(start);
    }

    // El mapa se crea dentro de pestañas: recalcula su tamaño cuando ya es visible.
    setTimeout(() => this.#map?.invalidateSize(), 0);
  }

  ngOnDestroy(): void {
    this.#map?.remove();
    this.#map = null;
  }

  applyLink(): void {
    const result = parseMapsLink(this.linkText);

    if (result.kind === 'ok') {
      this.linkMessage.set('');
      this.linkText = '';
      this.#setPoint(result.point);
    } else if (result.kind === 'short-link') {
      this.linkMessage.set(
        'Los links cortos (maps.app.goo.gl) no traen las coordenadas. Ábrelo en el navegador y copia la URL completa de la barra de direcciones.'
      );
    } else {
      this.linkMessage.set('No encontramos coordenadas en ese texto. Prueba con el link completo o con "lat, lng".');
    }
  }

  applyInputs(): void {
    const lat = this.latInput();
    const lng = this.lngInput();

    if (lat == null || lng == null || `${lat}` === '' || `${lng}` === '') {
      return;
    }

    const point = { lat: Number(lat), lng: Number(lng) };

    if (isValidPoint(point)) {
      this.#placeMarker(point);
      this.#map?.setView(point, Math.max(this.#map.getZoom(), POINT_ZOOM));
      this.hasPoint.set(true);
      this.changed.emit({ lat: round6(point.lat), lng: round6(point.lng) });
    }
  }

  clear(): void {
    this.latInput.set(null);
    this.lngInput.set(null);
    this.hasPoint.set(false);
    this.#marker?.remove();
    this.#marker = null;
    this.changed.emit(null);
  }

  googleMapsUrl(): string {
    return `https://www.google.com/maps?q=${this.latInput()},${this.lngInput()}`;
  }

  #currentPoint(): LatLng | null {
    const lat = this.latInput();
    const lng = this.lngInput();
    return lat != null && lng != null ? { lat, lng } : null;
  }

  #setPoint(point: LatLng): void {
    this.#showPoint(point, true);
    this.changed.emit({ lat: round6(point.lat), lng: round6(point.lng) });
  }

  #showPoint(point: LatLng, recenter: boolean): void {
    this.latInput.set(round6(point.lat));
    this.lngInput.set(round6(point.lng));
    this.hasPoint.set(true);

    if (this.#map) {
      this.#placeMarker(point);

      if (recenter) {
        this.#map.setView(point, Math.max(this.#map.getZoom(), POINT_ZOOM));
      } else {
        this.#map.setView(point, POINT_ZOOM);
      }
    }
  }

  #placeMarker(point: LatLng): void {
    if (!this.#map) {
      return;
    }

    if (this.#marker) {
      this.#marker.setLatLng(point);
      return;
    }

    this.#marker = L.marker(point, { draggable: true, icon: PIN_ICON }).addTo(this.#map);
    this.#marker.on('dragend', () => {
      const position = this.#marker?.getLatLng();

      if (position) {
        this.#setPoint(position);
      }
    });
  }
}
