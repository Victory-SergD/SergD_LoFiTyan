<p align="center"><img src="app-icon.png" width="110" height="110" alt="LoFiTyan" /></p>

<h1 align="center">LoFiTyan</h1>

<p align="center">
  <b>Своя LoFi-тян прямо на рабочем столе.</b><br/>
  Настоящее lo-fi радио + атмосфера для работы, учёбы и вечернего чилла — в уютном окне с персонажем.
</p>

<p align="center">
  <a href="https://github.com/Victory-SergD/SergD_LoFiTyan/releases/latest"><img src="https://img.shields.io/github/v/release/Victory-SergD/SergD_LoFiTyan?include_prereleases&sort=semver&color=8b5cf6&label=релиз" alt="Release" /></a>
  <a href="https://github.com/Victory-SergD/SergD_LoFiTyan/releases"><img src="https://img.shields.io/github/downloads/Victory-SergD/SergD_LoFiTyan/total?color=8b5cf6&label=скачиваний" alt="Downloads" /></a>
  <img src="https://img.shields.io/badge/macOS%20·%20Windows%20·%20Linux-8b5cf6" alt="Platforms" />
  <a href="LICENSE"><img src="https://img.shields.io/github/license/Victory-SergD/SergD_LoFiTyan?color=8b5cf6" alt="MIT" /></a>
  <a href="https://github.com/Victory-SergD/SergD_LoFiTyan/stargazers"><img src="https://img.shields.io/github/stars/Victory-SergD/SergD_LoFiTyan?style=flat&color=8b5cf6" alt="Stars" /></a>
</p>

<p align="center">
  <a href="https://github.com/Victory-SergD/SergD_LoFiTyan/releases/latest"><b>⬇️ Скачать — macOS · Windows · Linux</b></a> &nbsp;·&nbsp; <a href="README.en.md">🇬🇧 English</a>
</p>

<p align="center"><sub>Бесплатная open-source альтернатива Wallpaper Engine · Lofi.co · Noisli.</sub></p>

<p align="center"><img src="screenshots/main.jpeg" alt="LoFiTyan — lo-fi радио + живые обои с атмосферой дождя" width="820" /></p>

<p align="center">
  <img src="screenshots/settings.jpeg" alt="Настройки: фон, громкость, язык" height="300" />
  &nbsp;&nbsp;
  <img src="screenshots/vertical.jpeg" alt="Вертикальный режим под портретный монитор" height="300" />
</p>

<p align="center"><sub>Настоящее lo-fi радио поверх живой сцены · настройки фона/громкости/языка · вертикальный режим под портретный монитор.</sub></p>

