import { isLoopbackUrl } from './native-local-url.util';

// [[[II ESC:027-12 DOC:docs/documents/2026-07-01-027-autenticacion-segura-dispositivo-movil.md#escenario-12
describe('isLoopbackUrl', () => {
  it('reconoce localhost, IPv4 e IPv6 loopback', () => {
    expect(isLoopbackUrl('http://localhost:8000/v1')).toBeTrue();
    expect(isLoopbackUrl('http://127.0.0.1:8000/v1')).toBeTrue();
    expect(isLoopbackUrl('http://[::1]:8000/v1')).toBeTrue();
  });

  it('no clasifica una API remota como servidor local', () => {
    expect(isLoopbackUrl('https://api.jukai.io/v1')).toBeFalse();
  });
});
// ]]]FI
