import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AdventureSession,
  CharacterAppearance,
  HoloSceneBrief,
  StoryBeat,
  TokenPack,
  WalletSnapshot,
} from "@aetherpath/shared";
import {
  APPEARANCE_PRESETS,
  DEFAULT_APPEARANCE,
} from "@aetherpath/shared";
import { ChoiceBar } from "./components/ChoiceBar";
import { CreateBar } from "./components/CreateBar";
import { HoloWorld } from "./components/HoloWorld";
import { RunEndOverlay } from "./components/RunEndOverlay";
import { StatusBar } from "./components/StatusBar";
import { StoryFeed } from "./components/StoryFeed";
import { TokenGate } from "./components/TokenGate";
import {
  chooseAction,
  claimAdReward,
  getWallet,
  purchasePack,
  startAdventure,
} from "./lib/api";
import { playCue, setSoundEnabled } from "./lib/sound";

const CREATION_BEAT: StoryBeat = {
  id: "creation",
  text: "A faint isometric square materialises in the void. Light gathers above it — then a form drops down, unfinished, waiting for a name.",
  voice: "narrator",
  createdAt: new Date(0).toISOString(),
};

function creationBrief(appearance: CharacterAppearance): HoloSceneBrief {
  return {
    locale: "materialising form",
    mood: "wonder",
    props: ["isometric tile", "holographic figure"],
    palette: {
      primary: appearance.primary,
      secondary: "#3d6b7a",
      glow: appearance.glow,
    },
    focal: "a lone tile receiving your hologram",
    stage: "creation",
    revealedTiles: 1,
  };
}

function randomAppearance(): CharacterAppearance {
  const base =
    APPEARANCE_PRESETS[Math.floor(Math.random() * APPEARANCE_PRESETS.length)] ??
    DEFAULT_APPEARANCE;
  const builds: CharacterAppearance["build"][] = ["slim", "sturdy", "tall"];
  return {
    ...base,
    build: builds[Math.floor(Math.random() * builds.length)] ?? "slim",
  };
}

const NAME_SEEDS = [
  "Ashen",
  "Vesper",
  "Kael",
  "Nyx",
  "Orin",
  "Sable",
  "Iri",
  "Thorne",
];

