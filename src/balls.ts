/**
 * The ball roster. Each ball tweaks the physics via multipliers and, in a few
 * cases, a special ability. Balls are unlocked with coins earned by playing, or
 * bought as premium items via in-app purchase (see src/iap.ts).
 */

export type Unlock =
  | { type: "default" }
  | { type: "coins"; amount: number }
  | { type: "iap"; productId: string; price: string };

export interface BallSpec {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  /** Launch-speed multiplier (1 = standard). */
  power: number;
  /** Roll distance: >1 keeps rolling, <1 stops quickly (control). */
  roll: number;
  /** Wall bounciness multiplier. */
  bounce: number;
  /** Cup attraction multiplier — higher curves toward the hole. */
  magnet: number;
  /** Passes over water with no penalty. */
  waterproof: boolean;
  /** Ball fill + accent colors for rendering. */
  body: string;
  accent: string;
  unlock: Unlock;
}

export const BALLS: BallSpec[] = [
  {
    id: "classic",
    name: "Classic",
    emoji: "⚪",
    blurb: "The trusty standard. Balanced in every way.",
    power: 1.0,
    roll: 1.0,
    bounce: 1.0,
    magnet: 1.0,
    waterproof: false,
    body: "#ffffff",
    accent: "#e0e4e8",
    unlock: { type: "default" },
  },
  {
    id: "sunball",
    name: "Sunball",
    emoji: "🟡",
    blurb: "Extra pop and longer roll for big drives.",
    power: 1.18,
    roll: 1.18,
    bounce: 1.0,
    magnet: 1.0,
    waterproof: false,
    body: "#ffd447",
    accent: "#e6b800",
    unlock: { type: "coins", amount: 150 },
  },
  {
    id: "rico",
    name: "Rico",
    emoji: "🟠",
    blurb: "Super bouncy — ricochet off walls like a pinball.",
    power: 1.05,
    roll: 1.08,
    bounce: 1.35,
    magnet: 1.0,
    waterproof: false,
    body: "#ff8f3f",
    accent: "#e06a1c",
    unlock: { type: "coins", amount: 200 },
  },
  {
    id: "brick",
    name: "Brick",
    emoji: "🟤",
    blurb: "Dead-stop control. Barely rolls, soft off walls.",
    power: 0.98,
    roll: 0.72,
    bounce: 0.55,
    magnet: 1.15,
    waterproof: false,
    body: "#9c6b43",
    accent: "#6f4a2c",
    unlock: { type: "coins", amount: 250 },
  },
  {
    id: "homer",
    name: "Homer",
    emoji: "🔵",
    blurb: "Strong cup magnetism — curves toward the hole.",
    power: 1.0,
    roll: 1.0,
    bounce: 0.9,
    magnet: 2.1,
    waterproof: false,
    body: "#4da3ff",
    accent: "#2f7ed1",
    unlock: { type: "coins", amount: 350 },
  },
  {
    id: "aqua",
    name: "Aqua",
    emoji: "🩵",
    blurb: "Skips across water with zero penalty. Great carry.",
    power: 1.1,
    roll: 1.12,
    bounce: 1.0,
    magnet: 1.1,
    waterproof: true,
    body: "#37e0d0",
    accent: "#12b3a3",
    unlock: { type: "iap", productId: "com.zappygolf.ball.aqua", price: "$1.99" },
  },
  {
    id: "titan",
    name: "Titan",
    emoji: "⚫",
    blurb: "Raw power, long roll, and cup pull. A monster.",
    power: 1.4,
    roll: 1.32,
    bounce: 1.1,
    magnet: 1.5,
    waterproof: false,
    body: "#2b2f36",
    accent: "#c9a13b",
    unlock: { type: "iap", productId: "com.zappygolf.ball.titan", price: "$2.99" },
  },
  {
    id: "nova",
    name: "Neon Nova",
    emoji: "🟣",
    blurb: "The ultimate all-rounder: power, magnetism & waterproof.",
    power: 1.25,
    roll: 1.22,
    bounce: 1.05,
    magnet: 1.9,
    waterproof: true,
    body: "#b26bff",
    accent: "#8a3ff0",
    unlock: { type: "iap", productId: "com.zappygolf.ball.nova", price: "$3.99" },
  },
];

export const DEFAULT_BALL = BALLS[0];

export function getBall(id: string): BallSpec {
  return BALLS.find((b) => b.id === id) ?? DEFAULT_BALL;
}
