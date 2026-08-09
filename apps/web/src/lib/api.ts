import type {
  AdventureSession,
  AdRewardGrantResponse,
  CharacterAppearance,
  ChooseActionResponse,
  StartAdventureResponse,
  TokenPack,
  WalletSnapshot,
} from "@aetherpath/shared";
import * as demo from "./demoApi";

const DEMO = import.meta.env.VITE_DEMO_MODE === "true";
const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      (data as { message?: string; error?: string }).message ??
        (data as { error?: string }).error ??
        `Request failed (${res.status})`,
    ) as Error & { status?: number; session?: AdventureSession };
    err.status = res.status;
    err.session = (data as { session?: AdventureSession }).session;
    throw err;
  }
  return data as T;
}

export function startAdventure(body?: {
  playerName?: string;
  className?: string;
  appearance?: CharacterAppearance;
}) {
  if (DEMO) return demo.startAdventure(body);
  return request<StartAdventureResponse>("/v1/adventure/start", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
}

export function chooseAction(sessionId: string, choiceId: string) {
  if (DEMO) return demo.chooseAction(sessionId, choiceId);
  return request<ChooseActionResponse>("/v1/adventure/choose", {
    method: "POST",
    body: JSON.stringify({ sessionId, choiceId }),
  });
}

export function getWallet() {
  if (DEMO) return demo.getWallet();
  return request<{ wallet: WalletSnapshot; packs: TokenPack[] }>(
    "/v1/economy/wallet",
  );
}

export function purchasePack(packId: string) {
  if (DEMO) return demo.purchasePack(packId);
  return request<{ wallet: WalletSnapshot; tokensGranted: number }>(
    "/v1/economy/purchase",
    {
      method: "POST",
      body: JSON.stringify({ packId }),
    },
  );
}

export function claimAdReward(sessionId?: string) {
  if (DEMO) return demo.claimAdReward(sessionId);
  return request<AdRewardGrantResponse>("/v1/economy/ad-reward", {
    method: "POST",
    body: JSON.stringify({
      sessionId,
      adReceipt: `stub_${Date.now()}`,
    }),
  });
}
