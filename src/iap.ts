/**
 * In-app purchase layer.
 *
 * IMPORTANT: Real money purchases require a native build (EAS) plus products
 * configured in App Store Connect / Google Play Console and a billing library
 * such as `react-native-iap` or Expo's StoreKit module. Those cannot run in
 * Expo Go and are not wired here.
 *
 * To keep the game fully playable and testable now, this module ships a
 * **sandbox provider** that simulates a successful purchase WITHOUT charging
 * anyone. `IAP_MODE` reports which provider is active so the UI can label
 * premium actions honestly ("Demo purchase") until real billing is connected.
 *
 * ── Wiring real billing ─────────────────────────────────────────────────────
 * 1. `npx expo install react-native-iap` (and add the config plugin).
 * 2. Build with EAS: `eas build -p ios` / `-p android`.
 * 3. Create the product IDs below in the store consoles.
 * 4. Replace `sandboxPurchase` with a real provider that calls
 *    `requestPurchase` / `finishTransaction` and verifies the receipt server
 *    side, then set IAP_MODE to "store".
 */

export type ProductKind = "ball" | "coins";

export interface Product {
  id: string;
  kind: ProductKind;
  price: string;
  /** For coin packs: how many coins to grant. */
  coins?: number;
  /** For balls: the ball id to unlock. */
  ballId?: string;
}

export const PRODUCTS: Product[] = [
  { id: "com.zappygolf.ball.aqua", kind: "ball", price: "$1.99", ballId: "aqua" },
  { id: "com.zappygolf.ball.titan", kind: "ball", price: "$2.99", ballId: "titan" },
  { id: "com.zappygolf.ball.nova", kind: "ball", price: "$3.99", ballId: "nova" },
  { id: "com.zappygolf.coins.small", kind: "coins", price: "$0.99", coins: 600 },
  { id: "com.zappygolf.coins.medium", kind: "coins", price: "$2.99", coins: 2200 },
  { id: "com.zappygolf.coins.large", kind: "coins", price: "$9.99", coins: 9000 },
];

export const COIN_PACKS = PRODUCTS.filter((p) => p.kind === "coins");

export type IapMode = "sandbox" | "store";

/** Which provider is live. Flip to "store" once real billing is connected. */
export const IAP_MODE: IapMode = "sandbox";

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export interface PurchaseResult {
  success: boolean;
  cancelled?: boolean;
  error?: string;
}

/** Simulated purchase — always succeeds, never charges. Sandbox only. */
async function sandboxPurchase(productId: string): Promise<PurchaseResult> {
  await new Promise((r) => setTimeout(r, 450)); // mimic the store dialog latency
  if (!getProduct(productId)) {
    return { success: false, error: "Unknown product" };
  }
  return { success: true };
}

/**
 * Kick off a purchase for the given product id. Returns whether it succeeded so
 * the caller can grant the entitlement. In sandbox mode nothing is charged.
 */
export async function purchase(productId: string): Promise<PurchaseResult> {
  // When real billing is wired, branch on IAP_MODE here and call the store.
  return sandboxPurchase(productId);
}
