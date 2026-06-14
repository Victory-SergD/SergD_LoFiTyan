import { writable, derived } from 'svelte/store';
import type { Translations } from './types';
import { en } from './en';
import { ja } from './ja';
import { zh } from './zh';
import { hi } from './hi';
import { fr } from './fr';
import { nl } from './nl';
import { ru } from './ru';

const locales: Record<string, Translations> = {
    en,
    ja,
    zh,
    hi,
    fr,
    nl,
    ru,
};

const initialLocale = localStorage.getItem('locale') || 'en';

export const locale = writable<string>(initialLocale);

export const t = derived(locale, ($locale) => {
    return locales[$locale] || locales['en'];
});

const RTL_LANGS = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi']);

export const dirForLocale = (lang: string): 'ltr' | 'rtl' => {
    const primary = (lang || '').toLowerCase().split('-')[0];
    return RTL_LANGS.has(primary) ? 'rtl' : 'ltr';
};

export const dir = derived(locale, ($locale) => dirForLocale($locale));

export const setLocale = (lang: string) => {
    if (locales[lang]) {
        locale.set(lang);
        localStorage.setItem('locale', lang);
        // Update document direction immediately for better UX
        document.documentElement.dir = dirForLocale(lang);
        document.documentElement.lang = lang;
    }
};