> 🛠️ Проект **Victory**. Развитие открытого [lofi-engine](https://github.com/meel-hd/lofi-engine) (MIT).
> Мы превратили его в плеер **настоящего lo-fi радио** с атмосферой, персонажем-фоном и вертикальным режимом.

**Автор:** SergD · GitHub [@Victory-SergD](https://github.com/Victory-SergD)

## 📖 Что это

**LoFiTyan** — лёгкое настольное приложение (на Tauri), которое играет **настоящую lo-fi музыку из интернет-радио** ([radio-browser.info](https://www.radio-browser.info), станции lofi/chillhop) на фоне уютной сцены — **картинки или собственного видео** (живые обои, с зумом и точкой кадра под любой монитор). Поверх музыки можно подмешивать **атмосферу** (дождь, гром, лес, костёр — бесшовным циклом), а управление при простое **само скрывается** — остаётся чистая живая обоина. Работает на **macOS, Windows и Linux**.

> Музыка идёт из интернет-радио (нужна сеть); атмосфера, фон и интерфейс — локальные.

## 🗺️ Статус и дорожная карта

**✅ Готово:** реальное lo-fi радио (play/pause, ◀ ▶) с **устойчивой загрузкой** (перебор зеркал + повтор по тапу); **выбор станций** (жанры Lo-Fi/Chillhop/Focus/Sleep, кураторский набор HQ-станций, избранное ★, вкладка «Ещё», память последней); индикаторы загрузки/буферизации/ошибки; **видео-фоны** (своё видео нативно, зум + точка кадра кликом, без пустых полей на любой ориентации) и картинки-сцены — всё с зумом/фокусом; **атмосфера** (дождь/гром/лес/костёр) **бесшовным циклом** поверх музыки; мастер-громкость; авто-скрытие управления (мгновенный возврат, не гасит открытые настройки); **настоящий полноэкранный режим** (⛶ / `Esc`); честные горячие клавиши; настройки (громкость/фон/язык, 7 языков). В интерфейсе — **LoFiTyan**. Прошло два адверсариальных аудита. Проверено в реальном Tauri-окне.

**📋 Дальше** (детали — в [`docs/superpowers/`](docs/superpowers/)):
- Чистый компактный ряд управления внизу под вертикальный монитор.
- Глубокий бренд Victory: иконки приложения и идентификатор.
- Премиум-источник звука по желанию (Feed.fm / лицензия) — см. исследование источников.

> История ранней «генеративной» фазы и аудита — в [`docs/superpowers/`](docs/superpowers/) (specs/plans/qa).

## ✨ Возможности (сейчас)

- 🎵 Настоящее lo-fi радио: станции из radio-browser.info, play/pause, переключение ◀ ▶; устойчивая загрузка (перебор зеркал, повтор по тапу на ошибке).
- 🎛️ Выбор станций: панель с жанрами (Lo-Fi/Chillhop/Focus/Sleep), кураторский набор HQ-станций с бейджами битрейта, избранное ★, вкладка «Ещё» (radio-browser), память последней станции.
- ⏳ Понятная обратная связь: спиннер при загрузке/буферизации, сообщение при ошибке сети.
- 🎬 Видео-фоны (живые обои): своё видео нативно через системный диалог; **зум слайдером** и **точка кадра кликом** по превью — субъект остаётся в кадре на горизонтали и вертикали, без пустых полей. Картинки-сцены — с тем же зумом/фокусом.
- 🌧️ Атмосфера поверх музыки: дождь, гром, лес, костёр — **бесшовным циклом** (Web Audio, без щелчка на стыке), с визуалом дождя.
- 🔊 Мастер-громкость на радио и эффекты; стоп-всё по клавише `k`.
- 🖥️ Настоящий полноэкранный режим (edge-to-edge): кнопка ⛶ в доке, выход по `Esc`.
- ⌨️ Честные горячие клавиши: `Space` — play/pause радио, `K` — стоп-всё, `A/S/D/F` — эффекты, `←/→` — фон, `J` — настройки, `Ctrl/Cmd+I` — просторный режим.
- 🌌 «Просторный режим»: управление прячется при простое и **мгновенно** возвращается по движению — первый клик сразу попадает.
- 🖼️ Фон-сцена с персонажем; вертикальный/портретный режим.
- 🌍 7 языков интерфейса, включая русский.

## ⬇️ Установка

> [!IMPORTANT]
> ### 🍎 macOS: после установки выполни ОДНУ команду — иначе приложение не откроется!
> Приложение не подписано сертификатом Apple (так у всех open-source-приложений), поэтому macOS его блокирует. Перетащи **LoFiTyan** в «Программы», открой **Терминал** и выполни:
> ```bash
> /usr/bin/xattr -cr /Applications/LoFiTyan.app
> ```
> После этого LoFiTyan открывается как обычно — двойным кликом. (Способ без Терминала — в шаге 3 ниже.)

> Готовы установщики под **macOS** (Apple Silicon / Intel), **Windows** и **Linux** — всё на странице [**Releases**](https://github.com/Victory-SergD/SergD_LoFiTyan/releases/latest).

#### 🍎 macOS

1. Скачай `LoFiTyan_*_aarch64.dmg` (Apple Silicon, M1–M4) или `LoFiTyan_*_x64.dmg` (Intel) со страницы [**Releases**](https://github.com/Victory-SergD/SergD_LoFiTyan/releases/latest).
2. Открой `.dmg` и перетащи **LoFiTyan** в папку «Программы».
3. **Первый запуск.** Приложение не подписано сертификатом Apple (это нормально для open-source), поэтому macOS заблокирует его при первом открытии — на macOS 15 (Sequoia) в окне блокировки кнопки «Открыть» нет. Открой одним из способов:
   - **Надёжнее всего — Терминал** (одна команда снимает блокировку), потом открывай как обычно:
     ```bash
     /usr/bin/xattr -cr /Applications/LoFiTyan.app
     ```
   - **Без Терминала (Sequoia):** в окне блокировки нажми «Готово», затем **Системные настройки → Конфиденциальность и безопасность** → пролистай вниз до «LoFiTyan заблокирован…» → **«Открыть всё равно»** → подтверди вход. Открой приложение ещё раз → появится кнопка «Открыть».
   - На более старых macOS: **правый клик по иконке → «Открыть» → «Открыть»**.

#### 🪟 Windows

1. Скачай `LoFiTyan_*_x64-setup.exe` (или `.msi`) со страницы [Releases](https://github.com/Victory-SergD/SergD_LoFiTyan/releases/latest) и запусти.
2. Сборка без подписи — Windows SmartScreen может предупредить: нажми **«Подробнее» → «Выполнить в любом случае»**.

#### 🐧 Linux

```bash
# AppImage (универсально): сделать исполняемым и запустить
chmod +x LoFiTyan_*.AppImage && ./LoFiTyan_*.AppImage

# Debian / Ubuntu
sudo apt install ./LoFiTyan_*.deb

# Fedora / RHEL
sudo rpm -i LoFiTyan_*.rpm
```

### 🎬 Живые видео-обои (по желанию)

<p align="center"><img src="screenshots/demo.gif" alt="Дефолтные живые обои LoFiTyan — LoFi-тян, осень" width="640" /></p>
<p align="center"><sub>↑ Дефолтные живые обои (LoFi-тян, осень) идут в комплекте.</sub></p>

По умолчанию фон — картинка-сцена. Чтобы поставить **живое видео**:

1. Скачай пример `lofi-girl-autumn.mp4` со страницы [Releases](https://github.com/Victory-SergD/SergD_LoFiTyan/releases/latest) — или возьми любое своё видео/луп.
2. В приложении: **⚙ Настройки → Фон → Видео → выбрать файл** и укажи это видео.
3. **Кликни по превью**, чтобы задать точку кадра, и подвинь **слайдер зума** — настройки сохранятся под этот фон и переживут смену ориентации монитора.

## 🧩 Технологии

`Tauri 2` · `Svelte` · `TypeScript` · `Vite` · `radio-browser.info API` · `pnpm` · `Vitest`

## 🚀 Запуск локально

Понадобится: [Node.js](https://nodejs.org/), [pnpm](https://pnpm.io/), [Rust](https://www.rust-lang.org/) (stable) и [пререквизиты Tauri](https://tauri.app/start/prerequisites/) для твоей ОС.

```bash
git clone https://github.com/Victory-SergD/SergD_LoFiTyan
cd SergD_LoFiTyan
pnpm install
pnpm tauri:d   # запуск из исходников (режим разработки)
pnpm tauri:b   # сборка установщика (.dmg / .exe / .deb / ...)
```

Дополнительно: `pnpm dev` (только фронтенд), `pnpm test` (юнит-тесты, Vitest), `pnpm check` (проверка типов), `pnpm build`.

## 📂 Структура проекта

- `src/` — фронтенд на Svelte: интерфейс, компоненты, локали, сторы.
  - `src/lib/stores/radio.ts` — радио (radio-browser.info, перебор зеркал, кураторский seed + жанры + избранное + очередь + воспроизведение).
  - `src/lib/stores/background.ts` — единый фон (`bgMedia`: картинка/видео, точка кадра + зум, персист трансформов).
  - `src/lib/utils/audioLoop.ts` — бесшовный цикл эффектов на Web Audio.
  - `src/lib/stores/` — также `volume`, `weather`, `immersion`, `fullscreen`, `picker`, `ui`.
  - `src/lib/components/` — `RadioPlayer`, `StationPicker`, `Controls` (атмосфера + ⛶), `Canvas` (фон-слой: `<img>`/`<video>` cover), `Settings` (фон/видео/зум/громкость/язык), `TopBar`.
- `src-tauri/` — нативная оболочка (Rust / Tauri): CSP под радио-стримы, **asset-протокол + диалог** под видео-фоны.
- `public/assets/` — сцены-картинки и звуки атмосферы.
- `docs/superpowers/` — документы дизайна, планы, QA и хэндофф-документ.

## 🙏 Основано на

Этот проект — форк [**meel-hd/lofi-engine**](https://github.com/meel-hd/lofi-engine) (лицензия MIT). Большая благодарность автору и контрибьюторам за отличную основу. Радио-интеграция вдохновлена MIT-проектами вокруг [radio-browser.info](https://www.radio-browser.info) (паттерн запросов, без форка).

## 📄 Лицензия

[MIT](LICENSE) — как и у оригинала. Можно свободно использовать, изменять и распространять.
