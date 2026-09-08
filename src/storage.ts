/**
 * Persistent best scores via AsyncStorage. All calls are best-effort: if
 * storage is unavailable the game still works, just without saved records.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import { LEVELS } from "./levels";

const K_TOTAL = "zg.bestTotal";
const K_HOLES = "zg.bestHoles";

export interface Bests {
  /** Best (lowest) total strokes for a completed round, or null if none yet. */
  total: number | null;
  /** Best strokes per hole (index-aligned with LEVELS); 0 = no record. */
  holes: number[];
}

export async function loadBests(): Promise<Bests> {
  const empty: Bests = { total: null, holes: new Array(LEVELS.length).fill(0) };
  try {
    const [t, h] = await Promise.all([
      AsyncStorage.getItem(K_TOTAL),
      AsyncStorage.getItem(K_HOLES),
    ]);
    const holes = h ? (JSON.parse(h) as number[]) : empty.holes;
    return {
      total: t != null ? Number(t) : null,
      holes: holes.length === LEVELS.length ? holes : empty.holes,
    };
  } catch {
    return empty;
  }
}

/**
 * Merge a finished round's results into the stored bests. Returns the updated
 * bests plus whether the total was a new record.
 */
export async function recordRound(
  prev: Bests,
  strokesByHole: number[],
): Promise<{ bests: Bests; newTotalRecord: boolean }> {
  const total = strokesByHole.reduce((a, b) => a + b, 0);
  const holes = prev.holes.slice();
  for (let i = 0; i < strokesByHole.length; i++) {
    if (holes[i] === 0 || strokesByHole[i] < holes[i]) holes[i] = strokesByHole[i];
  }
  const newTotalRecord = prev.total == null || total < prev.total;
  const nextTotal = newTotalRecord ? total : prev.total;
  const bests: Bests = { total: nextTotal, holes };
  try {
    await Promise.all([
      AsyncStorage.setItem(K_TOTAL, String(nextTotal)),
      AsyncStorage.setItem(K_HOLES, JSON.stringify(holes)),
    ]);
  } catch {
    /* ignore write failures */
  }
  return { bests, newTotalRecord };
}
