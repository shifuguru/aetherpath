import { WIN_DEPTH, type PlayerState } from "@aetherpath/shared";

export function StatusBar({ player }: { player: PlayerState }) {
  const hpPct = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
  const hpTone = hpPct <= 30 ? "low" : hpPct <= 60 ? "mid" : "high";
  const depthPct = Math.max(0, Math.min(100, (player.depth / WIN_DEPTH) * 100));

  return (
    <div className="status-bar" aria-label="Player status">
      <div className="status-row status-hp">
        <span className="status-label">HP</span>
        <div className="status-track" role="progressbar" aria-valuenow={player.hp} aria-valuemax={player.maxHp}>
          <div className={`status-fill hp-${hpTone}`} style={{ width: `${hpPct}%` }} />
        </div>
        <span className="status-value">
          {player.hp}/{player.maxHp}
        </span>
      </div>
      <div className="status-row status-depth">
        <span className="status-label">Vault</span>
        <div className="status-track" role="progressbar" aria-valuenow={player.depth} aria-valuemax={WIN_DEPTH}>
          <div className="status-fill depth-fill" style={{ width: `${depthPct}%` }} />
        </div>
        <span className="status-value">
          {player.depth}/{WIN_DEPTH}
        </span>
      </div>
      {player.inventory.length > 0 ? (
        <div className="status-inventory" title={player.inventory.join(", ")}>
          {player.inventory.slice(-6).map((item, i) => (
            <span key={`${item}-${i}`} className="inventory-chip">
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
