import type { TokenPack, WalletSnapshot } from "@aetherpath/shared";

interface Props {
  wallet: WalletSnapshot;
  packs: TokenPack[];
  busy?: boolean;
  onBuy: (packId: string) => void;
  onWatchAd: () => void;
  onClose?: () => void;
}

export function TokenGate({
  wallet,
  packs,
  busy,
  onBuy,
  onWatchAd,
  onClose,
}: Props) {
  return (
    <div className="gate" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <div className="gate-card">
        <h2 id="gate-title">The path dims</h2>
        <p>
          You have <strong>{wallet.tokens}</strong> tokens left. Each story turn
          spends tokens. Refill by watching a short ad, or buy a pack.
        </p>

        <button
          type="button"
          className="primary-btn"
          disabled={busy}
          onClick={onWatchAd}
        >
          Watch ad (+tokens)
        </button>

        {packs.map((pack) => (
          <button
            key={pack.id}
            type="button"
            className="secondary-btn"
            disabled={busy}
            onClick={() => onBuy(pack.id)}
          >
            {pack.label} — {pack.tokens} tokens · ${(pack.priceCents / 100).toFixed(2)}
          </button>
        ))}

        {onClose ? (
          <button type="button" className="secondary-btn" onClick={onClose}>
            Close
          </button>
        ) : null}
      </div>
    </div>
  );
}
