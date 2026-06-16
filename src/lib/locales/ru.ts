import type { Translations } from './types';

export const ru: Translations = {
    settings: {
        title: 'Настройки',
        background: {
            title: 'Фон',
            add_custom: 'Добавить свои изображения',
            add_video: 'Добавить видео-фон',
            delete_tooltip: 'Удалить этот фон',
            processing: 'Обработка изображений...',
            focal_hint: 'Кликни, где держать центр кадра при обрезке под экран',
            zoom_hint: 'Масштаб фона — без пустых полей по краям',
        },
        volume: {
            title: 'Громкость',
            rain: 'Дождь',
            thunder: 'Гроза',
            jungle: 'Джунгли',
            campfire: 'Костёр',
            main_track: 'Радио',
        },
        language: {
            title: 'Язык',
            select: 'Выбрать язык',
        },
    },
    info: {
        title: 'LoFiTyan',
        tagline: 'Настоящее lo-fi радио с атмосферой, в уютном окне.',
        buttons: {
            show_next_time: 'Показывать при запуске',
            shown_next_time: 'Будет показано при запуске',
        },
        shortcuts: {
            title: 'Горячие клавиши',
            general: {
                title: 'Общие',
                esc: 'Закрыть панель / выйти из полноэкранного',
                j: 'Открыть / закрыть настройки',
                immersive: 'Просторный режим',
                next_bg: 'Следующее фоновое изображение',
                prev_bg: 'Предыдущее фоновое изображение',
                restart: 'Перезапуск',
            },
            radio: {
                title: 'Радио',
                play_pause: 'Воспроизведение / пауза радио',
                stop_all: 'Остановить всё',
            },
            effects: {
                title: 'Эффекты',
                rain: 'Вкл/выкл дождь',
                thunder: 'Вкл/выкл грозу',
                nature: 'Вкл/выкл звуки природы',
                campfire: 'Вкл/выкл костёр',
            },
        },
    },
    picker: {
        title: 'Станции',
        more: 'Ещё',
        favorites: 'Избранное',
        empty_favorites: 'Пока пусто — нажми ☆, чтобы добавить',
        empty_results: 'Станции не найдены',
        loading: 'Загрузка…',
        retry: 'Нажми, чтобы повторить',
    },
    context_menu: {
        play: 'Воспроизвести',
        pause: 'Пауза',
        toggle_rain: 'Вкл / выкл дождь',
        toggle_thunder: 'Вкл / выкл грозу',
        toggle_jungle: 'Вкл / выкл джунгли',
        toggle_campfire: 'Вкл / выкл костёр',
        reload: 'Перезагрузить',
        about: 'О программе',
    },
    canvas: {
        video_unavailable: 'Видео недоступно — выбери другой файл',
    },
};
