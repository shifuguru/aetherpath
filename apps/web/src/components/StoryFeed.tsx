import { useEffect, useRef } from "react";
import type { StoryBeat } from "@aetherpath/shared";

export function StoryFeed({ beats }: { beats: StoryBeat[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [beats.length]);

  return (
    <section className="story-pane" aria-label="Story">
      <div className="story-scroll">
        {beats.map((beat) => (
          <article key={beat.id} className={`story-beat ${beat.voice}`}>
            <p>{beat.text}</p>
          </article>
        ))}
        <div ref={endRef} />
      </div>
    </section>
  );
}
