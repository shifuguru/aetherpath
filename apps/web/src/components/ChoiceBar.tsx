import type { StoryChoice } from "@aetherpath/shared";

interface Props {
  choices: StoryChoice[];
  disabled?: boolean;
  onChoose: (choiceId: string) => void;
}

export function ChoiceBar({ choices, disabled, onChoose }: Props) {
  const count = Math.min(Math.max(choices.length, 2), 4);

  return (
    <section className="choice-pane" aria-label="Your next move">
      <div className="choice-grid" data-count={count}>
        {choices.slice(0, 4).map((choice) => (
          <button
            key={choice.id}
            type="button"
            className="choice-btn"
            disabled={disabled}
            onClick={() => onChoose(choice.id)}
          >
            <span className="label">{choice.label}</span>
            {choice.hint ? <span className="hint">{choice.hint}</span> : null}
          </button>
        ))}
      </div>
    </section>
  );
}
