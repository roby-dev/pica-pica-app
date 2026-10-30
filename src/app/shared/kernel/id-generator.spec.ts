import { uuidGenerator } from './id-generator';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('uuidGenerator', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('makes unique v4 ids', () => {
    const ids = new Set(Array.from({ length: 50 }, () => uuidGenerator.next()));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(UUID_V4);
  });

  it('still works where crypto.randomUUID is missing, as on http:// pages that are not localhost', () => {
    const real = globalThis.crypto;
    // Insecure contexts keep getRandomValues but drop randomUUID.
    vi.stubGlobal('crypto', { getRandomValues: real.getRandomValues.bind(real) });

    const ids = new Set(Array.from({ length: 50 }, () => uuidGenerator.next()));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(UUID_V4);
  });
});
