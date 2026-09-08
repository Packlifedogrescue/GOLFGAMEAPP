import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

/**
 * ZappyGolf native shell.
 *
 * The full game — the real 18-hole course, physics, pro shop, balls, club
 * upgrades, daily challenge, leaderboard and weather — runs as a self-contained
 * canvas engine in `assets/game.html`. This native app hosts that engine in a
 * WebView so the App Store build is the exact game we ship on the web, with one
 * codebase to maintain.
 *
 * A stable https `baseUrl` gives the page a real origin so its localStorage
 * (coins, unlocks, upgrades, best scores, daily streak) persists between
 * launches. The onMessage bridge is where native StoreKit / Play Billing will
 * fulfil real in-app purchases (the page posts a product id; native completes
 * the purchase and calls back). See README for the wiring plan.
 */

const GAME = require("./assets/game.html");
const BASE_URL = "https://zappygolf.app/";

export default function App() {
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const asset = Asset.fromModule(GAME);
        await asset.downloadAsync();
        const uri = asset.localUri || asset.uri;
        const source = await FileSystem.readAsStringAsync(uri);
        setHtml(source);
      } catch {
        setFailed(true);
      }
    })();
  }, []);

  const onMessage = (_e: WebViewMessageEvent) => {
    // Reserved for the native IAP bridge: parse a { type, productId } message
    // from the page, run the real store purchase, then post the result back.
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      {html ? (
        <WebView
          originWhitelist={["*"]}
          source={{ html, baseUrl: BASE_URL }}
          style={styles.web}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          setSupportMultipleWindows={false}
          onMessage={onMessage}
          // Keep the WebGL/canvas loop smooth and the page fixed to the frame.
          androidLayerType="hardware"
        />
      ) : (
        <View style={styles.center}>
          {failed ? (
            <Text style={styles.err}>Couldn&apos;t load the course. Please relaunch.</Text>
          ) : (
            <ActivityIndicator color="#38d9ff" size="large" />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a1730" },
  web: { flex: 1, backgroundColor: "#0a1730" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0a1730" },
  err: { color: "#eaf3ff", fontSize: 15, textAlign: "center", padding: 24 },
});
