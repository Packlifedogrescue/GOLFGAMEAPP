import { StatusBar } from "expo-status-bar";
import React, { useCallback, useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import GolfGame from "./src/GolfGame";
import { LEVELS } from "./src/levels";
import { HoleResult } from "./src/types";

type Phase = "title" | "playing" | "holeComplete" | "roundComplete";

export default function App() {
  const [phase, setPhase] = useState<Phase>("title");
  const [holeIndex, setHoleIndex] = useState(0);
  const [strokes, setStrokes] = useState(0);
  const [results, setResults] = useState<HoleResult[]>([]);

  const level = LEVELS[holeIndex];

  const totalToPar = useMemo(() => {
    const played = results.reduce((a, r) => a + (r.strokes - r.par), 0);
    return played;
  }, [results]);

  const startRound = () => {
    setResults([]);
    setHoleIndex(0);
    setStrokes(0);
    setPhase("playing");
  };

  const onHoleComplete = useCallback(
    (holeStrokes: number) => {
      setResults((prev) => [
        ...prev,
        { name: level.name, par: level.par, strokes: holeStrokes },
      ]);
      setPhase(holeIndex + 1 >= LEVELS.length ? "roundComplete" : "holeComplete");
    },
    [holeIndex, level],
  );

  const nextHole = () => {
    setHoleIndex((i) => i + 1);
    setStrokes(0);
    setPhase("playing");
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />

      {/* HUD */}
      <View style={styles.hud}>
        <View style={styles.hudLeft}>
          <Text style={styles.holeName}>{level.name}</Text>
          <Text style={styles.hudSub}>
            Hole {holeIndex + 1}/{LEVELS.length} · Par {level.par}
          </Text>
        </View>
        <View style={styles.hudRight}>
          <Text style={styles.strokes}>{strokes}</Text>
          <Text style={styles.hudSub}>strokes · {formatToPar(totalToPar)}</Text>
        </View>
      </View>

      {/* Play field (kept mounted; overlays sit on top). */}
      <View style={styles.stage}>
        {phase !== "title" && (
          <GolfGame
            key={holeIndex}
            levelIndex={holeIndex}
            onHoleComplete={onHoleComplete}
            onStrokes={setStrokes}
          />
        )}

        {phase === "title" && (
          <View style={[styles.field, styles.center]}>
            <Text style={styles.bigTitle}>ZappyGolf</Text>
            <Text style={styles.tagline}>18 holes · drag back to aim, release to swing</Text>
            <PrimaryButton label="Start Round" onPress={startRound} />
          </View>
        )}

        {phase === "holeComplete" && (
          <Overlay>
            <Text style={styles.scoreTerm}>
              {scoreTerm(results[results.length - 1])}
            </Text>
            <Text style={styles.overlayBig}>
              {results[results.length - 1].strokes} strokes
            </Text>
            <Text style={styles.overlaySub}>
              Par {results[results.length - 1].par} · Round {formatToPar(totalToPar)}
            </Text>
            <PrimaryButton label="Next Hole →" onPress={nextHole} />
          </Overlay>
        )}

        {phase === "roundComplete" && (
          <Overlay>
            <Text style={styles.scoreTerm}>Round Complete!</Text>
            <Scorecard results={results} totalToPar={totalToPar} />
            <PrimaryButton label="Play Again" onPress={startRound} />
          </Overlay>
        )}
      </View>

      {phase === "playing" && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>
            Drag back from the ball to aim & set power, then release.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <View style={[styles.field, styles.overlay]}>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

function Scorecard({
  results,
  totalToPar,
}: {
  results: HoleResult[];
  totalToPar: number;
}) {
  const totalStrokes = results.reduce((a, r) => a + r.strokes, 0);
  const totalPar = results.reduce((a, r) => a + r.par, 0);
  return (
    <View style={styles.scorecard}>
      <View style={[styles.scoreRow, styles.scoreHeader]}>
        <Text style={[styles.scoreCell, styles.scoreHeadText]}>HOLE</Text>
        <Text style={[styles.scoreCellNum, styles.scoreHeadText]}>PAR</Text>
        <Text style={[styles.scoreCellNum, styles.scoreHeadText]}>YOU</Text>
        <Text style={[styles.scoreCellNum, styles.scoreHeadText]}>+/-</Text>
      </View>
      <ScrollView style={{ maxHeight: 240 }}>
        {results.map((r, i) => (
          <View key={i} style={styles.scoreRow}>
            <Text style={styles.scoreCell} numberOfLines={1}>
              {r.name}
            </Text>
            <Text style={styles.scoreCellNum}>{r.par}</Text>
            <Text style={styles.scoreCellNum}>{r.strokes}</Text>
            <Text
              style={[
                styles.scoreCellNum,
                { color: diffColor(r.strokes - r.par), fontWeight: "700" },
              ]}
            >
              {formatToPar(r.strokes - r.par)}
            </Text>
          </View>
        ))}
      </ScrollView>
      <View style={[styles.scoreRow, styles.scoreTotal]}>
        <Text style={[styles.scoreCell, { fontWeight: "800" }]}>TOTAL</Text>
        <Text style={[styles.scoreCellNum, { fontWeight: "800" }]}>{totalPar}</Text>
        <Text style={[styles.scoreCellNum, { fontWeight: "800" }]}>{totalStrokes}</Text>
        <Text
          style={[
            styles.scoreCellNum,
            { fontWeight: "800", color: diffColor(totalToPar) },
          ]}
        >
          {formatToPar(totalToPar)}
        </Text>
      </View>
    </View>
  );
}

function formatToPar(diff: number): string {
  if (diff === 0) return "E";
  return diff > 0 ? `+${diff}` : `${diff}`;
}

function diffColor(diff: number): string {
  if (diff < 0) return "#d64545";
  if (diff > 0) return "#2b2b2b";
  return "#0b6e3b";
}

function scoreTerm(r: HoleResult): string {
  if (r.strokes === 1) return "Hole in One! ⛳";
  const d = r.strokes - r.par;
  if (d <= -3) return "Albatross!";
  if (d === -2) return "Eagle!";
  if (d === -1) return "Birdie!";
  if (d === 0) return "Par";
  if (d === 1) return "Bogey";
  if (d === 2) return "Double Bogey";
  return `+${d}`;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0b6e3b",
  },
  hud: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#0b6e3b",
  },
  hudLeft: { flexShrink: 1 },
  hudRight: { alignItems: "flex-end" },
  holeName: { color: "#fff", fontSize: 18, fontWeight: "800" },
  hudSub: { color: "#cdeed7", fontSize: 12, marginTop: 2 },
  strokes: { color: "#fff", fontSize: 26, fontWeight: "800", lineHeight: 28 },
  stage: { flex: 1 },
  field: { ...StyleSheet.absoluteFillObject, backgroundColor: "#2f9e54" },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  overlay: {
    backgroundColor: "rgba(6, 46, 26, 0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#fbfbf7",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    width: "100%",
    maxWidth: 380,
  },
  bigTitle: { color: "#fff", fontSize: 44, fontWeight: "900", letterSpacing: 1 },
  tagline: { color: "#dff5e6", fontSize: 15, marginTop: 8, marginBottom: 28, textAlign: "center" },
  scoreTerm: { fontSize: 30, fontWeight: "900", color: "#0b6e3b", marginBottom: 6, textAlign: "center" },
  overlayBig: { fontSize: 22, fontWeight: "700", color: "#222" },
  overlaySub: { fontSize: 14, color: "#555", marginTop: 4, marginBottom: 20 },
  button: {
    backgroundColor: "#0b6e3b",
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 6,
  },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  hint: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#0b6e3b",
  },
  hintText: { color: "#bfe9cd", fontSize: 12, textAlign: "center" },
  scorecard: { width: "100%", marginVertical: 14 },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  scoreTotal: { borderBottomWidth: 0, borderTopWidth: 2, borderTopColor: "#0b6e3b", marginTop: 4, paddingTop: 8 },
  scoreHeader: { borderBottomWidth: 2, borderBottomColor: "#0b6e3b" },
  scoreHeadText: { fontSize: 11, fontWeight: "800", color: "#0b6e3b" },
  scoreCell: { flex: 1, fontSize: 13, color: "#333" },
  scoreCellNum: { width: 42, textAlign: "center", fontSize: 13, color: "#333" },
});
