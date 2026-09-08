import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
} from "react-native";

import { BallSpec, DEFAULT_BALL } from "./balls";
import { NO_UPGRADES, Upgrades } from "./clubs";
import {
  hapticBounce,
  hapticLaunch,
  hapticSink,
  hapticTick,
  hapticWater,
  play,
} from "./feedback";
import { LEVELS } from "./levels";
import {
  Field,
  Geom,
  buildGeom,
  maxShotSpeed,
  predictShot,
  spawnBall,
  stepBall,
} from "./physics";
import { Ball, Vec2 } from "./types";

interface Props {
  levelIndex: number;
  ball: BallSpec;
  upgrades: Upgrades;
  onHoleComplete: (strokes: number) => void;
  onStrokes: (strokes: number) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const TRAIL_MAX = 16;

export default function GolfGame({
  levelIndex,
  ball: spec = DEFAULT_BALL,
  upgrades = NO_UPGRADES,
  onHoleComplete,
  onStrokes,
}: Props) {
  const level = LEVELS[levelIndex];
  const [field, setField] = useState<Field | null>(null);
  const [, forceTick] = useState(0);
  const rerender = () => forceTick((n) => (n + 1) % 1000000);

  const geom = useMemo<Geom | null>(
    () => (field ? buildGeom(level, field, spec, upgrades) : null),
    [field, level, spec, upgrades],
  );

  const ballRef = useRef<Ball | null>(null);
  const trailRef = useRef<Vec2[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const pulseRef = useRef<{ t: number } | null>(null);
  const strokesRef = useRef(0);
  const completedRef = useRef(false);
  const powerBucketRef = useRef(0);
  const aimRef = useRef<{ dx: number; dy: number } | null>(null);
  const [aim, setAimState] = useState<{ dx: number; dy: number } | null>(null);
  const setAim = (v: { dx: number; dy: number } | null) => {
    aimRef.current = v;
    setAimState(v);
  };

  // (Re)spawn when hole/geometry changes.
  useEffect(() => {
    if (!geom) return;
    ballRef.current = spawnBall(geom);
    trailRef.current = [];
    particlesRef.current = [];
    pulseRef.current = null;
    strokesRef.current = 0;
    completedRef.current = false;
    onStrokes(0);
    setAim(null);
    rerender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geom]);

  function spawnBurst(at: Vec2, colors: string[], count: number, spread: number) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = spread * (0.4 + Math.random() * 0.6);
      particlesRef.current.push({
        x: at.x,
        y: at.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0,
        max: 0.45 + Math.random() * 0.35,
        size: (geom?.ballR ?? 6) * (0.3 + Math.random() * 0.5),
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  // Master animation + physics loop.
  useEffect(() => {
    if (!geom) return;
    let raf = 0;
    let last: number | null = null;
    const tick = (t: number) => {
      if (last == null) last = t;
      let dt = (t - last) / 1000;
      last = t;
      dt = Math.min(dt, 1 / 30);

      let active = false;
      const b = ballRef.current;

      if (b && b.moving && !b.sunk) {
        const ev = stepBall(b, dt, geom);
        // trail
        trailRef.current.push({ x: b.pos.x, y: b.pos.y });
        if (trailRef.current.length > TRAIL_MAX) trailRef.current.shift();

        if (ev.bounced) {
          play("bounce");
          hapticBounce();
        }
        if (ev.water) {
          strokesRef.current += 1; // penalty
          onStrokes(strokesRef.current);
          play("splash");
          hapticWater();
          spawnBurst(b.pos, ["#8fd3ff", "#cfefff", "#ffffff"], 14, geom.field.width * 1.4);
          trailRef.current = [];
        }
        if (ev.sank && !completedRef.current) {
          completedRef.current = true;
          play("sink");
          hapticSink();
          spawnBurst(geom.hole, ["#ffffff", "#ffe08a", "#7CFC7C"], 22, geom.field.width * 1.6);
          pulseRef.current = { t: 0 };
          trailRef.current = [];
          const strokes = strokesRef.current;
          setTimeout(() => onHoleComplete(strokes), 620);
        }
        active = true;
      } else if (trailRef.current.length > 0) {
        // fade the trail out after the ball stops
        trailRef.current.shift();
        active = true;
      }

      // particles
      if (particlesRef.current.length > 0) {
        const alive: Particle[] = [];
        for (const p of particlesRef.current) {
          p.life += dt;
          if (p.life >= p.max) continue;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.9;
          p.vy *= 0.9;
          alive.push(p);
        }
        particlesRef.current = alive;
        active = true;
      }

      // sink pulse
      if (pulseRef.current) {
        pulseRef.current.t += dt;
        if (pulseRef.current.t > 0.6) pulseRef.current = null;
        active = true;
      }

      if (active || aimRef.current) rerender();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geom]);

  const maxDrag = field ? 0.42 * field.width : 1;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          const b = ballRef.current;
          if (!b || b.moving || b.sunk || completedRef.current) return;
          powerBucketRef.current = 0;
          setAim({ dx: 0, dy: 0 });
        },
        onPanResponderMove: (_e, g) => {
          const b = ballRef.current;
          if (!b || b.moving || b.sunk || completedRef.current) return;
          const power = clamp(Math.hypot(g.dx, g.dy) / maxDrag, 0, 1);
          const bucket = Math.floor(power * 4);
          if (bucket !== powerBucketRef.current) {
            powerBucketRef.current = bucket;
            hapticTick();
          }
          setAim({ dx: g.dx, dy: g.dy });
        },
        onPanResponderRelease: (_e, g) => {
          const b = ballRef.current;
          setAim(null);
          if (!b || !field || b.moving || b.sunk || completedRef.current) return;
          const len = Math.hypot(g.dx, g.dy);
          const power = clamp(len / maxDrag, 0, 1);
          if (power < 0.05) return;
          const dirx = -g.dx / (len || 1);
          const diry = -g.dy / (len || 1);
          const sp = power * maxShotSpeed(field, spec.power * upgrades.powerMult);
          b.vel = { x: dirx * sp, y: diry * sp };
          b.moving = true;
          trailRef.current = [];
          strokesRef.current += 1;
          onStrokes(strokesRef.current);
          play("putt");
          hapticLaunch(power);
        },
        onPanResponderTerminate: () => setAim(null),
      }),
    [maxDrag, field, spec, upgrades],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setField((prev) =>
        prev && prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );
    }
  };

