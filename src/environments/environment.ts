// En desarrollo, los QR usan el mismo host con el que se abrió el admin:
// localhost en el Mac, o la IP de la red (p. ej. 192.168.1.191) para
// escanearlos con un teléfono conectado al mismo Wi-Fi.
const devHost =
  typeof window !== 'undefined' ? window.location.hostname : 'localhost';

export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  turnstileSiteKey: '1x00000000000000000000AA',
  publicUrl: `http://${devHost}:4202`,
};
