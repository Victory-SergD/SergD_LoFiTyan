import type { Translations } from './types';

export const zh: Translations = {
    settings: {
        title: '设置',
        background: {
            title: '背景',
            add_custom: '添加自定义图片',
            add_video: '添加视频背景',
            delete_tooltip: '删除此背景',
            processing: '正在处理图片...',
            focal_hint: '点击要在裁剪时保持居中的位置',
            zoom_hint: '缩放背景 — 始终铺满全屏不留空白',
        },
        volume: {
            title: '音量',
            rain: '雨声',
            thunder: '雷声',
            jungle: '丛林',
            campfire: '篝火',
            main_track: '电台',
        },
        language: {
            title: '语言',
            select: '选择语言',
        },
    },
    info: {
        title: 'LoFiTyan',
        tagline: '在温馨的窗口中，感受真实的 lo-fi 电台与氛围。',
        buttons: {
            show_next_time: '下次启动时显示',
            shown_next_time: '将在下次启动时显示',
        },
        shortcuts: {
            title: '快捷键',
            general: {
                title: '常规',
                esc: '关闭面板 / 退出全屏',
                j: '打开/关闭设置',
                immersive: '切换宽敞模式',
                next_bg: '下一张背景图片',
                prev_bg: '上一张背景图片',
                restart: '重新开始',
            },
            radio: {
                title: '电台',
                play_pause: '播放/暂停电台',
                stop_all: '停止一切',
            },
            effects: {
                title: '效果',
                rain: '切换雨声',
                thunder: '切换雷声',
                nature: '切换自然声音',
                campfire: '切换篝火',
            },
        },
    },
    picker: {
        title: '电台列表',
        more: '更多',
        favorites: '收藏',
        empty_favorites: '暂无收藏 — 点击 ☆ 添加',
        empty_results: '未找到电台',
        loading: '加载中…',
        retry: '点击重试',
    },
    context_menu: {
        play: '播放',
        pause: '暂停',
        toggle_rain: '切换雨声',
        toggle_thunder: '切换雷声',
        toggle_jungle: '切换丛林',
        toggle_campfire: '切换篝火',
        reload: '重新加载',
        about: '关于',
    },
    canvas: {
        video_unavailable: '视频不可用 — 请尝试其他文件',
    },
};
