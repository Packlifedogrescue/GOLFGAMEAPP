# ⚡ ZappyGolf

Real 18-hole arcade golf for your phone — **Thunder Valley, par 72**. Drag back
to aim and set power (slingshot), release to swing, work the ball down the
fairway, and putt out on the green. Earn coins, shop for balls with real
abilities, upgrade your clubs, chase a daily challenge, climb the leaderboard,
and play under live‑style weather.

## Architecture

The whole game — course, physics, rendering, pro shop, balls, club upgrades,
coins, daily challenge, leaderboard and weather — is a single self‑contained
**canvas game engine** in [`assets/game.html`](assets/game.html). The native app
is a thin **Expo / React Native shell** ([`App.tsx`](App.tsx)) that hosts that
engine in a **WebView**, so the App Store build is exactly the game we ship on
the web, from one codebase.

- The page is loaded with a stable `https` `baseUrl`, giving it a real origin so
  its `localStorage` (coins, unlocks, club levels, best scores, daily streak)
  persists between launches.
- `metro.config.js` registers `html` as a bundled asset type.
- The `onMessage` bridge in `App.tsx` is where native **StoreKit / Play Billing**
  will fulfil real in‑app purchases (see *In‑app purchases* below).

Why a WebView? The game is a 60fps canvas engine; a WebView renders it
identically on iOS and Android with no per‑platform drawing code, and keeps the
web prototype and the store app in perfect sync.

## The game

- **Real golf course** — a tee box, a **fairway corridor**, thick **rough** that
  grabs the ball, a **putting green** with the pin, plus **bunkers, water,
  trees, and doglegs**. Holes are long and **scroll** as you play them, with a
  camera that follows your ball and a tee→green progress rail.
- **Putting zoom** — when your ball reaches the green the camera zooms in and
  power is scaled down for touch, so putting is its own precise phase.
- **Terrain that plays true** — fairway rolls out, rough costs you distance,
  bunkers bog you down, greens are smooth and fast. Par is set by yardage
  (155y par 3s up to 575y par 5s).
- **Pro Shop** — 8 **balls** (equip one; they change power, roll, bounce, cup
  magnetism, and a waterproof ability) and 5 **club upgrade tracks** that stack
  on any ball: Driver (distance), Irons (cup catch), Sand Wedge (bunker relief),
  Putter (cup pull), Rangefinder (aim line).
- **Coins** earned by playing well, spent on balls and club upgrades — or top up
  with a coin pack. Progress by grinding **or** pay to upgrade faster.
- **Daily Challenge** — one deterministic hole per day (same for everyone),
  played with the Classic ball and no upgrades so it's fair, with a day streak.
- **Leaderboard** — a full‑round board with CPU pace‑setters, plus your daily
  history; editable player name.
- **Weather** — ☀️ Sunny, ☁️ Cloudy, 🌧️ Rainy, ❄️ snow‑covered, 🌫️ Foggy
  courses. In the app "Auto" uses real local weather (see below); the in‑game
  picker lets you choose any.

## Running it

```bash
npm install
npm start
```

- **Phone:** install **Expo Go** and scan the QR code.
- **iOS simulator:** press `i`. **Android emulator:** press `a`.

To play the exact game engine in a browser without Expo, open
`assets/game.html` directly.

### Store build

```bash
npm install -g eas-cli
eas build --platform ios      # or android
```

## In‑app purchases (before release)

The game's shop currently runs a **sandbox purchase** for premium items — it
never charges anyone and is labeled "demo mode". To ship real purchases:

1. `npx expo install react-native-iap` and add its config plugin.
2. Create the product IDs in App Store Connect / Google Play:
   `com.zappygolf.ball.aqua`, `com.zappygolf.ball.titan`,
   `com.zappygolf.ball.nova` (non‑consumable);
   `com.zappygolf.coins.small/medium/large` (consumable).
3. Bridge the WebView to native billing: have the game `postMessage` the product
   id, run the real purchase in `App.tsx`'s `onMessage`, then inject the result
   back into the page (`webviewRef.injectJavaScript(...)`) to grant the item.
4. Add a **Restore Purchases** button and a privacy policy (store requirement).

## Real local weather (native)

To drive the course from the player's actual sky, add **Expo Location** +
the free **Open‑Meteo** API (no key), map the weather code to sun/cloud/rain/
snow/fog, and pass it into the page (e.g. via `injectJavaScript` calling the
game's `setWeather`). The WebView has normal network access, unlike a published
web artifact.

## Replacing the logo & icons

- **Logo** (title screen art in the game): the game currently draws its neon
  wordmark in code. To use custom art, embed it in `assets/game.html`.
- **App icon** `assets/icon.png` (1024²), **Android adaptive**
  `assets/adaptive-icon.png`, **splash** `assets/splash.png` — referenced from
  `app.json`.

## Project layout

```
App.tsx            Native WebView shell that hosts the game engine
index.ts           Expo entry point
metro.config.js    Registers .html as a bundled asset
app.json           Expo config, icons, splash, bundle ids
assets/
  game.html        The complete game engine (course, physics, UI, systems)
  icon.png, adaptive-icon.png, splash.png, logo.png
```

## Tuning

All gameplay lives in `assets/game.html`: the physics constants
(`F_FAIR`, `F_ROUGH`, `F_GREEN`, `F_SAND`, `MAXF`, capture, magnet) at the top of
the physics section control distance and feel; `LEVELS` holds the 18 holes;
`BALLS`, `CLUBS`, and `COIN_PACKS` define the shop; `WEATHER` the palettes.
