/** Campos de entrega de un pedido a domicilio (ver change delivery-location-estimate). */
export interface DeliveryFields {
  deliveryAddress?: string | null;
  deliveryReference?: string | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  deliveryAccuracyM?: number | null;
  deliveryDistanceKm?: number | null;
  deliveryEtaMinutes?: number | null;
  deliveryOutOfRange?: boolean | null;
}

/** Link que abre el punto en Google Maps (o la app de mapas del teléfono). */
export function deliveryMapUrl(order: DeliveryFields): string | null {
  if (order.deliveryLat == null || order.deliveryLng == null) {
    return null;
  }

  return `https://www.google.com/maps?q=${order.deliveryLat},${order.deliveryLng}`;
}

/** "7,4 km · ~18 min", o null si el pedido no tiene estimación. */
export function deliveryEstimateLabel(order: DeliveryFields): string | null {
  if (order.deliveryDistanceKm == null || order.deliveryEtaMinutes == null) {
    return null;
  }

  const km = order.deliveryDistanceKm.toLocaleString('es-CL', { maximumFractionDigits: 1 });
  return `${km} km · ~${order.deliveryEtaMinutes} min`;
}