  const ball = ballRef.current;

  // Predicted trajectory while aiming.
  const prediction = useMemo(() => {
    if (!aim || !ball || !field || !geom || ball.moving || ball.sunk) return null;
    const len = Math.hypot(aim.dx, aim.dy);
    const power = clamp(len / maxDrag, 0, 1);
    if (power < 0.05) return null;
    const dirx = -aim.dx / (len || 1);
    const diry = -aim.dy / (len || 1);
    const sp = power * maxShotSpeed(field, spec.power * upgrades.powerMult);
    const pred = predictShot(geom, ball.pos, { x: dirx * sp, y: diry * sp }, 1.6 * upgrades.aimMult);
    return { ...pred, power };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aim, geom, maxDrag, spec, upgrades]);

  return (
    <View style={styles.field} onLayout={onLayout} {...pan.panHandlers}>
      {/* Fairway mowing stripes. */}
      {field
        ? Array.from({ length: 12 }).map((_, i) => (
            <View
              key={`stripe-${i}`}
              style={[
                styles.stripe,
                {
                  top: (i / 12) * field.height,
                  height: field.height / 12,
                  backgroundColor:
                    i % 2 === 0 ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.03)",
                },
              ]}
            />
          ))
        : null}

      {geom &&
        geom.hazards.map((h, i) => (
          <View
            key={`hz-${i}`}
            style={[
              styles.hazard,
              {
                left: h.x,
                top: h.y,
                width: h.w,
                height: h.h,
                backgroundColor: h.kind === "water" ? "#2a7ec4" : "#e4d29a",
                borderColor: h.kind === "water" ? "#1f6199" : "#cbb877",
              },
            ]}
          >
            {h.kind === "water" && (
              <View style={styles.waterShine} pointerEvents="none" />
            )}
          </View>
        ))}

      {geom &&
        geom.walls.map((w, i) => (
          <View
            key={`wall-${i}`}
            style={[styles.wall, { left: w.x, top: w.y, width: w.w, height: w.h }]}
          />
        ))}

