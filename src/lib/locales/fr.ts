import type { Translations } from './types';

export const fr: Translations = {
    settings: {
        title: 'Paramètres',
        background: {
            title: 'Arrière-plan',
            add_custom: 'Ajouter des images personnalisées',
            add_video: 'Ajouter une vidéo en arrière-plan',
            delete_tooltip: 'Supprimer cet arrière-plan',
            processing: 'Traitement des images...',
            focal_hint: 'Cliquez sur le point à garder centré lors du recadrage à votre écran',
            zoom_hint: "Zoom sur l'arrière-plan — il reste toujours bord à bord",
            skipped: 'Ignorés (pas une image ou trop volumineux) :',
        },
        volume: {
            title: 'Volume',
            rain: 'Pluie',
            thunder: 'Tonnerre',
            jungle: 'Jungle',
            campfire: 'Feu de camp',
            main_track: 'Radio',
        },
        language: {
            title: 'Langue',
            select: 'Sélectionner la langue',
        },
    },
    info: {
        title: 'LoFiTyan',
        tagline: 'De vraie radio lo-fi avec atmosphère, dans une fenêtre cosy.',
        buttons: {
            show_next_time: 'Afficher au prochain démarrage',
            shown_next_time: "S'affichera au prochain démarrage",
        },
        shortcuts: {
            title: 'Raccourcis',
            general: {
                title: 'Général',
                esc: 'Fermer le panneau / quitter le plein écran',
                j: 'Ouvrir/fermer les paramètres',
                immersive: 'Basculer le mode spacieux',
                next_bg: "Image d'arrière-plan suivante",
                prev_bg: "Image d'arrière-plan précédente",
                restart: 'Redémarrer',
            },
            radio: {
                title: 'Radio',
                play_pause: 'Lire/Pause radio',
                stop_all: 'Tout arrêter',
            },
            effects: {
                title: 'Effets',
                rain: 'Basculer la pluie',
                thunder: "Basculer l'orage",
                nature: 'Basculer les sons de la nature',
                campfire: 'Basculer le feu de camp',
            },
        },
    },
    picker: {
        title: 'Stations',
        more: 'Plus',
        favorites: 'Favoris',
        empty_favorites: 'Aucun favori — appuie sur ☆ pour en ajouter',
        empty_results: 'Aucune station trouvée',
        loading: 'Chargement…',
        retry: 'Appuie pour réessayer',
    },
    context_menu: {
        play: 'Lire',
        pause: 'Pause',
        toggle_rain: 'Basculer la pluie',
        toggle_thunder: 'Basculer le tonnerre',
        toggle_jungle: 'Basculer la jungle',
        toggle_campfire: 'Basculer le feu de camp',
        reload: 'Recharger',
        about: 'À propos',
    },
    canvas: {
        video_unavailable: 'Vidéo indisponible — essaie un autre fichier',
    },
    radio: {
        stream_error: 'Impossible de lire cette station',
    },
};
