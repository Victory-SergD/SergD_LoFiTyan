import type { Translations } from './types';

export const ja: Translations = {
    settings: {
        title: '設定',
        background: {
            title: '背景',
            add_custom: 'カスタム画像を追加',
            delete_tooltip: 'この背景を削除',
            processing: '画像を処理中...',
        },
        volume: {
            title: '音量',
            rain: '雨',
            thunder: '雷',
            jungle: 'ジャングル',
            campfire: '焚き火',
            main_track: 'ラジオ',
        },
        language: {
            title: '言語',
            select: '言語を選択',
        },
    },
    info: {
        title: 'LoFiTyan',
        tagline: '居心地の良いウィンドウで、雰囲気たっぷりの本格lo-fiラジオ。',
        buttons: {
            show_next_time: '次回起動時に表示する',
            shown_next_time: '次回起動時に表示されます',
        },
        shortcuts: {
            title: 'ショートカット',
            general: {
                title: '一般',
                esc: 'このウィンドウを隠す',
                j: '設定を開く/閉じる',
                immersive: '広々モードを切り替え',
                next_bg: '次の背景画像',
                prev_bg: '前の背景画像',
                restart: '再起動',
            },
            radio: {
                title: 'ラジオ',
                play_pause: 'ラジオの再生/一時停止',
                stop_all: 'すべてを停止',
            },
            effects: {
                title: '効果',
                rain: '雨を切り替え',
                thunder: '雷を切り替え',
                nature: '自然音を切り替え',
                campfire: '焚き火を切り替え',
            },
        },
    },
    context_menu: {
        play: '再生',
        pause: '一時停止',
        toggle_rain: '雨を切り替え',
        toggle_thunder: '雷を切り替え',
        toggle_jungle: 'ジャングルを切り替え',
        toggle_campfire: '焚き火を切り替え',
        reload: 'リロード',
        about: 'について',
    },
};
