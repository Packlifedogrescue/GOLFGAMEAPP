/**
 * Upgradeable clubs. Unlike balls (you equip one at a time), clubs are
 * permanent upgrade tracks you level up with coins. Their bonuses stack on top
 * of the equipped ball and apply to every shot.
 */

export interface Club {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  /** Short label for the stat this club improves. */
  stat: string;
  /** Per-level effect as a fraction (e.g. 0.05 = +5%). */
  perLevel: number;
  /** Shown as a percentage in the UI. */
  maxLevel: number;
  /** Coin cost to reach each level (index 0 = cost of level 1). */
  costs: number[];
}

export const CLUBS: Club[] = [
  {
    id: "driver",
    name: "Driver",
    emoji: "🏌️",
    blurb: "More clubhead speed — every shot hits harder.",
    stat: "Power",
    perLevel: 0.05,
    maxLevel: 5,
    costs: [200, 350, 550, 800, 1200],
  },
  {
    id: "irons",
    name: "Irons",
    emoji: "⛳",
    blurb: "Precise approach — the cup catches faster-rolling balls.",
    stat: "Cup catch",
    perLevel: 0.12,
    maxLevel: 5,
    costs: [170, 310, 500, 760, 1120],
  },
  {
    id: "putter",
    name: "Putter",
    emoji: "🎯",
    blurb: "Truer roll — stronger pull toward the cup.",
    stat: "Cup pull",
    perLevel: 0.15,
    maxLevel: 5,
    costs: [150, 300, 500, 750, 1100],
  },
  {
    id: "wedge",
    name: "Sand Wedge",
    emoji: "🏖️",
    blurb: "Powers through bunkers — less drag in the sand.",
    stat: "Sand relief",
    perLevel: 0.2,
    maxLevel: 5,
    costs: [180, 320, 520, 780, 1150],
  },
  {
    id: "rangefinder",
    name: "Rangefinder",
    emoji: "🔭",
    blurb: "Reads the green — a longer predictive aim line.",
    stat: "Aim length",
    perLevel: 0.25,
    maxLevel: 4,
    costs: [120, 260, 460, 720],
  },
];

export function getClub(id: string): Club | undefined {
  return CLUBS.find((c) => c.id === id);
}

export interface Upgrades {
  /** Multiplier on launch speed. */
  powerMult: number;
  /** Multiplier on cup magnetism. */
  magnetMult: number;
  /** Multiplier on the cup's capture speed (how fast a ball can drop). */
  captureMult: number;
  /** 0..1 — how much bunker drag is relieved toward fairway friction. */
  sandRelief: number;
  /** Multiplier on the predictive aim-line length. */
  aimMult: number;
}

export const NO_UPGRADES: Upgrades = {
  powerMult: 1,
  magnetMult: 1,
  captureMult: 1,
  sandRelief: 0,
  aimMult: 1,
};

/** Combine per-club levels into the physics/UX multipliers used in a shot. */
export function computeUpgrades(levels: Record<string, number>): Upgrades {
  const lvl = (id: string) => Math.max(0, levels[id] ?? 0);
  return {
    powerMult: 1 + lvl("driver") * 0.05,
    magnetMult: 1 + lvl("putter") * 0.15,
    captureMult: 1 + lvl("irons") * 0.12,
    sandRelief: Math.min(1, lvl("wedge") * 0.2),
    aimMult: 1 + lvl("rangefinder") * 0.25,
  };
}

/** Cost to go from the current level to the next, or null if maxed. */
export function nextCost(club: Club, level: number): number | null {
  if (level >= club.maxLevel) return null;
  return club.costs[level];
}
