# ⚡ ZappyGolf

A top-down arcade golf game for your phone, built with **Expo / React Native**.
Play a full **18-hole round**: drag back from the ball to aim and set power
(slingshot style), release to swing, and sink it in as few strokes as possible.

## Features

- **18 holes** across a front nine and back nine, each with its own par.
- **Slingshot aiming** — pull back from the ball to set direction and power;
  a live preview of dots shows where you're aiming, colored by power.
- **Real-ish physics** — friction, wall bounces, and a cup that gently pulls in
  a slow ball rolling over it.
- **Hazards** — water costs a penalty stroke and sends the ball back; sand
  bunkers bog it down.
- **Scoring** — birdies, eagles, bogeys, hole-in-ones, a running to-par total,
  and a full scorecard at the end of the round.

## How to play

1. On the title screen, tap **Start Round**.
2. **Drag backward** from the ball (like a slingshot). The further you drag, the
   more power — watch the aim dots change color from white → yellow → orange.
3. **Release** to take your shot.
4. Avoid the blue **water** (penalty + reset) and the tan **sand** (heavy drag).
5. Sink the ball to advance. After 18 holes you'll see your scorecard.

## Running it

You'll need [Node.js](https://nodejs.org/) and the Expo tooling.

```bash
npm install
npm start
```

Then:

- **On your phone:** install the **Expo Go** app, and scan the QR code printed
  in the terminal (or shown in the browser dev tools). The game loads directly
  on your device.
- **iOS simulator:** press `i` in the terminal (macOS + Xcode required).
- **Android emulator:** press `a` in the terminal (Android Studio required).
- **Browser preview:** press `w` (uses `react-native-web`).

### Building an installable app

To produce a standalone build you can install without Expo Go, use
[EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npm install -g eas-cli
eas build --platform android   # or ios
```

## Project layout

```
App.tsx            App shell: title screen, HUD, hole flow, scorecard, overlays
index.ts           Expo entry point
src/
  types.ts         Shared types (levels are authored in normalized 0..1 coords)
  levels.ts        All 18 hole layouts
  physics.ts       Ball physics: friction, bounces, hazards, sinking
  GolfGame.tsx     The play field: rendering, input (aiming), and the game loop
```

## Tuning

Gameplay feel lives in the constants at the top of `src/physics.ts` — friction,
bounce restitution, max shot speed, cup magnetism, and the stop threshold. Course
layouts are all in `src/levels.ts` as normalized rectangles, so they scale to any
screen. Add a hole by appending another entry to the `LEVELS` array.
