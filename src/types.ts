/**
 * Shared types for the arcade golf game.
 *
 * Level geometry is authored in NORMALIZED coordinates: every x/width is a
 * fraction of the play-field width and every y/height is a fraction of the
 * play-field height (both 0..1). This keeps courses identical on every screen
 * size; the physics layer converts to pixels once the field is measured.
 */

export interface Vec2 {
  x: number;
  y: number;
}

/** Axis-aligned rectangle in normalized [0..1] field coordinates. */
export interface NRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type HazardKind = "water" | "sand";

export interface Hazard extends NRect {
  kind: HazardKind;
}

export interface Level {
  name: string;
  par: number;
  /** Tee (starting) position in normalized coords. */
  tee: Vec2;
  /** Hole (cup) position in normalized coords. */
  hole: Vec2;
  /** Interior walls / obstacles the ball bounces off. */
  walls: NRect[];
  /** Hazards: water resets the ball with a penalty, sand slows it down. */
  hazards: Hazard[];
}

/** Live ball state, tracked in PIXEL space within the play field. */
export interface Ball {
  pos: Vec2;
  vel: Vec2;
  /** Last resting position, used to restore after a water penalty. */
  rest: Vec2;
  moving: boolean;
  sunk: boolean;
}

export interface HoleResult {
  name: string;
  par: number;
  strokes: number;
}