      {/* Predicted trajectory dots. */}
      {prediction && geom
        ? samplePath(prediction.points, 16).map((p, i, arr) => {
            const t = i / Math.max(1, arr.length - 1);
            const size = geom.ballR * (0.42 - t * 0.22);
            return (
              <View
                key={`pred-${i}`}
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: p.x - size,
                  top: p.y - size,
                  width: size * 2,
                  height: size * 2,
                  borderRadius: size,
                  backgroundColor: prediction.sinks
                    ? "#7CFC7C"
                    : powerColor(prediction.power),
                  opacity: 0.85 - t * 0.5,
                }}
              />
            );
          })
        : null}

      {/* Hole target ring pulse (subtle attract) + cup + flag. */}
      {geom && (
        <>
          <View
            pointerEvents="none"
            style={[
              styles.holeRing,
              {
                left: geom.hole.x - geom.holeR * 1.7,
                top: geom.hole.y - geom.holeR * 1.7,
                width: geom.holeR * 3.4,
                height: geom.holeR * 3.4,
                borderRadius: geom.holeR * 1.7,
              },
            ]}
          />
          <View
            style={[
              styles.hole,
              {
                left: geom.hole.x - geom.holeR,
                top: geom.hole.y - geom.holeR,
                width: geom.holeR * 2,
                height: geom.holeR * 2,
                borderRadius: geom.holeR,
              },
            ]}
          />
          <View
            style={[
              styles.flagPole,
              { left: geom.hole.x - 1, top: geom.hole.y - geom.holeR * 3.6 },
            ]}
          />
          <View
            style={[
              styles.flag,
              { left: geom.hole.x, top: geom.hole.y - geom.holeR * 3.6 },
            ]}
          />
        </>
      )}

      {/* Sink pulse ring. */}
      {pulseRef.current && geom
        ? (() => {
            const t = pulseRef.current!.t / 0.6;
            const r = geom.holeR + t * geom.holeR * 4;
            return (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: geom.hole.x - r,
                  top: geom.hole.y - r,
                  width: r * 2,
                  height: r * 2,
                  borderRadius: r,
                  borderWidth: 3,
                  borderColor: "#fff",
                  opacity: 0.8 * (1 - t),
                }}
              />
            );
          })()
        : null}

      {/* Ball trail. */}
      {geom &&
        trailRef.current.map((p, i, arr) => {
          const t = i / Math.max(1, arr.length);
          const size = geom.ballR * (0.28 + t * 0.5);
          return (
            <View
              key={`trail-${i}`}
              pointerEvents="none"
              style={{
                position: "absolute",
                left: p.x - size,
                top: p.y - size,
                width: size * 2,
                height: size * 2,
                borderRadius: size,
                backgroundColor: "#ffffff",
                opacity: 0.05 + t * 0.28,
              }}
            />
          );
        })}

      {/* Aim power ring around the ball. */}
      {prediction && geom && ball && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: ball.pos.x - geom.ballR * (1.4 + prediction.power),
            top: ball.pos.y - geom.ballR * (1.4 + prediction.power),
            width: geom.ballR * (2.8 + prediction.power * 2),
            height: geom.ballR * (2.8 + prediction.power * 2),
            borderRadius: geom.ballR * (1.4 + prediction.power),
            borderWidth: 2.5,
            borderColor: powerColor(prediction.power),
            opacity: 0.9,
          }}
        />
      )}

      {/* The ball (colored by the equipped ball). */}
      {geom && ball && (
        <View
          style={[
            styles.ball,
            {
              left: ball.pos.x - geom.ballR,
              top: ball.pos.y - geom.ballR,
              width: geom.ballR * 2,
              height: geom.ballR * 2,
              borderRadius: geom.ballR,
              backgroundColor: spec.body,
              borderColor: spec.accent,
              opacity: ball.sunk ? 0 : 1,
            },
          ]}
        >
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: geom.ballR * 0.45,
              top: geom.ballR * 0.35,
              width: geom.ballR * 0.7,
              height: geom.ballR * 0.7,
              borderRadius: geom.ballR * 0.35,
              backgroundColor: "rgba(255,255,255,0.85)",
            }}
          />
        </View>
      )}

      {/* Particles. */}
      {geom &&
        particlesRef.current.map((p, i) => {
          const a = 1 - p.life / p.max;
          return (
            <View
              key={`pt-${i}`}
              pointerEvents="none"
              style={{
                position: "absolute",
                left: p.x - p.size,
                top: p.y - p.size,
                width: p.size * 2,
                height: p.size * 2,
                borderRadius: p.size,
                backgroundColor: p.color,
                opacity: a,
              }}
            />
          );
        })}
    </View>
  );
}

function samplePath(points: Vec2[], n: number): Vec2[] {
  if (points.length <= n) return points;
  const out: Vec2[] = [];
  const step = points.length / n;
  for (let i = 0; i < n; i++) out.push(points[Math.floor(i * step)]);
  return out;
}

function powerColor(power: number): string {
  if (power < 0.45) return "#eafff0";
  if (power < 0.75) return "#ffe08a";
  return "#ff8f5e";
}

const styles = StyleSheet.create({
  field: { flex: 1, backgroundColor: "#2f9e54", overflow: "hidden" },
  stripe: { position: "absolute", left: 0, right: 0 },
  hazard: { position: "absolute", borderRadius: 14, borderWidth: 2, overflow: "hidden" },
  waterShine: {
    position: "absolute",
    left: "12%",
    top: "18%",
    width: "40%",
    height: "22%",
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  wall: {
    position: "absolute",
    backgroundColor: "#5a3d2b",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#3f2a1c",
  },
  holeRing: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
  },
  hole: {
    position: "absolute",
    backgroundColor: "#10321d",
    borderWidth: 2,
    borderColor: "#0a2314",
  },
  flagPole: { position: "absolute", width: 2, height: 36, backgroundColor: "#f0f0f0" },
  flag: { position: "absolute", width: 18, height: 12, backgroundColor: "#e23b3b" },
  ball: {
    position: "absolute",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cfcfcf",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
