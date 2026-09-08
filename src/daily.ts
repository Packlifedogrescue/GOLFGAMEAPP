/**
 * Daily challenge: a single deterministic hole chosen from the calendar date,
 * so everyone playing on the same day gets the same challenge. Played with the
 * Classic ball and no club upgrades (see App), keeping daily scores fair and
 * comparable on the leaderboard.
 *
 * All state is local (AsyncStorage): completion tracking, a day streak, and the
 * best score for each day.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import { LEVELS } from "./levels";

const K_DAILY = "zg.daily";

export interface DailyChallenge {
  dateKey: string;
  holeIndex: number;
  par: number;
  /** Flavor label for the day (cosmetic). */
  twist: string;
}

export interface DailyState {
  streak: number;
  lastCompleted: string | null;
  /** Best strokes keyed by date (YYYY-MM-DD). */
  best: Record<string, number>;
}

const TWISTS = [
  "Precision Round",
  "Pressure Putt",
  "Bounce House",
  "Long Drive Day",
  "Sudden Sink",
  "Fairway Focus",
  "Cup Hunter",
];

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function dateKeyOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(): string {
  return dateKeyOf(new Date());
}

export function yesterdayKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return dateKeyOf(dt);
}

export function dailyChallenge(dateKey: string = todayKey()): DailyChallenge {
  const rnd = mulberry32(hashStr(dateKey));
  const holeIndex = Math.floor(rnd() * LEVELS.length);
  const twist = TWISTS[Math.floor(rnd() * TWISTS.length)];
  return { dateKey, holeIndex, par: LEVELS[holeIndex].par, twist };
}

export function defaultDaily(): DailyState {
  return { streak: 0, lastCompleted: null, best: {} };
}

export async function loadDaily(): Promise<DailyState> {
  try {
    const raw = await AsyncStorage.getItem(K_DAILY);
    if (!raw) return defaultDaily();
    const parsed = JSON.parse(raw) as DailyState;
    return {
      streak: parsed.streak ?? 0,
      lastCompleted: parsed.lastCompleted ?? null,
      best: parsed.best ?? {},
    };
  } catch {
    return defaultDaily();
  }
}

async function saveDaily(state: DailyState): Promise<void> {
  try {
    await AsyncStorage.setItem(K_DAILY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export interface DailyRecordResult {
  state: DailyState;
  firstToday: boolean;
  improved: boolean;
}

/** Record a daily attempt, updating best score and the day streak. */
export function recordDaily(
  prev: DailyState,
  dateKey: string,
  strokes: number,
): DailyRecordResult {
  const prevBest = prev.best[dateKey];
  const wasCompleted = prevBest !== undefined;
  const best = { ...prev.best, [dateKey]: wasCompleted ? Math.min(prevBest, strokes) : strokes };

  let streak = prev.streak;
  let lastCompleted = prev.lastCompleted;
  const firstToday = !wasCompleted;
  if (firstToday) {
    if (prev.lastCompleted === yesterdayKey(dateKey)) streak = prev.streak + 1;
    else if (prev.lastCompleted === dateKey) streak = prev.streak; // safety
    else streak = 1;
    lastCompleted = dateKey;
  }

  const state: DailyState = { streak, lastCompleted, best };
  saveDaily(state);
  return { state, firstToday, improved: wasCompleted && strokes < prevBest };
}

/** Coins for a daily attempt: performance vs par, plus a first-of-day streak bonus. */
export function coinsForDaily(
  strokes: number,
  par: number,
  streak: number,
  firstToday: boolean,
): number {
  const d = strokes - par;
  let base = 30;
  if (strokes === 1) base = 150;
  else if (d <= -2) base = 90;
  else if (d === -1) base = 60;
  else if (d === 0) base = 40;
  else if (d === 1) base = 20;
  else base = 10;
  const streakBonus = firstToday ? Math.min(streak, 10) * 15 : 0;
  return base + streakBonus;
}
