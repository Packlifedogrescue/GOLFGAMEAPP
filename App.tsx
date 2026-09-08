import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Confetti from "./src/Confetti";
import GolfGame from "./src/GolfGame";
import Shop from "./src/Shop";
import { BallSpec, getBall } from "./src/balls";
import { Club, computeUpgrades, nextCost } from "./src/clubs";
import {
  Economy,
  coinsForHole,
  coinsForRound,
  defaultEconomy,
  loadEconomy,
  saveEconomy,
} from "./src/economy";
import { initFeedback, play, toggleMuted } from "./src/feedback";
import { Product, purchase } from "./src/iap";
import { LEVELS } from "./src/levels";
import { Bests, loadBests, recordRound } from "./src/storage";
import { HoleResult } from "./src/types";

type Phase = "title" | "playing" | "holeComplete" | "roundComplete";

const LOGO = require("./assets/logo.png");

export default function App() {
  const [phase, setPhase] = useState<Phase>("title");
  const [holeIndex, setHoleIndex] = useState(0);
  const [strokes, setStrokes] = useState(0);
  const [results, setResults] = useState<HoleResult[]>([]);
  const [bests, setBests] = useState<Bests | null>(null);
  const [newRecord, setNewRecord] = useState(false);
  const [muted, setMuted] = useState(false);
  const [econ, setEcon] = useState<Economy>(defaultEconomy());
  const [showShop, setShowShop] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lastCoins, setLastCoins] = useState(0);

  const level = LEVELS[holeIndex];
  const equipped: BallSpec = useMemo(() => getBall(econ.equipped), [econ.equipped]);
  const upgrades = useMemo(() => computeUpgrades(econ.clubLevels), [econ.clubLevels]);

  useEffect(() => {
    initFeedback();
    loadBests().then(setBests);
    loadEconomy().then(setEcon);
  }, []);

  const totalToPar = useMemo(
    () => results.reduce((a, r) => a + (r.strokes - r.par), 0),
    [results],
  );

  // --- economy helpers (persist on every change) ---------------------------
  const persist = (next: Economy) => {
    setEcon(next);
    saveEconomy(next);
  };
  const addCoins = (amt: number) =>
    setEcon((prev) => {
      const next = { ...prev, coins: prev.coins + amt };
      saveEconomy(next);
      return next;
    });

  const startRound = () => {
    setResults([]);
    setHoleIndex(0);
    setStrokes(0);
    setNewRecord(false);
    setLastCoins(0);
    setPhase("playing");
  };

  const onHoleComplete = useCallback(
    (holeStrokes: number) => {
      const entry: HoleResult = {
        name: level.name,
        par: level.par,
        strokes: holeStrokes,
      };
      const nextResults = [...results, entry];
      setResults(nextResults);
      const holeCoins = coinsForHole(entry);

      if (holeIndex + 1 >= LEVELS.length) {
        setPhase("roundComplete");
        play("cheer");
        const strokesByHole = nextResults.map((r) => r.strokes);
        loadBests().then((prev) =>
          recordRound(prev, strokesByHole).then(({ bests: b, newTotalRecord }) => {
            setBests(b);
            setNewRecord(newTotalRecord);
            const roundCoins = holeCoins + coinsForRound(newTotalRecord);
            setLastCoins(roundCoins);
            addCoins(roundCoins);
          }),
        );
      } else {
        setPhase("holeComplete");
        setLastCoins(holeCoins);
        addCoins(holeCoins);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [holeIndex, level, results],
  );

  const nextHole = () => {
    setHoleIndex((i) => i + 1);
    setStrokes(0);
    setPhase("playing");
  };

  const onToggleMute = () => setMuted(toggleMuted());

  // --- shop actions --------------------------------------------------------
  const equip = (id: string) => persist({ ...econ, equipped: id });

  const unlock = (ball: BallSpec) => {
    if (ball.unlock.type === "coins") {
      const amt = ball.unlock.amount;
      if (econ.coins < amt) {
        Alert.alert(
          "Not enough coins",
          `You need ${amt - econ.coins} more coins. Earn coins by playing well, or grab a coin pack in the shop.`,
        );
        return;
      }
      const owned = econ.owned.includes(ball.id)
        ? econ.owned
        : [...econ.owned, ball.id];
      persist({ ...econ, coins: econ.coins - amt, owned, equipped: ball.id });
    } else if (ball.unlock.type === "iap") {
      const pid = ball.unlock.productId;
      setBusyId(pid);
      purchase(pid).then((res) => {
        setBusyId(null);
        if (res.success) {
          setEcon((prev) => {
            const owned = prev.owned.includes(ball.id)
              ? prev.owned
              : [...prev.owned, ball.id];
            const next = { ...prev, owned, equipped: ball.id };
            saveEconomy(next);
            return next;
          });
        } else if (!res.cancelled) {
          Alert.alert("Purchase failed", res.error ?? "Please try again.");
        }
      });
    }
  };

  const upgradeClub = (club: Club) => {
    const level = econ.clubLevels[club.id] ?? 0;
    const cost = nextCost(club, level);
    if (cost == null) return; // maxed
    if (econ.coins < cost) {
      Alert.alert(
        "Not enough coins",
        `You need ${cost - econ.coins} more coins to upgrade your ${club.name}. Earn coins by playing, or grab a coin pack.`,
      );
      return;
    }
    persist({
      ...econ,
      coins: econ.coins - cost,
      clubLevels: { ...econ.clubLevels, [club.id]: level + 1 },
    });
  };

  const buyCoins = (product: Product) => {
    setBusyId(product.id);
    purchase(product.id).then((res) => {
      setBusyId(null);
      if (res.success && product.coins) {
        addCoins(product.coins);
      } else if (!res.cancelled) {
        Alert.alert("Purchase failed", res.error ?? "Please try again.");
      }
    });
  };

  const last = results[results.length - 1];

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />

      {/* HUD */}
      <View style={styles.hud}>
        <View style={styles.hudLeft}>
          <Text style={styles.holeName} numberOfLines={1}>
            {level.name}
          </Text>
          <Text style={styles.hudSub}>
            Hole {holeIndex + 1}/{LEVELS.length} · Par {level.par}
          </Text>
        </View>
        <View style={styles.hudRight}>
          <Text style={styles.strokes}>{strokes}</Text>
          <Text style={styles.hudSub}>strokes · {formatToPar(totalToPar)}</Text>
        </View>
        <TouchableOpacity style={styles.coinPill} onPress={() => setShowShop(true)}>
          <Text style={styles.coinText}>🪙 {econ.coins}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={onToggleMute} hitSlop={hit}>
          <Text style={styles.iconTxt}>{muted ? "🔇" : "🔊"}</Text>
        </TouchableOpacity>
      </View>

      {/* Play field (overlays sit on top). */}
      <View style={styles.stage}>
        {phase !== "title" && (
          <GolfGame
            key={holeIndex}
            levelIndex={holeIndex}
            ball={equipped}
            upgrades={upgrades}
            onHoleComplete={onHoleComplete}
            onStrokes={setStrokes}
          />
        )}

        {phase === "title" && (
          <LinearGradient colors={["#12294a", "#081226"]} style={[styles.field, styles.center]}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
            <Text style={styles.tagline}>
              18 holes · drag back to aim, release to swing
            </Text>
            {bests?.total != null && (
              <Text style={styles.bestLine}>
                🏆 Best round: {bests.total} ({formatToPar(bestTotalToPar(bests))})
              </Text>
            )}
            <PrimaryButton label="Start Round" onPress={startRound} />
            <SecondaryButton
              label={`🏪 Pro Shop · 🪙 ${econ.coins}`}
              onPress={() => setShowShop(true)}
            />
          </LinearGradient>
        )}

        {phase === "holeComplete" && last && (
          <Overlay>
            <Text style={styles.scoreTerm}>{scoreTerm(last)}</Text>
            <Text style={styles.overlayBig}>{last.strokes} strokes</Text>
            <Text style={styles.coinsEarned}>+{lastCoins} 🪙</Text>
            <Text style={styles.overlaySub}>
              Par {last.par} · Round {formatToPar(totalToPar)}
            </Text>
            <PrimaryButton label="Next Hole →" onPress={nextHole} />
            <SecondaryButton label="🏪 Shop" onPress={() => setShowShop(true)} />
          </Overlay>
        )}

        {phase === "roundComplete" && (
          <Overlay>
            <Confetti />
            {newRecord && <Text style={styles.recordBanner}>🎉 NEW BEST ROUND! 🎉</Text>}
            <Text style={styles.scoreTerm}>Round Complete!</Text>
            <Text style={styles.coinsEarned}>+{lastCoins} 🪙 earned</Text>
            <Scorecard results={results} totalToPar={totalToPar} />
            <PrimaryButton label="Play Again" onPress={startRound} />
            <SecondaryButton label="🏪 Pro Shop" onPress={() => setShowShop(true)} />
          </Overlay>
        )}
      </View>

      {phase === "playing" && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>
            Drag back from the ball to aim & set power, then release. The dotted
            line turns green when you'll sink it!
          </Text>
        </View>
      )}

      {showShop && (
        <Shop
          econ={econ}
          busyId={busyId}
          onEquip={equip}
          onUnlock={unlock}
          onUpgradeClub={upgradeClub}
          onBuyCoins={buyCoins}
          onClose={() => setShowShop(false)}
        />
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

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.button2} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.button2Text}>{label}</Text>
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
      <ScrollView style={{ maxHeight: 220 }}>
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

function bestTotalToPar(bests: Bests): number {
  const par = LEVELS.reduce((a, l) => a + l.par, 0);
  return (bests.total ?? par) - par;
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

const hit = { top: 12, bottom: 12, left: 12, right: 12 };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b6e3b" },
  hud: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#0b6e3b",
  },
  hudLeft: { flexShrink: 1, flexGrow: 1 },
  hudRight: { alignItems: "flex-end", marginHorizontal: 10 },
  holeName: { color: "#fff", fontSize: 17, fontWeight: "800" },
  hudSub: { color: "#cdeed7", fontSize: 12, marginTop: 2 },
  strokes: { color: "#fff", fontSize: 24, fontWeight: "800", lineHeight: 26 },
  coinPill: {
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  coinText: { color: "#ffe9a8", fontWeight: "800", fontSize: 13 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconTxt: { fontSize: 17 },
  stage: { flex: 1 },
  field: { ...StyleSheet.absoluteFillObject, backgroundColor: "#2f9e54" },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  logo: { width: "94%", height: 150, marginBottom: 6 },
  overlay: {
    backgroundColor: "rgba(6, 46, 26, 0.74)",
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
  tagline: {
    color: "#dff5e6",
    fontSize: 15,
    marginTop: 4,
    marginBottom: 16,
    textAlign: "center",
  },
  bestLine: { color: "#ffe9a8", fontSize: 15, fontWeight: "700", marginBottom: 22 },
  scoreTerm: {
    fontSize: 30,
    fontWeight: "900",
    color: "#0b6e3b",
    marginBottom: 6,
    textAlign: "center",
  },
  recordBanner: {
    fontSize: 16,
    fontWeight: "900",
    color: "#d98200",
    marginBottom: 8,
    textAlign: "center",
  },
  overlayBig: { fontSize: 22, fontWeight: "700", color: "#222" },
  coinsEarned: { fontSize: 18, fontWeight: "800", color: "#d98200", marginTop: 6 },
  overlaySub: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
    marginBottom: 18,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#0b6e3b",
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 6,
    minWidth: 220,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  button2: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 26,
    marginTop: 10,
    backgroundColor: "#eef7f0",
    minWidth: 220,
    alignItems: "center",
  },
  button2Text: { color: "#0b6e3b", fontSize: 15, fontWeight: "800" },
  hint: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: "#0b6e3b" },
  hintText: { color: "#bfe9cd", fontSize: 12, textAlign: "center" },
  scorecard: { width: "100%", marginVertical: 12 },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  scoreHeader: { borderBottomWidth: 2, borderBottomColor: "#0b6e3b" },
  scoreHeadText: { fontSize: 11, fontWeight: "800", color: "#0b6e3b" },
  scoreTotal: {
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: "#0b6e3b",
    marginTop: 4,
    paddingTop: 8,
  },
  scoreCell: { flex: 1, fontSize: 13, color: "#333" },
  scoreCellNum: { width: 42, textAlign: "center", fontSize: 13, color: "#333" },
});
