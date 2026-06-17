import type { Translations } from './types';

export const nl: Translations = {
    settings: {
        title: 'Instellingen',
        author: 'Auteur',
        background: {
            title: 'Achtergrond',
            add_custom: 'Aangepaste afbeeldingen toevoegen',
            add_video: 'Videoachtergrond toevoegen',
            delete_tooltip: 'Deze achtergrond verwijderen',
            processing: 'Afbeeldingen verwerken...',
            focal_hint: 'Klik op het punt dat gecentreerd moet blijven bij bijsnijden naar uw scherm',
            zoom_hint: 'Zoom de achtergrond — hij vult altijd het volledige scherm',
            skipped: 'Overgeslagen (geen afbeelding of te groot):',
            sources_title: "Waar achtergronden en video's vinden",
        },
        volume: {
            title: 'Volume',
            rain: 'Regen',
            thunder: 'Onweer',
            jungle: 'Jungle',
            campfire: 'Kampvuur',
            main_track: 'Radio',
        },
        language: {
            title: 'Taal',
            select: 'Selecteer taal',
        },
    },
    info: {
        title: 'LoFiTyan',
        tagline: 'Echte lo-fi radio met sfeer, in een gezellig venster.',
        buttons: {
            show_next_time: 'Toon bij volgende start',
            shown_next_time: 'Wordt getoond bij volgende start',
        },
        shortcuts: {
            title: 'Sneltoetsen',
            general: {
                title: 'Algemeen',
                esc: 'Paneel sluiten / volledig scherm verlaten',
                j: 'Open/sluit instellingen',
                immersive: 'Interface verbergen',
                next_bg: 'Volgende achtergrondafbeelding',
                prev_bg: 'Vorige achtergrondafbeelding',
                restart: 'Herstarten',
            },
            radio: {
                title: 'Radio',
                play_pause: 'Radio afspelen/pauzeren',
                stop_all: 'Alles stoppen',
            },
            effects: {
                title: 'Effecten',
                rain: 'Regen schakelen',
                thunder: 'Onweer schakelen',
                nature: 'Natuurgeluiden schakelen',
                campfire: 'Kampvuur schakelen',
            },
        },
    },
    picker: {
        title: 'Stations',
        more: 'Meer',
        favorites: 'Favorieten',
        empty_favorites: 'Nog geen favorieten — tik op ☆ om toe te voegen',
        empty_results: 'Geen stations gevonden',
        loading: 'Laden…',
        retry: 'Tik om opnieuw te proberen',
    },
    context_menu: {
        play: 'Afspelen',
        pause: 'Pauzeren',
        toggle_rain: 'Regen schakelen',
        toggle_thunder: 'Onweer schakelen',
        toggle_jungle: 'Jungle schakelen',
        toggle_campfire: 'Kampvuur schakelen',
        reload: 'Herladen',
        about: 'Over',
    },
    canvas: {
        video_unavailable: 'Video niet beschikbaar — kies een ander bestand',
    },
    radio: {
        stream_error: 'Kon dit station niet afspelen',
    },
};
