// src/lib/locales/store.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// localStorage is read at module top-level in store.ts, so stub it before import.
beforeEach(() => {
  const mem: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (k in mem ? mem[k] : null),
    setItem: (k: string, v: string) => { mem[k] = v; },
    removeItem: (k: string) => { delete mem[k]; },
    clear: () => { for (const k of Object.keys(mem)) delete mem[k]; },
  });
});

describe('dirForLocale (locale -> text direction)', () => {
  it('returns ltr for shipped LTR locales', async () => {
    const { dirForLocale } = await import('./store');
    expect(dirForLocale('en')).toBe('ltr');
    expect(dirForLocale('ru')).toBe('ltr');
    expect(dirForLocale('ja')).toBe('ltr');
    expect(dirForLocale('fr')).toBe('ltr');
  });

  it('returns rtl for known RTL languages', async () => {
    const { dirForLocale } = await import('./store');
    expect(dirForLocale('ar')).toBe('rtl');
    expect(dirForLocale('he')).toBe('rtl');
    expect(dirForLocale('fa')).toBe('rtl');
    expect(dirForLocale('ur')).toBe('rtl');
  });

  it('matches RTL by primary subtag, ignoring region', async () => {
    const { dirForLocale } = await import('./store');
    expect(dirForLocale('ar-EG')).toBe('rtl');
    expect(dirForLocale('en-US')).toBe('ltr');
  });

  it('falls back to ltr for unknown locales', async () => {
    const { dirForLocale } = await import('./store');
    expect(dirForLocale('xx')).toBe('ltr');
    expect(dirForLocale('')).toBe('ltr');
  });

  it('dir store reflects the active locale', async () => {
    const { get } = await import('svelte/store');
    const { dir, setLocale } = await import('./store');
    // Only shipped locales are accepted by setLocale; ru is LTR.
    setLocale('ru');
    expect(get(dir)).toBe('ltr');
  });
});
