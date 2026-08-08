import { useCallback, useEffect, useState } from "react";
import type { AdventureSession, TokenPack, WalletSnapshot } from "@aetherpath/shared";
import { ChoiceBar } from "./components/ChoiceBar";
import { HoloWorld } from "./components/HoloWorld";
import { StoryFeed } from "./components/StoryFeed";
import { TokenGate } from "./components/TokenGate";
import {
  chooseAction,
  claimAdReward,
  getWallet,
  purchasePack,
  startAdventure,
} from "./lib/api";

export function App() {
  const [session, setSession] = useState<AdventureSession | null>(null);
  const [wallet, setWallet] = useState<WalletSnapshot | null>(null);
  const [packs, setPacks] = useState<TokenPack[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGate, setShowGate] = useState(false);

  const refreshWallet = useCallback(async () => {
    const data = await getWallet();
    setWallet(data.wallet);
    setPacks(data.packs);
    return data.wallet;
  }, []);

  const begin = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [{ session: next }, w] = await Promise.all([
        startAdventure({ playerName: "Wanderer", className: "Spellblade" }),
        refreshWallet(),
      ]);
      setSession({ ...next, tokensRemaining: w.tokens });
      setShowGate(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start adventure");
    } finally {
      setBusy(false);
    }
  }, [refreshWallet]);

  useEffect(() => {
    void begin();
  }, [begin]);

  const onChoose = async (choiceId: string) => {
    if (!session || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { session: next } = await chooseAction(session.id, choiceId);
      setSession(next);
      setWallet((prev) =>
        prev
          ? {
              ...prev,
              tokens: next.tokensRemaining,
              lifetimeSpent: prev.lifetimeSpent + (prev.tokens - next.tokensRemaining),
            }
          : prev,
      );
    } catch (e) {
      const err = e as Error & { status?: number; session?: AdventureSession };
      if (err.status === 402) {
        if (err.session) setSession(err.session);
        setShowGate(true);
        await refreshWallet();
      } else {
        setError(err.message || "Turn failed");
      }
    } finally {
      setBusy(false);
    }
  };

  const onBuy = async (packId: string) => {
    setBusy(true);
    setError(null);
    try {
      const { wallet: next } = await purchasePack(packId);
      setWallet(next);
      setSession((prev) =>
        prev
          ? { ...prev, tokensRemaining: next.tokens, status: "active" }
          : prev,
      );
      setShowGate(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setBusy(false);
    }
  };

  const onWatchAd = async () => {
    setBusy(true);
    setError(null);
    try {
      // Skeleton: simulate a short rewarded ad, then claim.
      await new Promise((r) => setTimeout(r, 900));
      const { wallet: next } = await claimAdReward(session?.id);
      setWallet(next);
      setSession((prev) =>
        prev
          ? { ...prev, tokensRemaining: next.tokens, status: "active" }
          : prev,
      );
      setShowGate(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ad reward failed");
    } finally {
      setBusy(false);
    }
  };

  if (!session || !wallet) {
    return (
      <div className="boot">
        <div className="boot-card">
          <h1>
            Aether<span>path</span>
          </h1>
          <p>Spinning up the vault…</p>
          {error ? <p className="error-text">{error}</p> : null}
          <button type="button" className="primary-btn" disabled={busy} onClick={() => void begin()}>
            Enter the dungeon
          </button>
        </div>
      </div>
    );
  }

  if (showGate || session.status === "awaiting_tokens") {
    return (
      <TokenGate
        wallet={wallet}
        packs={packs}
        busy={busy}
        onBuy={(id) => void onBuy(id)}
        onWatchAd={() => void onWatchAd()}
        onClose={() => setShowGate(false)}
      />
    );
  }

  return (
    <div className="app-shell">
      <div className="top-bar">
        <div className="brand">
          Aether<span>path</span>
        </div>
        <button
          type="button"
          className="token-chip"
          onClick={() => setShowGate(true)}
          aria-label="Open token wallet"
        >
          Tokens <strong>{session.tokensRemaining}</strong>
        </button>
      </div>

      <StoryFeed beats={session.beats} />
      <HoloWorld brief={session.holo} />
      <ChoiceBar
        choices={session.choices}
        disabled={busy}
        onChoose={(id) => void onChoose(id)}
      />

      {error ? (
        <p className="error-text" style={{ position: "absolute", bottom: "0.25rem", left: "1rem" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
