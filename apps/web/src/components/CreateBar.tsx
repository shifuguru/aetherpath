import type { CharacterAppearance } from "@aetherpath/shared";
import { APPEARANCE_PRESETS } from "@aetherpath/shared";

interface Props {
  name: string;
  appearance: CharacterAppearance;
  busy?: boolean;
  onNameChange: (name: string) => void;
  onAppearanceChange: (next: CharacterAppearance) => void;
  onRandom: () => void;
  onPlay: () => void;
}

export function CreateBar({
  name,
  appearance,
  busy,
  onNameChange,
  onAppearanceChange,
  onRandom,
  onPlay,
}: Props) {
  const canPlay = name.trim().length > 0 && !busy;

  return (
    <section className="create-pane" aria-label="Create your character">
      <div className="create-inner">
        <label className="create-field">
          <span>Name</span>
          <input
            type="text"
            value={name}
            maxLength={24}
            placeholder="Who walks the vault?"
            onChange={(e) => onNameChange(e.target.value)}
            disabled={busy}
          />
        </label>

        <div className="create-row">
          <div className="appearance-swatches" role="listbox" aria-label="Appearance">
            {APPEARANCE_PRESETS.map((preset) => {
              const active =
                preset.build === appearance.build &&
                preset.glow === appearance.glow &&
                preset.primary === appearance.primary;
              return (
                <button
                  key={`${preset.build}-${preset.glow}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`swatch${active ? " active" : ""}`}
                  style={{
                    ["--swatch-glow" as string]: preset.glow,
                    ["--swatch-primary" as string]: preset.primary,
                  }}
                  disabled={busy}
                  onClick={() => onAppearanceChange(preset)}
                  title={`${preset.build} form`}
                />
              );
            })}
          </div>
          <button
            type="button"
            className="secondary-btn create-random"
            disabled={busy}
            onClick={onRandom}
          >
            Random
          </button>
        </div>

        <button
          type="button"
          className="primary-btn create-play"
          disabled={!canPlay}
          onClick={onPlay}
        >
          Play
        </button>
      </div>
    </section>
  );
}
