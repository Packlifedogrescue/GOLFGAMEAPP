/**
 * Top-down arcade golf physics.
 *
 * The ball is a circle; walls, hazards and the field edges are axis-aligned
 * rectangles. Everything here works in PIXEL space within the play field so the
 * numbers are easy to reason about; call {@link buildGeom} once per level to
 * convert the normalized level geometry into pixels.
 */

import { BallSpec, DEFAULT_BALL } from "./balls";
import { NO_UPGRADES, Upgrades } from "./clubs";
import { Ball, Level, Vec2 } from "./types";

export interface Field {
  width: number;
  height: number;
}

export interface PRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Geom {
  field: Field;
  ballR: number;
  holeR: number;
  tee: Vec2;
  hole: Vec2;
  walls: PRect[];
  hazards: (PRect & { kind: "water" | "sand" })[];
  // Ball- and club-dependent physics modifiers (baked in at build time).
  restitution: number;
  grassFriction: number;
  sandFriction: number;
  magnet: number;
  capture: number;
  waterproof: boolean;
}

export interface StepEvent {
  sank: boolean;
  water: boolean;
  bounced: boolean;
}

// --- Tunables (all speeds are px/second; distances px) ---------------------
const GRASS_FRICTION = 0.9855; // per-60fps-frame velocity retention on fairway
const SAND_FRICTION = 0.86; // heavy drag inside a bunker
const WALL_RESTITUTION = 0.72; // energy kept after a bounce
const STOP_FACTOR = 0.03; // stop when speed < STOP_FACTOR * fieldWidth
const CAPTURE_FACTOR = 0.95; // ball drops if it crosses the cup slower than this
const MAGNET_FACTOR = 1.7; // cup "gravity" kicks in within holeR * this
const MAX_SHOT_FACTOR = 1.95; // fastest launch speed = factor * fieldWidth

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function maxShotSpeed(field: Field, powerMult = 1): number {
  return MAX_SHOT_FACTOR * field.width * powerMult;
}

export function buildGeom(
  level: Level,
  field: Field,
  spec: BallSpec = DEFAULT_BALL,
  upgrades: Upgrades = NO_UPGRADES,
): Geom {
  const toPx = (v: Vec2): Vec2 => ({ x: v.x * field.width, y: v.y * field.height });
  const rectPx = (r: PRect): PRect => ({
    x: r.x * field.width,
    y: r.y * field.height,
    w: r.w * field.width,
    h: r.h * field.height,
  });
  // A higher roll multiplier means less friction (ball keeps going).
  const grassFriction = clamp(1 - (1 - GRASS_FRICTION) / spec.roll, 0.95, 0.997);
  // The Sand Wedge relieves bunker drag toward fairway friction.
  const sandFriction = SAND_FRICTION + (grassFriction - SAND_FRICTION) * upgrades.sandRelief;
  return {
    field,
    ballR: 0.026 * field.width,
    holeR: 0.042 * field.width,
    tee: toPx(level.tee),
    hole: toPx(level.hole),
    walls: level.walls.map(rectPx),
    hazards: level.hazards.map((h) => ({ ...rectPx(h), kind: h.kind })),
    restitution: clamp(WALL_RESTITUTION * spec.bounce, 0.25, 0.95),
    grassFriction,
    sandFriction,
    magnet: spec.magnet * upgrades.magnetMult,
    capture: CAPTURE_FACTOR * field.width * upgrades.captureMult,
    waterproof: spec.waterproof,
  };
}

export function spawnBall(geom: Geom): Ball {
  return {
    pos: { ...geom.tee },
    vel: { x: 0, y: 0 },
    rest: { ...geom.tee },
    moving: false,
    sunk: false,
  };
}

export function speed(b: Ball): number {
  return Math.hypot(b.vel.x, b.vel.y);
}

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointInRect(p: Vec2, r: PRect): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

/**
 * Reflect the ball off an AABB if it overlaps, pushing out on the shallow axis.
 * Returns true if a bounce actually happened.
 */
function resolveWall(b: Ball, r: PRect, radius: number, rest: number): boolean {
  const cx = Math.max(r.x, Math.min(b.pos.x, r.x + r.w));
  const cy = Math.max(r.y, Math.min(b.pos.y, r.y + r.h));
  const dx = b.pos.x - cx;
  const dy = b.pos.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 > radius * radius) return false; // no contact

  if (d2 > 1e-6) {
    // Contact on a face or corner: bounce along the contact normal.
    const d = Math.sqrt(d2);
    const nx = dx / d;
    const ny = dy / d;
    const push = radius - d;
    b.pos.x += nx * push;
    b.pos.y += ny * push;
    const vn = b.vel.x * nx + b.vel.y * ny;
    b.vel.x -= (1 + rest) * vn * nx;
    b.vel.y -= (1 + rest) * vn * ny;
  } else {
    // Center is inside the rect: eject along the shallowest edge.
    const left = b.pos.x - r.x;
    const right = r.x + r.w - b.pos.x;
    const top = b.pos.y - r.y;
    const bottom = r.y + r.h - b.pos.y;
    const m = Math.min(left, right, top, bottom);
    if (m === left) {
      b.pos.x = r.x - radius;
      b.vel.x = -Math.abs(b.vel.x) * rest;
    } else if (m === right) {
      b.pos.x = r.x + r.w + radius;
      b.vel.x = Math.abs(b.vel.x) * rest;
    } else if (m === top) {
      b.pos.y = r.y - radius;
      b.vel.y = -Math.abs(b.vel.y) * rest;
    } else {
      b.pos.y = r.y + r.h + radius;
      b.vel.y = Math.abs(b.vel.y) * rest;
    }
  }
  return true;
}

