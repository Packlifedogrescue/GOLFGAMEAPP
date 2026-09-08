import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { BALLS, BallSpec } from "./balls";
import { CLUBS, Club, nextCost } from "./clubs";
import { Economy } from "./economy";
import { COIN_PACKS, IAP_MODE, Product } from "./iap";

interface Props {
  econ: Economy;
  busyId: string | null;
  onEquip: (id: string) => void;
  onUnlock: (ball: BallSpec) => void;
  onUpgradeClub: (club: Club) => void;
  onBuyCoins: (product: Product) => void;
  onClose: () => void;
}

export default function Shop({
  econ,
  busyId,
  onEquip,
  onUnlock,
  onUpgradeClub,
  onBuyCoins,
  onClose,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>🏪 Pro Shop</Text>
        <View style={styles.coinPill}>
          <Text style={styles.coinText}>🪙 {econ.coins}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={hit}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.section}>Balls</Text>
        {BALLS.map((b) => (
          <BallCard
            key={b.id}
            ball={b}
            econ={econ}
            busy={busyId === b.id || busyId === productIdOf(b)}
            onEquip={onEquip}
            onUnlock={onUnlock}
          />
        ))}

        <Text style={styles.section}>Clubs</Text>
        <Text style={styles.sectionSub}>
          Permanent upgrades that boost every shot, with any ball.
        </Text>
        {CLUBS.map((c) => (
          <ClubCard key={c.id} club={c} econ={econ} onUpgrade={onUpgradeClub} />
        ))}

        <Text style={styles.section}>Coins</Text>
        <Text style={styles.sectionSub}>
          Earn coins by playing well — or top up here.
        </Text>
        <View style={styles.coinGrid}>
          {COIN_PACKS.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.coinCard}
              activeOpacity={0.85}
              disabled={busyId != null}
              onPress={() => onBuyCoins(p)}
            >
              {busyId === p.id ? (
                <ActivityIndicator color="#0b6e3b" />
              ) : (
                <>
                  <Text style={styles.coinAmt}>🪙 {p.coins}</Text>
                  <View style={styles.priceTag}>
                    <Text style={styles.priceText}>{p.price}</Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {IAP_MODE === "sandbox" && (
          <Text style={styles.sandboxNote}>
            Demo mode: premium purchases are simulated and do not charge real
            money. Connect App Store / Google Play billing before release.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

function BallCard({
  ball,
  econ,
  busy,
  onEquip,
  onUnlock,
}: {
  ball: BallSpec;
  econ: Economy;
  busy: boolean;
  onEquip: (id: string) => void;
  onUnlock: (ball: BallSpec) => void;
}) {
  const owned = econ.owned.includes(ball.id);
  const equipped = econ.equipped === ball.id;

  return (
    <View style={[styles.card, equipped && styles.cardEquipped]}>
      <View style={styles.cardTop}>
        <BallPreview ball={ball} />
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.ballName}>{ball.name}</Text>
            {ball.waterproof && <Text style={styles.badge}>💧 Waterproof</Text>}
          </View>
          <Text style={styles.blurb}>{ball.blurb}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <Stat label="Power" value={ball.power} lo={0.8} hi={1.5} />
        <Stat label="Roll" value={ball.roll} lo={0.6} hi={1.4} />
        <Stat label="Bounce" value={ball.bounce} lo={0.4} hi={1.5} />
        <Stat label="Magnet" value={ball.magnet} lo={0.8} hi={2.2} />
      </View>

      <View style={styles.actionRow}>
        {equipped ? (
          <View style={[styles.actionBtn, styles.equippedBtn]}>
            <Text style={styles.equippedLabel}>✓ Equipped</Text>
          </View>
        ) : owned ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.equipBtn]}
            onPress={() => onEquip(ball.id)}
          >
            <Text style={styles.equipLabel}>Equip</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, styles.buyBtn]}
            disabled={busy}
            onPress={() => onUnlock(ball)}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buyLabel}>{unlockLabel(ball)}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function ClubCard({
  club,
  econ,
  onUpgrade,
}: {
  club: Club;
  econ: Economy;
  onUpgrade: (club: Club) => void;
}) {
  const level = econ.clubLevels[club.id] ?? 0;
  const cost = nextCost(club, level);
  const maxed = cost == null;
  const pct = (n: number) => Math.round(n * club.perLevel * 100);
  const affordable = cost != null && econ.coins >= cost;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.clubIcon}>
          <Text style={{ fontSize: 26 }}>{club.emoji}</Text>
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.ballName}>{club.name}</Text>
            <Text style={styles.levelTag}>
              Lv {level}/{club.maxLevel}
            </Text>
          </View>
          <Text style={styles.blurb}>{club.blurb}</Text>
        </View>
      </View>

      <View style={styles.pips}>
        {Array.from({ length: club.maxLevel }).map((_, i) => (
          <View
            key={i}
            style={[styles.pip, i < level ? styles.pipOn : styles.pipOff]}
          />
        ))}
      </View>

      <View style={styles.actionRow}>
        <View style={styles.clubEffect}>
          <Text style={styles.clubEffectText}>
            {maxed
              ? `${club.stat} +${pct(level)}% · Maxed`
              : `Now +${pct(level)}% → Next +${pct(level + 1)}% ${club.stat}`}
          </Text>
        </View>
        {maxed ? (
          <View style={[styles.upgradeBtn, styles.maxBtn]}>
            <Text style={styles.maxLabel}>MAX</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.upgradeBtn, affordable ? styles.buyBtn : styles.buyBtnDim]}
            onPress={() => onUpgrade(club)}
          >
            <Text style={styles.buyLabel}>🪙 {cost}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function BallPreview({ ball }: { ball: BallSpec }) {
  return (
    <View style={[styles.preview, { backgroundColor: ball.body }]}>
      <View style={[styles.previewDimple, { backgroundColor: ball.accent }]} />
      <View style={styles.previewShine} />
    </View>
  );
}

function Stat({
  label,
  value,
  lo,
  hi,
}: {
  label: string;
  value: number;
  lo: number;
  hi: number;
}) {
  const fill = Math.max(0.05, Math.min(1, (value - lo) / (hi - lo)));
  const strong = value >= 1.15;
  const weak = value < 0.9;
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statTrack}>
        <View
          style={[
            styles.statFill,
            {
              width: `${fill * 100}%`,
              backgroundColor: strong ? "#2f9e54" : weak ? "#d98a3f" : "#7bbf94",
            },
          ]}
        />
      </View>
    </View>
  );
}

