export interface LatLng {
  lat: number;
  lng: number;
}

export type MapsLinkResult =
  | { kind: 'ok'; point: LatLng }
  | { kind: 'short-link' }
  | { kind: 'invalid' };

const NUMBER = '(-?\\d{1,3}(?:\\.\\d+)?)';

/** Patrones en orden de precisión: el pin exacto (!3d!4d) antes que el centro del mapa (@). */
const PATTERNS: RegExp[] = [
  new RegExp(`!3d${NUMBER}!4d${NUMBER}`),
  new RegExp(`[?&](?:q|query|ll|destination)=${NUMBER}(?:,|%2C)\\s*${NUMBER}`, 'i'),
  new RegExp(`@${NUMBER},${NUMBER}`),
  new RegExp(`^\\s*${NUMBER}\\s*,\\s*${NUMBER}\\s*$`),
];

const SHORT_LINK = /^(https?:\/\/)?(maps\.app\.goo\.gl|goo\.gl\/maps)\//i;

export function isValidPoint(point: LatLng): boolean {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lng) <= 180
  );
}

/**
 * Lee coordenadas desde un link de Google Maps o un texto "lat, lng".
 * Los links cortos (maps.app.goo.gl) no se resuelven: habría que seguir una URL externa.
 */
export function parseMapsLink(input: string): MapsLinkResult {
  const text = (input ?? '').trim();

  if (text === '') {
    return { kind: 'invalid' };
  }

  if (SHORT_LINK.test(text)) {
    return { kind: 'short-link' };
  }

  let decoded = text;
  try {
    decoded = decodeURIComponent(text);
  } catch {
    // Texto con % sueltos: se usa tal cual.
  }

  for (const pattern of PATTERNS) {
    const match = decoded.match(pattern);

    if (match) {
      const point = { lat: Number(match[1]), lng: Number(match[2]) };

      if (isValidPoint(point)) {
        return { kind: 'ok', point };
      }
    }
  }

  return { kind: 'invalid' };
}