/**
 * Advance the ball by dt seconds. Mutates `b`. Uses sub-steps so a fast ball
 * can't tunnel through a wall in a single frame.
 */
export function stepBall(b: Ball, dt: number, geom: Geom): StepEvent {
  const event: StepEvent = { sank: false, water: false, bounced: false };
  if (!b.moving || b.sunk) return event;

  const sp = speed(b);
  const maxTravel = geom.ballR * 0.75;
  const substeps = Math.max(1, Math.ceil((sp * dt) / maxTravel));
  const h = dt / substeps;

  for (let i = 0; i < substeps; i++) {
    // Cup magnetism: gently curve a slow-ish ball toward the pin.
    const dh = dist(b.pos, geom.hole);
    if (dh < geom.holeR * MAGNET_FACTOR * geom.magnet) {
      const pull = 6 * geom.field.width * geom.magnet;
      const nx = (geom.hole.x - b.pos.x) / (dh || 1);
      const ny = (geom.hole.y - b.pos.y) / (dh || 1);
      b.vel.x += nx * pull * h;
      b.vel.y += ny * pull * h;
    }

    b.pos.x += b.vel.x * h;
    b.pos.y += b.vel.y * h;

    // Field boundary.
    const rest = geom.restitution;
    if (b.pos.x < geom.ballR) {
      b.pos.x = geom.ballR;
      b.vel.x = Math.abs(b.vel.x) * rest;
      event.bounced = true;
    } else if (b.pos.x > geom.field.width - geom.ballR) {
      b.pos.x = geom.field.width - geom.ballR;
      b.vel.x = -Math.abs(b.vel.x) * rest;
      event.bounced = true;
    }
    if (b.pos.y < geom.ballR) {
      b.pos.y = geom.ballR;
      b.vel.y = Math.abs(b.vel.y) * rest;
      event.bounced = true;
    } else if (b.pos.y > geom.field.height - geom.ballR) {
      b.pos.y = geom.field.height - geom.ballR;
      b.vel.y = -Math.abs(b.vel.y) * rest;
      event.bounced = true;
    }

    for (const w of geom.walls) {
      if (resolveWall(b, w, geom.ballR, rest)) event.bounced = true;
    }

    // Sink check.
    const dNow = dist(b.pos, geom.hole);
    if (dNow < geom.holeR) {
      if (speed(b) < geom.capture) {
        b.pos = { ...geom.hole };
        b.vel = { x: 0, y: 0 };
        b.moving = false;
        b.sunk = true;
        event.sank = true;
        return event;
      }
    }
  }

  // Hazards act on the resting-ish position after the move.
  let friction = geom.grassFriction;
  for (const hz of geom.hazards) {
    if (pointInRect(b.pos, hz)) {
      if (hz.kind === "water") {
        if (geom.waterproof) continue; // skips across water — no penalty
        b.pos = { ...b.rest };
        b.vel = { x: 0, y: 0 };
        b.moving = false;
        event.water = true;
        return event;
      } else {
        friction = geom.sandFriction;
      }
    }
  }

  // Friction (frame-rate independent).
  const decay = Math.pow(friction, dt * 60);
  b.vel.x *= decay;
  b.vel.y *= decay;

  // Come to rest.
  if (speed(b) < STOP_FACTOR * geom.field.width) {
    b.vel = { x: 0, y: 0 };
    b.moving = false;
    b.rest = { ...b.pos };
  }

  return event;
}

export interface Prediction {
  points: Vec2[];
  sinks: boolean;
}

/**
 * Dry-run a shot from `start` with velocity `vel` and return the path it would
 * trace (including bounces). Used to draw the predictive aim line. Runs on a
 * throwaway ball so it never touches live state.
 */
export function predictShot(
  geom: Geom,
  start: Vec2,
  vel: Vec2,
  maxTime = 1.6,
): Prediction {
  const ghost: Ball = {
    pos: { ...start },
    vel: { ...vel },
    rest: { ...start },
    moving: true,
    sunk: false,
  };
  const points: Vec2[] = [{ ...ghost.pos }];
  const dt = 1 / 60;
  const steps = Math.floor(maxTime / dt);
  let sinks = false;
  for (let i = 0; i < steps; i++) {
    const ev = stepBall(ghost, dt, geom);
    points.push({ ...ghost.pos });
    if (ev.sank) {
      sinks = true;
      break;
    }
    if (ev.water || !ghost.moving) break;
  }
  return { points, sinks };
}
