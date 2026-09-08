import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
} from "react-native";

import { LEVELS } from "./levels";
import {
  Field,
  Geom,
  buildGeom,
  maxShotSpeed,
  spawnBall,
  speed,
  stepBall,
} from "./physics";
import { Ball } from "./types";

interface Props {
  levelIndex: number;
  /** Called once the ball is holed, with the stroke count for this hole. */
  onHoleComplete: (strokes: number) => void;
  /** Reports the live stroke count so the HUD can display it. */
  onStrokes: (strokes: number) => void;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export default function GolfGame({ levelIndex, onHoleComplete, onStrokes }: Props) {
  const level = LEVELS[levelIndex];
  const [field, setField] = useState<Field | null>(null);
  const [, forceTick] = useState(0);
  const rerender = () => forceTick((n) => (n + 1) % 1000000);

  const geom = useMemo<Geom | null>(
    () => (field ? buildGeom(level, field) : null),
    [field, level],
  );

  const ballRef = useRef<Ball | null>(null);
  const strokesRef = useRef(0);
  const completedRef = useRef(false);
  const [aim, setAim] = useState<{ dx: number; dy: number } | null>(null);
  const [splash, setSplash] = useState(false);

  // (Re)spawn the ball whenever the hole or field geometry changes.
  useEffect(() => {
    if (!geom) return;
    ballRef.current = spawnBall(geom);
    strokesRef.current = 0;
    completedRef.current = false;
    onStrokes(0);
    setAim(null);
    rerender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geom]);

  // Physics loop.
  useEffect(() => {
    if (!geom) return;
    let raf = 0;
    let last: number | null = null;
    const tick = (t: number) => {
      if (last == null) last = t;
      let dt = (t - last) / 1000;
      last = t;
      dt = Math.min(dt, 1 / 30);
      const b = ballRef.current;
      if (b && b.moving && !b.sunk) {
        const ev = stepBall(b, dt, geom);
        if (ev.water) {
          strokesRef.current += 1; // penalty stroke
          onStrokes(strokesRef.current);
          setSplash(true);
          setTimeout(() => setSplash(false), 550);
        }
        if (ev.sank && !completedRef.current) {
          completedRef.current = true;
          const strokes = strokesRef.current;
          setTimeout(() => onHoleComplete(strokes), 350);
        }
        rerender();
      }
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
          setAim({ dx: 0, dy: 0 });
        },
        onPanResponderMove: (_e, g) => {
          const b = ballRef.current;
          if (!b || b.moving || b.sunk || completedRef.current) return;
          setAim({ dx: g.dx, dy: g.dy });
        },
        onPanResponderRelease: (_e, g) => {
          const b = ballRef.current;
          setAim(null);
          if (!b || !field || b.moving || b.sunk || completedRef.current) return;
          const len = Math.hypot(g.dx, g.dy);
          const power = clamp(len / maxDrag, 0, 1);
          if (power < 0.05) return; // too small, ignore tap
          // Slingshot: pull back to launch forward.
          const dirx = -g.dx / (len || 1);
          const diry = -g.dy / (len || 1);
          const sp = power * maxShotSpeed(field);
          b.vel = { x: dirx * sp, y: diry * sp };
          b.moving = true;
          strokesRef.current += 1;
          onStrokes(strokesRef.current);
        },
        onPanResponderTerminate: () => setAim(null),
      }),
    // maxDrag / field captured intentionally on mount-per-field
    [maxDrag, field],
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
  const aiming =
    aim && ball && !ball.moving && !ball.sunk ? computeAim(aim, maxDrag) : null;

  return (
    <View style={styles.field} onLayout={onLayout} {...pan.panHandlers}>
      {/* Mowing stripes for a bit of fairway texture. */}
      {field
        ? Array.from({ length: 10 }).map((_, i) => (
            <View
              key={`stripe-${i}`}
              style={[
                styles.stripe,
                {
                  top: (i / 10) * field.height,
                  height: field.height / 10,
                  backgroundColor:
                    i % 2 === 0 ? "rgba(255,255,255,0.05)" : "transparent",
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
          />
        ))}

      {geom &&
        geom.walls.map((w, i) => (
          <View
            key={`wall-${i}`}
            style={[
              styles.wall,
              { left: w.x, top: w.y, width: w.w, height: w.h },
            ]}
          />
        ))}

      {/* Hole + flag. */}
      {geom && (
        <>
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
              { left: geom.hole.x - 1, top: geom.hole.y - geom.holeR * 3.4 },
            ]}
          />
          <View
            style={[
              styles.flag,
              { left: geom.hole.x, top: geom.hole.y - geom.holeR * 3.4 },
            ]}
          />
        </>
      )}

      {/* Aim preview dots. */}
      {aiming && ball && geom
        ? Array.from({ length: 6 }).map((_, i) => {
            const t = (i + 1) / 6;
            const reach = aiming.power * 0.55 * (field?.width ?? 0);
            const px = ball.pos.x + aiming.dirx * reach * t;
            const py = ball.pos.y + aiming.diry * reach * t;
            const size = geom.ballR * (0.6 - t * 0.3);
            return (
              <View
                key={`aim-${i}`}
                style={{
                  position: "absolute",
                  left: px - size,
                  top: py - size,
                  width: size * 2,
                  height: size * 2,
                  borderRadius: size,
                  backgroundColor: powerColor(aiming.power),
                  opacity: 0.9 - t * 0.4,
                }}
              />
            );
          })
        : null}

      {/* The ball. */}
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
              opacity: ball.sunk ? 0.25 : 1,
            },
          ]}
        />
      )}

      {/* Water splash flash. */}
      {splash && geom && ball && (
        <View
          style={[
            styles.splash,
            {
              left: ball.pos.x - geom.ballR * 2,
              top: ball.pos.y - geom.ballR * 2,
              width: geom.ballR * 4,
              height: geom.ballR * 4,
              borderRadius: geom.ballR * 2,
            },
          ]}
        />
      )}
    </View>
  );
}

function computeAim(aim: { dx: number; dy: number }, maxDrag: number) {
  const len = Math.hypot(aim.dx, aim.dy);
  const power = clamp(len / maxDrag, 0, 1);
  return {
    power,
    dirx: -aim.dx / (len || 1),
    diry: -aim.dy / (len || 1),
  };
}

function powerColor(power: number): string {
  // green -> yellow -> red as power increases
  if (power < 0.5) return "#f4f4f4";
  if (power < 0.8) return "#ffe08a";
  return "#ff9d6e";
}

// keep speed import referenced for potential tuning / avoids unused warnings
void speed;

const styles = StyleSheet.create({
  field: {
    flex: 1,
    backgroundColor: "#2f9e54",
    overflow: "hidden",
  },
  stripe: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  hazard: {
    position: "absolute",
    borderRadius: 14,
    borderWidth: 2,
  },
  wall: {
    position: "absolute",
    backgroundColor: "#5a3d2b",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#3f2a1c",
  },
  hole: {
    position: "absolute",
    backgroundColor: "#10321d",
    borderWidth: 2,
    borderColor: "#0a2314",
  },
  flagPole: {
    position: "absolute",
    width: 2,
    height: 34,
    backgroundColor: "#e8e8e8",
  },
  flag: {
    position: "absolute",
    width: 18,
    height: 12,
    backgroundColor: "#e23b3b",
  },
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
  splash: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.85)",
  },
});