function unlockLabel(ball: BallSpec): string {
  if (ball.unlock.type === "coins") return `🪙 ${ball.unlock.amount}`;
  if (ball.unlock.type === "iap") return `Buy ${ball.unlock.price}`;
  return "Get";
}

function productIdOf(ball: BallSpec): string {
  return ball.unlock.type === "iap" ? ball.unlock.productId : ball.id;
}

const hit = { top: 10, bottom: 10, left: 10, right: 10 };

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0b6e3b" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { color: "#fff", fontSize: 22, fontWeight: "900", flex: 1 },
  coinPill: {
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    marginRight: 10,
  },
  coinText: { color: "#ffe9a8", fontWeight: "800", fontSize: 15 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  scroll: { padding: 16, paddingBottom: 40 },
  section: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionSub: { color: "#bfe9cd", fontSize: 13, marginBottom: 12, marginTop: -4 },
  card: {
    backgroundColor: "#fbfbf7",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  cardEquipped: { borderWidth: 2, borderColor: "#ffd447" },
  cardTop: { flexDirection: "row", alignItems: "center" },
  preview: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
    overflow: "hidden",
  },
  previewDimple: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.7,
  },
  previewShine: {
    position: "absolute",
    left: 10,
    top: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  ballName: { fontSize: 18, fontWeight: "800", color: "#1a1a1a", marginRight: 8 },
  badge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1f6199",
    backgroundColor: "#dcefff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  blurb: { fontSize: 13, color: "#555", marginTop: 3 },
  stats: { marginTop: 12, marginBottom: 10 },
  statRow: { flexDirection: "row", alignItems: "center", marginVertical: 3 },
  statLabel: { width: 58, fontSize: 12, color: "#666", fontWeight: "600" },
  statTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "#e6e6e0",
    borderRadius: 4,
    overflow: "hidden",
  },
  statFill: { height: 8, borderRadius: 4 },
  actionRow: { flexDirection: "row" },
  actionBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  equippedBtn: { backgroundColor: "#eef7f0", borderWidth: 1.5, borderColor: "#2f9e54" },
  equippedLabel: { color: "#0b6e3b", fontWeight: "800", fontSize: 15 },
  equipBtn: { backgroundColor: "#0b6e3b" },
  equipLabel: { color: "#fff", fontWeight: "800", fontSize: 15 },
  buyBtn: { backgroundColor: "#d98200" },
  buyBtnDim: { backgroundColor: "#e0a94d" },
  buyLabel: { color: "#fff", fontWeight: "800", fontSize: 15 },
  clubIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    marginRight: 14,
    backgroundColor: "#eef2ee",
    alignItems: "center",
    justifyContent: "center",
  },
  levelTag: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0b6e3b",
    backgroundColor: "#e5f2ea",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  pips: { flexDirection: "row", marginTop: 12, marginBottom: 10 },
  pip: { flex: 1, height: 8, borderRadius: 4, marginHorizontal: 2 },
  pipOn: { backgroundColor: "#2f9e54" },
  pipOff: { backgroundColor: "#e6e6e0" },
  clubEffect: { flex: 1, justifyContent: "center", paddingRight: 10 },
  clubEffectText: { fontSize: 12, color: "#555", fontWeight: "600" },
  upgradeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 92,
    minHeight: 44,
  },
  maxBtn: { backgroundColor: "#eef7f0", borderWidth: 1.5, borderColor: "#2f9e54" },
  maxLabel: { color: "#0b6e3b", fontWeight: "800", fontSize: 15 },
  coinGrid: { flexDirection: "row", justifyContent: "space-between" },
  coinCard: {
    flex: 1,
    backgroundColor: "#fbfbf7",
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    marginHorizontal: 4,
    minHeight: 92,
    justifyContent: "center",
  },
  coinAmt: { fontSize: 16, fontWeight: "800", color: "#1a1a1a" },
  priceTag: {
    marginTop: 8,
    backgroundColor: "#0b6e3b",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  priceText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  sandboxNote: {
    color: "#bfe9cd",
    fontSize: 11,
    marginTop: 18,
    textAlign: "center",
    lineHeight: 16,
  },
});
