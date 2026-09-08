# ⚡ ZappyGolf

A top-down arcade golf game for your phone, built with **Expo / React Native**.
Play a full **18-hole round**: drag back from the ball to aim and set power
(slingshot style), release to swing, and sink it in as few strokes as possible —
then spend the coins you earn in the **Pro Shop** on balls with real gameplay
abilities.

## Features

- **18 holes** across a front nine and back nine, each with its own par.
- **Slingshot aiming** with a **predictive aim line** that traces your shot
  (including wall bounces) and turns **green when you'll sink it**.
- **Game feel / juice**: haptic feedback, sound effects, a ball trail, particle
  bursts, a sink pulse, and confetti when you finish a round.
- **Hazards**: blue **water** (penalty + reset) and tan **sand** bunkers.
- **Coins & the Pro Shop**: earn coins for good scores, then unlock balls.
- **Balls with abilities** — see below.
- **In-app purchases** for premium balls and coin packs (see the IAP section).
- **Scoring**: birdies, eagles, bogeys, hole-in-ones, a running to-par total,
  a full scorecard, and **persistent best scores**.

## Balls & the Pro Shop

Each ball changes how it plays. Stats are multipliers on the base physics:

| Ball        | Unlock     | What it does                                        |
| ----------- | ---------- | --------------------------------------------------- |
| Classic     | Free       | Balanced starter.                                   |
| Sunball     | 🪙 150     | +Power, +Roll — big drives.                         |
| Rico        | 🪙 200     | Super bouncy — ricochets off walls.                 |
| Brick       | 🪙 250     | Dead-stop control; barely rolls, soft off walls.    |
| Homer       | 🪙 350     | Strong cup magnetism — curves toward the hole.      |
| Aqua        | $1.99 IAP  | **Waterproof** — skips water with no penalty.       |
| Titan       | $2.99 IAP  | Max power, long roll, cup pull.                     |
| Neon Nova   | $3.99 IAP  | The all-rounder: power, magnetism **and** waterproof. |

Balls are defined in `src/balls.ts` — tweak stats or add new ones there. The
equipped ball's multipliers are baked into the physics in `src/physics.ts`
(`buildGeom`).

**Coins** are earned per hole by performance (birdie/eagle/hole-in-one pay more)
plus a round-completion bonus and a big bonus for a new best round. See
`src/economy.ts`. Coins and owned/equipped balls persist via AsyncStorage.

## Clubs (permanent upgrades)

Clubs are upgrade **tracks** (not equipped items) — their bonuses stack on top
of whatever ball you have and apply to every shot. Level them up with coins:

| Club        | Boosts                                                     |
| ----------- | ---------------------------------------------------------- |
| Driver      | **Power** — more clubhead speed on every shot.             |
| Irons       | **Cup catch** — the hole grabs faster-rolling balls.       |
| Sand Wedge  | **Sand relief** — less drag through bunkers.               |
| Putter      | **Cup pull** — stronger magnetism toward the hole.         |
| Rangefinder | **Aim length** — a longer predictive aim line.             |

Clubs are defined in `src/clubs.ts` (levels, costs, per-level effect). Their
combined effect is computed by `computeUpgrades()` and fed into the physics.

**Progress your way:** grind coins by playing to upgrade for free, or buy a coin
pack through the store to upgrade faster — coins are the single currency for both
balls and club upgrades.

## In-app purchases (IMPORTANT before release)

Real-money purchases require a **native build (EAS)** plus products configured in
**App Store Connect / Google Play Console** and a billing library
(`react-native-iap` or Expo StoreKit). Those cannot run in Expo Go.

To keep the game fully playable and testable right now, `src/iap.ts` ships a
**sandbox provider** that simulates a successful purchase **without charging
anyone** (`IAP_MODE === "sandbox"`), and the shop clearly labels this as demo
mode. **Before shipping to the stores you must connect real billing:**

1. `npx expo install react-native-iap` (add its config plugin).
2. Build with EAS: `eas build -p ios` / `-p android`.
3. Create these product IDs in both store consoles:
   - `com.zappygolf.ball.aqua`, `com.zappygolf.ball.titan`,
     `com.zappygolf.ball.nova` (non-consumable)
   - `com.zappygolf.coins.small`, `com.zappygolf.coins.medium`,
     `com.zappygolf.coins.large` (consumable)
4. Replace `sandboxPurchase` in `src/iap.ts` with a real provider (request the
   purchase, verify the receipt server-side, finish the transaction), and set
   `IAP_MODE = "store"`.

Also add a **Restore Purchases** button (store requirement) and a privacy policy
before submitting.

## Replacing the logo & icons

- **Logo** (title screen): replace `assets/logo.png` with your artwork, keeping
  the same filename — no code change needed. It shows on the dark title screen,
  so a transparent or dark-background image looks best.
- **App icon**: `assets/icon.png` (1024×1024). **Android adaptive**:
  `assets/adaptive-icon.png`. **Splash**: `assets/splash.png`. All are
  referenced from `app.json`.

## How to play

1. Tap **Start Round**.
2. **Drag backward** from the ball (slingshot). The dotted aim line previews the
   path and bounces; it turns **green** when the shot will drop.
3. **Release** to swing. Avoid water (penalty) and sand (drag).
4. Sink to advance. Earn coins, then visit the 🏪 **Pro Shop**.

## Running it

```bash
npm install
npm start
```

- **Phone:** install **Expo Go** and scan the QR code. (Sound + haptics work on
  a real device; the web preview omits them.)
- **iOS simulator:** press `i`. **Android emulator:** press `a`.
  **Browser:** press `w`.

### Building an installable / store app

```bash
npm install -g eas-cli
eas build --platform android   # or ios
```

See [EAS Build](https://docs.expo.dev/build/introduction/) and
[submission](https://docs.expo.dev/submit/introduction/) docs.

## Project layout

```
App.tsx            App shell: title, HUD, hole flow, scorecard, shop wiring
index.ts           Expo entry point
assets/
  icon.png, adaptive-icon.png, splash.png, logo.png
  sfx/*.wav        Synthesized sound effects
src/
  types.ts         Shared types (levels use normalized 0..1 coords)
  levels.ts        All 18 hole layouts
  physics.ts       Ball physics + shot prediction (applies ball modifiers)
  balls.ts         Ball roster: stats, abilities, unlock cost
  clubs.ts         Club upgrade tracks: levels, costs, combined effects
  economy.ts       Coins, owned/equipped balls, club levels (persisted)
  storage.ts       Persistent best scores
  iap.ts           In-app purchase layer (sandbox provider + product catalog)
  feedback.ts      Sound + haptics
  Shop.tsx         Pro Shop UI
  Confetti.tsx     Round-complete celebration
  GolfGame.tsx     Play field: rendering, input, and the game loop
```

## Tuning

Gameplay feel lives in the constants at the top of `src/physics.ts`. Course
layouts are in `src/levels.ts` (normalized rectangles that scale to any screen).
Ball stats and prices are in `src/balls.ts`; coin payouts in `src/economy.ts`.
