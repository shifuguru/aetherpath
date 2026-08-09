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
            name="character-name"
            value={name}
            maxLength={24}
            placeholder="Enter a name"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="words"
            spellCheck={false}
            inputMode="text"
            enterKeyHint="done"
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
            onChange={(e) => onNameChange(e.target.value)}
            disabled={busy}
          />
        </label>

        <div className="create-appearance">
          <div className="create-appearance-head">
            <span>Look</span>
            <button
              type="button"
              className="create-random"
              disabled={busy}
              onClick={onRandom}
            >
              Random
            </button>
          </div>
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
