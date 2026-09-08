/**
 * Player economy: coins earned by playing, which balls are owned, and which is
 * equipped. Persisted with AsyncStorage; all calls are best-effort.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEFAULT_BALL } from "./balls";
import { HoleResult } from "./types";

const K_COINS = "zg.coins";
const K_OWNED = "zg.owned";
const K_EQUIPPED = "zg.equipped";
const K_CLUBS = "zg.clubs";

export interface Economy {
  coins: number;
  owned: string[];
  equipped: string;
  /** Per-club upgrade levels, keyed by club id (missing = level 0). */
  clubLevels: Record<string, number>;
}

export function defaultEconomy(): Economy {
  return { coins: 0, owned: [DEFAULT_BALL.id], equipped: DEFAULT_BALL.id, clubLevels: {} };
}

export async function loadEconomy(): Promise<Economy> {
  const base = defaultEconomy();
  try {
    const [c, o, e, k] = await Promise.all([
      AsyncStorage.getItem(K_COINS),
      AsyncStorage.getItem(K_OWNED),
      AsyncStorage.getItem(K_EQUIPPED),
      AsyncStorage.getItem(K_CLUBS),
    ]);
    const owned = o ? (JSON.parse(o) as string[]) : base.owned;
    if (!owned.includes(DEFAULT_BALL.id)) owned.unshift(DEFAULT_BALL.id);
    const equipped = e && owned.includes(e) ? e : DEFAULT_BALL.id;
    const clubLevels = k ? (JSON.parse(k) as Record<string, number>) : {};
    return {
      coins: c != null ? Math.max(0, Number(c) || 0) : 0,
      owned,
      equipped,
      clubLevels,
    };
  } catch {
    return base;
  }
}

export async function saveEconomy(econ: Economy): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(K_COINS, String(econ.coins)),
      AsyncStorage.setItem(K_OWNED, JSON.stringify(econ.owned)),
      AsyncStorage.setItem(K_EQUIPPED, econ.equipped),
      AsyncStorage.setItem(K_CLUBS, JSON.stringify(econ.clubLevels)),
    ]);
  } catch {
    /* ignore */
  }
}

/** Coins awarded for a single hole based on performance vs par. */
export function coinsForHole(r: HoleResult): number {
  if (r.strokes === 1) return 100; // hole in one
  const d = r.strokes - r.par;
  if (d <= -3) return 80; // albatross
  if (d === -2) return 60; // eagle
  if (d === -1) return 40; // birdie
  if (d === 0) return 20; // par
  if (d === 1) return 10; // bogey
  return 5;
}

/** Bonus for finishing a round (plus extra for a new personal best). */
export function coinsForRound(newRecord: boolean): number {
  return 50 + (newRecord ? 150 : 0);
}
