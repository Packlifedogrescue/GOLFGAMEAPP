import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, Easing, StyleSheet } from "react-native";

const COLORS = ["#ffd447", "#ff6b6b", "#4dd4ac", "#5aa9ff", "#c084fc", "#fff"];

interface Piece {
  left: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  drift: number;
  rotate: number;
}

/**
 * Lightweight confetti burst for celebrations. Pure Animated (native driver),
 * no game loop — mounts, rains once, and is cheap to keep on screen.
 */
export default function Confetti({ count = 32 }: { count?: number }) {
  const { width, height } = Dimensions.get("window");
  const progress = useRef<Animated.Value[]>([]);

  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: count }).map(() => ({
        left: Math.random() * width,
        size: 7 + Math.random() * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 900,
        duration: 2200 + Math.random() * 1600,
        drift: (Math.random() - 0.5) * 120,
        rotate: Math.random() * 6,
      })),
    [count, width],
  );

  if (progress.current.length !== pieces.length) {
    progress.current = pieces.map(() => new Animated.Value(0));
  }

  useEffect(() => {
    const anims = pieces.map((p, i) =>
      Animated.loop(
        Animated.timing(progress.current[i], {
          toValue: 1,
          duration: p.duration,
          delay: p.delay,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        { iterations: 3 },
      ),
    );
    Animated.stagger(20, anims).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {pieces.map((p, i) => {
        const t = progress.current[i];
        const translateY = t.interpolate({
          inputRange: [0, 1],
          outputRange: [-40, height + 40],
        });
        const translateX = t.interpolate({
          inputRange: [0, 1],
          outputRange: [0, p.drift],
        });
        const rotate = t.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${p.rotate * 360}deg`],
        });
        const opacity = t.interpolate({
          inputRange: [0, 0.85, 1],
          outputRange: [1, 1, 0],
        });
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={[
              styles.piece,
              {
                left: p.left,
                width: p.size,
                height: p.size * 0.6,
                backgroundColor: p.color,
                opacity,
                transform: [{ translateY }, { translateX }, { rotate }],
              },
            ]}
          />
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  piece: { position: "absolute", top: 0, borderRadius: 2 },
});
