import type { Translations } from './types';

export const hi: Translations = {
    settings: {
        title: 'सेटिंग्स',
        background: {
            title: 'पृष्ठभूमि',
            add_custom: 'कस्टम चित्र जोड़ें',
            add_video: 'वीडियो पृष्ठभूमि जोड़ें',
            delete_tooltip: 'इस पृष्ठभूमि को हटाएं',
            processing: 'छवियों को प्रोसेस किया जा रहा है...',
            focal_hint: 'वह स्थान क्लिक करें जहाँ स्क्रीन के अनुसार क्रॉप होने पर केंद्र रहे',
            zoom_hint: 'पृष्ठभूमि ज़ूम करें — किनारों पर कोई खाली जगह नहीं रहेगी',
        },
        volume: {
            title: 'वॉल्यूम',
            rain: 'बारिश',
            thunder: 'तूफान',
            jungle: 'जंगल',
            campfire: 'कैम्प फायर',
            main_track: 'रेडियो',
        },
        language: {
            title: 'भाषा',
            select: 'भाषा चुनें',
        },
    },
    info: {
        title: 'LoFiTyan',
        tagline: 'एक आरामदायक विंडो में, माहौल के साथ असली lo-fi रेडियो।',
        buttons: {
            show_next_time: 'अगली बार शुरू होने पर दिखाएं',
            shown_next_time: 'अगली बार शुरू होने पर दिखाया जाएगा',
        },
        shortcuts: {
            title: 'शॉर्टकट',
            general: {
                title: 'सामान्य',
                esc: 'पैनल बंद करें / फ़ुलस्क्रीन से बाहर निकलें',
                j: 'सेटिंग्स खोलें/बंद करें',
                immersive: 'विशाल मोड टॉगल करें',
                next_bg: 'अगली पृष्ठभूमि छवि',
                prev_bg: 'पिछली पृष्ठभूमि छवि',
                restart: 'पुनः आरंभ करें',
            },
            radio: {
                title: 'रेडियो',
                play_pause: 'रेडियो चलाएं/रोकें',
                stop_all: 'सब कुछ रोकें',
            },
            effects: {
                title: 'प्रभाव',
                rain: 'बारिश टॉगल करें',
                thunder: 'तूफान टॉगल करें',
                nature: 'प्रकृति की आवाज़ टॉगल करें',
                campfire: 'कैम्प फायर टॉगल करें',
            },
        },
    },
    picker: {
        title: 'स्टेशन',
        more: 'और',
        favorites: 'पसंदीदा',
        empty_favorites: 'अभी कोई पसंदीदा नहीं — ☆ दबाएं',
        empty_results: 'कोई स्टेशन नहीं मिला',
        loading: 'लोड हो रहा है…',
        retry: 'दोबारा प्रयास करें',
    },
    context_menu: {
        play: 'चलाएं',
        pause: 'रोकें',
        toggle_rain: 'बारिश टॉगल करें',
        toggle_thunder: 'तूफान टॉगल करें',
        toggle_jungle: 'जंगल टॉगल करें',
        toggle_campfire: 'कैम्प फायर टॉगल करें',
        reload: 'रीलोड',
        about: 'के बारे में',
    },
    canvas: {
        video_unavailable: 'वीडियो उपलब्ध नहीं — दूसरी फ़ाइल चुनें',
    },
    radio: {
        stream_error: 'यह स्टेशन नहीं चला सका',
    },
};
