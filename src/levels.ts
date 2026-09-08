/**
 * Course design: a full 18-hole round. All coordinates are normalized (0..1)
 * fractions of the play field, with (0,0) at the top-left. Tees sit near the
 * bottom, cups near the top, so the player putts "up" the screen.
 */

import { Level } from "./types";

export const LEVELS: Level[] = [
  // ---------------------------- FRONT NINE ----------------------------
  {
    name: "1 · The Opener",
    par: 2,
    tee: { x: 0.5, y: 0.86 },
    hole: { x: 0.5, y: 0.14 },
    walls: [],
    hazards: [],
  },
  {
    name: "2 · Sandy Straight",
    par: 3,
    tee: { x: 0.5, y: 0.87 },
    hole: { x: 0.5, y: 0.12 },
    walls: [],
    hazards: [{ x: 0.34, y: 0.4, w: 0.32, h: 0.13, kind: "sand" }],
  },
  {
    name: "3 · The Dogleg",
    par: 3,
    tee: { x: 0.22, y: 0.86 },
    hole: { x: 0.78, y: 0.15 },
    walls: [{ x: 0.45, y: 0.0, w: 0.1, h: 0.58 }],
    hazards: [{ x: 0.55, y: 0.62, w: 0.25, h: 0.12, kind: "sand" }],
  },
  {
    name: "4 · Water Carry",
    par: 4,
    tee: { x: 0.5, y: 0.88 },
    hole: { x: 0.5, y: 0.12 },
    walls: [],
    hazards: [
      { x: 0.0, y: 0.46, w: 0.56, h: 0.1, kind: "water" },
      { x: 0.72, y: 0.2, w: 0.2, h: 0.1, kind: "sand" },
    ],
  },
  {
    name: "5 · The Zigzag",
    par: 4,
    tee: { x: 0.16, y: 0.86 },
    hole: { x: 0.84, y: 0.18 },
    walls: [
      { x: 0.32, y: 0.34, w: 0.09, h: 0.5 },
      { x: 0.6, y: 0.0, w: 0.09, h: 0.5 },
    ],
    hazards: [{ x: 0.7, y: 0.55, w: 0.22, h: 0.12, kind: "sand" }],
  },
  {
    name: "6 · Pinch Point",
    par: 3,
    tee: { x: 0.5, y: 0.87 },
    hole: { x: 0.5, y: 0.12 },
    walls: [
      { x: 0.0, y: 0.44, w: 0.36, h: 0.08 },
      { x: 0.64, y: 0.44, w: 0.36, h: 0.08 },
    ],
    hazards: [],
  },
  {
    name: "7 · Twin Ponds",
    par: 4,
    tee: { x: 0.5, y: 0.88 },
    hole: { x: 0.5, y: 0.12 },
    walls: [],
    hazards: [
      { x: 0.12, y: 0.4, w: 0.22, h: 0.14, kind: "water" },
      { x: 0.66, y: 0.5, w: 0.22, h: 0.14, kind: "water" },
    ],
  },
  {
    name: "8 · The Chicane",
    par: 4,
    tee: { x: 0.2, y: 0.88 },
    hole: { x: 0.8, y: 0.12 },
    walls: [
      { x: 0.4, y: 0.62, w: 0.45, h: 0.07 },
      { x: 0.15, y: 0.36, w: 0.45, h: 0.07 },
    ],
    hazards: [{ x: 0.4, y: 0.72, w: 0.2, h: 0.1, kind: "sand" }],
  },
  {
    name: "9 · Bunker Gauntlet",
    par: 5,
    tee: { x: 0.5, y: 0.9 },
    hole: { x: 0.5, y: 0.1 },
    walls: [],
    hazards: [
      { x: 0.28, y: 0.68, w: 0.18, h: 0.12, kind: "sand" },
      { x: 0.56, y: 0.5, w: 0.18, h: 0.12, kind: "sand" },
      { x: 0.28, y: 0.3, w: 0.18, h: 0.12, kind: "sand" },
    ],
  },

  // ---------------------------- BACK NINE ----------------------------
  {
    name: "10 · Long Alley",
    par: 4,
    tee: { x: 0.5, y: 0.92 },
    hole: { x: 0.5, y: 0.08 },
    walls: [
      { x: 0.28, y: 0.3, w: 0.06, h: 0.45 },
      { x: 0.66, y: 0.3, w: 0.06, h: 0.45 },
    ],
    hazards: [{ x: 0.42, y: 0.4, w: 0.16, h: 0.1, kind: "sand" }],
  },
  {
    name: "11 · Moat",
    par: 4,
    tee: { x: 0.5, y: 0.88 },
    hole: { x: 0.5, y: 0.14 },
    walls: [],
    hazards: [
      { x: 0.28, y: 0.24, w: 0.44, h: 0.08, kind: "water" },
      { x: 0.28, y: 0.5, w: 0.44, h: 0.08, kind: "water" },
    ],
  },
  {
    name: "12 · The Spiral",
    par: 5,
    tee: { x: 0.5, y: 0.9 },
    hole: { x: 0.5, y: 0.5 },
    walls: [
      { x: 0.2, y: 0.2, w: 0.6, h: 0.06 },
      { x: 0.2, y: 0.2, w: 0.06, h: 0.5 },
      { x: 0.74, y: 0.2, w: 0.06, h: 0.35 },
      { x: 0.35, y: 0.64, w: 0.45, h: 0.06 },
    ],
    hazards: [],
  },
  {
    name: "13 · Island Green",
    par: 4,
    tee: { x: 0.5, y: 0.9 },
    hole: { x: 0.5, y: 0.2 },
    walls: [],
    hazards: [
      { x: 0.2, y: 0.1, w: 0.6, h: 0.06, kind: "water" },
      { x: 0.2, y: 0.1, w: 0.06, h: 0.28, kind: "water" },
      { x: 0.74, y: 0.1, w: 0.06, h: 0.28, kind: "water" },
      { x: 0.2, y: 0.32, w: 0.24, h: 0.06, kind: "water" },
      { x: 0.56, y: 0.32, w: 0.24, h: 0.06, kind: "water" },
    ],
  },
  {
    name: "14 · Narrows",
    par: 3,
    tee: { x: 0.5, y: 0.87 },
    hole: { x: 0.5, y: 0.12 },
    walls: [
      { x: 0.0, y: 0.3, w: 0.42, h: 0.06 },
      { x: 0.58, y: 0.5, w: 0.42, h: 0.06 },
    ],
    hazards: [
      { x: 0.58, y: 0.3, w: 0.42, h: 0.06, kind: "sand" },
      { x: 0.0, y: 0.5, w: 0.42, h: 0.06, kind: "sand" },
    ],
  },
  {
    name: "15 · Crossfire",
    par: 5,
    tee: { x: 0.16, y: 0.9 },
    hole: { x: 0.84, y: 0.1 },
    walls: [
      { x: 0.4, y: 0.28, w: 0.08, h: 0.4 },
      { x: 0.52, y: 0.32, w: 0.08, h: 0.4 },
    ],
    hazards: [
      { x: 0.0, y: 0.44, w: 0.32, h: 0.1, kind: "water" },
      { x: 0.68, y: 0.44, w: 0.32, h: 0.1, kind: "sand" },
    ],
  },
  {
    name: "16 · Horseshoe",
    par: 4,
    tee: { x: 0.5, y: 0.9 },
    hole: { x: 0.5, y: 0.7 },
    walls: [
      { x: 0.24, y: 0.2, w: 0.52, h: 0.06 },
      { x: 0.24, y: 0.2, w: 0.06, h: 0.42 },
      { x: 0.7, y: 0.2, w: 0.06, h: 0.42 },
    ],
    hazards: [{ x: 0.42, y: 0.3, w: 0.16, h: 0.16, kind: "water" }],
  },
  {
    name: "17 · Double Trouble",
    par: 4,
    tee: { x: 0.2, y: 0.88 },
    hole: { x: 0.8, y: 0.14 },
    walls: [{ x: 0.44, y: 0.32, w: 0.1, h: 0.4 }],
    hazards: [
      { x: 0.1, y: 0.3, w: 0.22, h: 0.12, kind: "water" },
      { x: 0.62, y: 0.6, w: 0.22, h: 0.12, kind: "sand" },
    ],
  },
  {
    name: "18 · The Finale",
    par: 5,
    tee: { x: 0.5, y: 0.92 },
    hole: { x: 0.5, y: 0.09 },
    walls: [
      { x: 0.3, y: 0.32, w: 0.4, h: 0.06 },
      { x: 0.3, y: 0.56, w: 0.4, h: 0.06 },
    ],
    hazards: [
      { x: 0.0, y: 0.42, w: 0.22, h: 0.16, kind: "water" },
      { x: 0.78, y: 0.42, w: 0.22, h: 0.16, kind: "water" },
      { x: 0.36, y: 0.43, w: 0.28, h: 0.11, kind: "sand" },
    ],
  },
];
