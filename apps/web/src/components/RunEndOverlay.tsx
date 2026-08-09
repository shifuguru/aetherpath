import type { PlayerState } from "@aetherpath/shared";
import { WIN_DEPTH } from "@aetherpath/shared";

interface Props {
  outcome: "won" | "lost";
  player: PlayerState;
  busy?: boolean;
  onRestart: () => void;
}

export function RunEndOverlay({ outcome, player, busy, onRestart }: Props) {
  const won = outcome === "won";

  return (
    <div className="run-end" role="dialog" aria-modal="true" aria-labelledby="run-end-title">
      <div className={`run-end-card ${won ? "won" : "lost"}`}>
        <h2 id="run-end-title">{won ? "The Aether Core is yours" : "The hologram fades"}</h2>
        <p>
          {won
            ? `${player.name} carried the light through ${WIN_DEPTH} chambers of the vault and claimed what waited at its heart.`
            : `${player.name} fell in the dark, ${player.depth} chamber${player.depth === 1 ? "" : "s"} into the vault. The stone remembers your name — but the path resets.`}
        </p>
        <div className="run-end-stats">
          <div>
            <span className="run-end-stat-label">Depth reached</span>
            <span className="run-end-stat-value">
              {player.depth}/{WIN_DEPTH}
            </span>
          </div>
          <div>
            <span className="run-end-stat-label">Relics carried</span>
            <span className="run-end-stat-value">{player.inventory.length}</span>
          </div>
        </div>
        <button type="button" className="primary-btn" disabled={busy} onClick={onRestart}>
          {won ? "Descend again" : "Try again"}
        </button>
      </div>
    </div>
  );
}
