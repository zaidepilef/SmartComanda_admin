import { parseMapsLink } from './parse-maps-link';

describe('parseMapsLink', () => {
  it('reads the map center from @lat,lng', () => {
    expect(parseMapsLink('https://www.google.com/maps/@-33.4372,-70.6506,17z')).toEqual({
      kind: 'ok',
      point: { lat: -33.4372, lng: -70.6506 },
    });
  });

  it('prefers the exact pin (!3d!4d) over the map center', () => {
    const url =
      'https://www.google.com/maps/place/Plaza+de+Armas/@-33.4380,-70.6510,17z/data=!3m1!4b1!4m6!3m5!8m2!3d-33.4378!4d-70.6504';
    expect(parseMapsLink(url)).toEqual({ kind: 'ok', point: { lat: -33.4378, lng: -70.6504 } });
  });

  it('reads ?q=lat,lng including encoded commas', () => {
    expect(parseMapsLink('https://maps.google.com/?q=-33.45%2C-70.6')).toEqual({
      kind: 'ok',
      point: { lat: -33.45, lng: -70.6 },
    });
  });

  it('reads plain "lat, lng" text', () => {
    expect(parseMapsLink(' -33.4569, -70.5978 ')).toEqual({
      kind: 'ok',
      point: { lat: -33.4569, lng: -70.5978 },
    });
  });

  it('flags short links instead of resolving them', () => {
    expect(parseMapsLink('https://maps.app.goo.gl/AbCdEf123')).toEqual({ kind: 'short-link' });
  });

  it('rejects text without coordinates or out of range', () => {
    expect(parseMapsLink('Av. Providencia 1234')).toEqual({ kind: 'invalid' });
    expect(parseMapsLink('95, 10')).toEqual({ kind: 'invalid' });
    expect(parseMapsLink('')).toEqual({ kind: 'invalid' });
  });
});