export function App() {
  const [phase, setPhase] = useState<"boot" | "create" | "play">("boot");
  const [session, setSession] = useState<AdventureSession | null>(null);
  const [wallet, setWallet] = useState<WalletSnapshot | null>(null);
  const [packs, setPacks] = useState<TokenPack[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGate, setShowGate] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [appearance, setAppearance] = useState<CharacterAppearance>(DEFAULT_APPEARANCE);
  const [dropKey, setDropKey] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const soundInitialised = useRef(false);

  useEffect(() => {
    if (soundInitialised.current) return;
    soundInitialised.current = true;
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem("aetherpath:sound") : null;
    const on = stored !== "off";
    setSoundOn(on);
    setSoundEnabled(on);
  }, []);

  const toggleSound = () => {
    setSoundOn((prev) => {
      const next = !prev;
      setSoundEnabled(next);
      try {
        localStorage.setItem("aetherpath:sound", next ? "on" : "off");
      } catch {
        // best effort; ignore storage failures (private mode, quota, etc.)
      }
      return next;
    });
  };

  const refreshWallet = useCallback(async () => {
    const data = await getWallet();
    setWallet(data.wallet);
    setPacks(data.packs);
    return data.wallet;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshWallet();
        if (!cancelled) setPhase("create");
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to reach the vault");
          setPhase("boot");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshWallet]);

  const onAppearanceChange = (next: CharacterAppearance) => {
    setAppearance(next);
    setDropKey((k) => k + 1);
  };

  const onRandom = () => {
    setAppearance(randomAppearance());
    setPlayerName(NAME_SEEDS[Math.floor(Math.random() * NAME_SEEDS.length)] ?? "Wanderer");
    setDropKey((k) => k + 1);
  };

  const begin = async () => {
    const name = playerName.trim();
    if (!name || busy) return;
    setBusy(true);
    setError(null);
    playCue("click");
    try {
      const [{ session: next }, w] = await Promise.all([
        startAdventure({
          playerName: name,
          className: "Spellblade",
          appearance,
        }),
        refreshWallet(),
      ]);
      setSession({ ...next, tokensRemaining: w.tokens });
      setShowGate(false);
      setPhase("play");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start adventure");
    } finally {
      setBusy(false);
    }
  };

  const restart = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    playCue("click");
    try {
      const [{ session: next }, w] = await Promise.all([
        startAdventure({
          playerName: session?.player.name ?? playerName,
          className: "Spellblade",
          appearance: session?.player.appearance ?? appearance,
        }),
        refreshWallet(),
      ]);
      setSession({ ...next, tokensRemaining: w.tokens });
      setShowGate(false);
      setPhase("play");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start a new descent");
    } finally {
      setBusy(false);
    }
  };

  const onChoose = async (choiceId: string) => {
    if (!session || busy) return;
    setBusy(true);
    setError(null);
    playCue("click");
    try {
      const { session: next } = await chooseAction(session.id, choiceId);

      if (next.status === "won") playCue("victory");
      else if (next.status === "lost") playCue("defeat");
      else if (next.player.hp < session.player.hp) playCue("hit");
      else if (next.player.hp > session.player.hp) playCue("heal");
      else if (choiceId.startsWith("door-") || choiceId === "fight" || choiceId === "flee")
        playCue("door");
      if (next.player.inventory.length > session.player.inventory.length) playCue("drop");

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

  const createBrief = useMemo(() => creationBrief(appearance), [appearance]);

  if (phase === "boot" || !wallet) {
    return (
      <div className="boot">
        <div className="boot-card">
          <h1>
            Aether<span>path</span>
          </h1>
          <p>Spinning up the vault…</p>
          {error ? <p className="error-text">{error}</p> : null}
          <button
            type="button"
            className="primary-btn"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void refreshWallet()
                .then(() => setPhase("create"))
                .catch((e) =>
                  setError(e instanceof Error ? e.message : "Failed to reach the vault"),
                )
                .finally(() => setBusy(false));
            }}
          >
            Enter the dungeon
          </button>
        </div>
      </div>
    );
  }

  if (showGate || session?.status === "awaiting_tokens") {
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

  if (phase === "create") {
    return (
      <div className="app-shell">
        <div className="top-bar">
          <div className="brand">
            Aether<span>path</span>
          </div>
          <div className="top-bar-actions">
            <button
              type="button"
              className="mute-btn"
              onClick={toggleSound}
              aria-label={soundOn ? "Mute sound" : "Unmute sound"}
              title={soundOn ? "Mute sound" : "Unmute sound"}
            >
              {soundOn ? "\u266a" : "\u266a\u0338"}
            </button>
            <button
              type="button"
              className="token-chip"
              onClick={() => setShowGate(true)}
              aria-label="Open token wallet"
            >
              Tokens <strong>{wallet.tokens}</strong>
            </button>
          </div>
        </div>

        <StoryFeed beats={[CREATION_BEAT]} />
        <HoloWorld
          key={`create-${dropKey}`}
          brief={createBrief}
          appearance={appearance}
          dropIn
        />
        <CreateBar
          name={playerName}
          appearance={appearance}
          busy={busy}
          onNameChange={setPlayerName}
          onAppearanceChange={onAppearanceChange}
          onRandom={onRandom}
          onPlay={() => void begin()}
        />

        {error ? (
          <p className="error-text" style={{ position: "absolute", bottom: "0.25rem", left: "1rem" }}>
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="app-shell">
      <div className="top-bar">
        <div className="brand">
          Aether<span>path</span>
        </div>
        <div className="top-bar-actions">
          <button
            type="button"
            className="mute-btn"
            onClick={toggleSound}
            aria-label={soundOn ? "Mute sound" : "Unmute sound"}
            title={soundOn ? "Mute sound" : "Unmute sound"}
          >
            {soundOn ? "\u266a" : "\u266a\u0338"}
          </button>
          <button
            type="button"
            className="token-chip"
            onClick={() => setShowGate(true)}
            aria-label="Open token wallet"
          >
            Tokens <strong>{session.tokensRemaining}</strong>
          </button>
        </div>
      </div>
      <StatusBar player={session.player} />

      <StoryFeed beats={session.beats} />
      <HoloWorld
        brief={session.holo}
        appearance={session.player.appearance ?? appearance}
      />
      {session.status === "won" || session.status === "lost" ? (
        <RunEndOverlay
          outcome={session.status}
          player={session.player}
          busy={busy}
          onRestart={() => void restart()}
        />
      ) : (
        <ChoiceBar
          choices={session.choices}
          disabled={busy}
          onChoose={(id) => void onChoose(id)}
        />
      )}

      {error ? (
        <p className="error-text" style={{ position: "absolute", bottom: "0.25rem", left: "1rem" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
