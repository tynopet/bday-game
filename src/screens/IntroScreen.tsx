import { useState } from "react";

import { unlockAudio } from "../audio/audio";

interface IntroScreenProps {
  onStart: () => void;
}

export function IntroScreen({ onStart }: IntroScreenProps) {
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async () => {
    if (isStarting) {
      return;
    }

    setIsStarting(true);

    try {
      await unlockAudio();
    } catch (error) {
      console.warn("Audio could not be unlocked", error);
    }

    onStart();
  };

  return (
    <main className="screen intro-screen">
      <section className="intro-card" aria-labelledby="intro-title">
        <span className="intro-card__decoration" aria-hidden="true">
          ✦
        </span>
        <p className="eyebrow">Birthday Gift Game</p>
        <h1 id="intro-title">С днём рождения!</h1>
        <p className="intro-card__copy">Тебя ждёт очень сложный выбор.</p>
        <button
          className="primary-button"
          type="button"
          onClick={handleStart}
          disabled={isStarting}
        >
          {isStarting ? "СЕКУНДОЧКУ…" : "НАЧАТЬ"}
        </button>
      </section>
    </main>
  );
}

