import { useEffect, useState } from "react";

interface Props {
  message: string;
  /** Bumps to replay the enter animation when the same text repeats. */
  signal?: string | number;
}

export function StatusBar({ message, signal }: Props) {
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [message, signal]);

  if (!message) {
    return <div className="status-pane" aria-live="polite" />;
  }

  return (
    <div className="status-pane" aria-live="polite" aria-atomic="true">
      <p key={animKey} className="status-line">
        {message}
      </p>
    </div>
  );
}
