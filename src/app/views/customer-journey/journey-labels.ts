import { JourneyEvent, JourneyEventType, JourneySession, JourneyStage } from '../../services/journey.service';

export const STAGE_LABELS: Record<JourneyStage, string> = {
  qr_opened: 'Abrió QR',
  identified: 'Identificado',
  with_cart: 'Con carrito',
  order_submitted: 'Envió pedido',
  order_failed: 'Pedido fallido',
  order_created: 'Pedido creado',
};

export const STAGE_BADGES: Record<JourneyStage, string> = {
  qr_opened: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300',
  identified: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
  with_cart: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  order_submitted: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200',
  order_failed: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
  order_created: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
};

export const EVENT_LABELS: Record<JourneyEventType, string> = {
  qr_opened: 'Abrió el QR',
  menu_loaded: 'Menú cargado',
  menu_failed: 'Falló la carga del menú',
  identity_submitted: 'Ingresó nombre y teléfono',
  item_added: 'Agregó un plato',
  item_removed: 'Quitó un plato',
  cart_opened: 'Abrió el carrito',
  order_submitted: 'Envió el pedido',
  order_created: 'Pedido creado',
  order_failed: 'Pedido fallido',
  mode_selected: 'Eligió modalidad',
  customer_looked_up: 'Ingresó su teléfono',
  address_confirmed: 'Confirmó la dirección',
  address_out_of_range: 'Dirección fuera de cobertura',
  summary_opened: 'Abrió el resumen',
};

export const FAILURE_EVENTS = new Set<JourneyEventType>(['menu_failed', 'order_failed']);

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function formatMoney(value: unknown): string {
  return typeof value === 'number' ? `$${value.toLocaleString('es-CL')}` : '';
}

export function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatRelative(value: string, now: number): string {
  const minutes = Math.floor((now - new Date(value).getTime()) / 60000);

  if (minutes < 1) {
    return 'ahora';
  }
  if (minutes < 60) {
    return `hace ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `hace ${hours} h` : `hace ${Math.floor(hours / 24)} d`;
}

export function describeFailure(failure: { status?: unknown; reason?: unknown } | null): string {
  if (!failure) {
    return '';
  }
  const status = failure.status === 0 ? 'sin conexión' : `HTTP ${failure.status}`;
  return failure.reason ? `${status} · ${failure.reason}` : status;
}

/** Texto con el detalle de un evento para la línea de tiempo. */
export function describeEvent(event: JourneyEvent, dishNames: Map<string, string>): string {
  const data = event.data ?? {};

  switch (event.type) {
    case 'menu_loaded':
      return plural(Number(data['dishCount']), 'plato disponible', 'platos disponibles');
    case 'item_added':
    case 'item_removed': {
      const name = dishNames.get(String(data['dishId'])) ?? 'Plato';
      return `${name} × ${data['quantity']}`;
    }
    case 'cart_opened':
      return `${plural(Number(data['itemCount']), 'ítem', 'ítems')} en el carrito`;
    case 'order_submitted':
      return `${plural(Number(data['itemCount']), 'ítem', 'ítems')} · ${formatMoney(data['total'])}`;
    case 'order_created':
      return `Pedido #${data['number']} · ${formatMoney(data['total'])}`;
    case 'menu_failed':
    case 'order_failed':
      return describeFailure(data);
    case 'mode_selected':
      return data['mode'] === 'delivery' ? 'Domicilio' : 'Retiro en el local';
    case 'customer_looked_up':
      return data['known'] ? 'Cliente conocido' : 'Cliente nuevo';
    case 'address_confirmed':
      return data['source'] === 'saved' ? 'Dirección guardada' : 'Dirección nueva';
    case 'address_out_of_range':
      return `A ${String(data['distanceKm']).replace('.', ',')} km del local`;
    case 'summary_opened':
      return `${plural(Number(data['itemCount']), 'ítem', 'ítems')} · ${formatMoney(data['total'])}`;
    default:
      return '';
  }
}

export function customerLabel(session: JourneySession): string {
  if (session.customerName && session.customerPhone) {
    return `${session.customerName} · ${session.customerPhone}`;
  }
  return session.customerName ?? session.customerPhone ?? 'Anónimo';
}
