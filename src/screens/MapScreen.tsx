import { useEffect } from "react";

import { gameAssets } from "../assets/gameAssets";
import {
  playSound,
  stopAllSounds,
  stopSound,
  type SoundId,
} from "../audio/audio";
import type { Gift } from "../types/game";

interface MapScreenProps {
  completedGames: Gift[];
  onSelectGift: (gift: Gift) => void;
}

interface GiftPoint {
  gift: Gift;
  position: "left" | "top" | "right";
  soundId: SoundId;
}

const giftPoints: GiftPoint[] = [
  { gift: "puppy", position: "left", soundId: "puppyHint" },
  { gift: "armenia", position: "top", soundId: "armeniaHint" },
  { gift: "japan", position: "right", soundId: "japanHint" },
];

const flowerPatches = Array.from({ length: 20 }, (_, index) => index + 1);

export function MapScreen({ completedGames, onSelectGift }: MapScreenProps) {
  useEffect(() => stopAllSounds, []);

  const handleSelectGift = (point: GiftPoint) => {
    stopAllSounds();
    onSelectGift(point.gift);
  };

  return (
    <main className="screen map-screen">
      <div className="flower-field">
        {flowerPatches.map((flower) => (
          <span
            className={`field-flower field-flower--${flower}`}
            key={flower}
          >
            {gameAssets.flower}
          </span>
        ))}
      </div>

      <section className="map-scene">
        <p className="map-scene__instruction">
          Наведи на подарок. Прислушайся. Выбирай.
        </p>

        <svg
          className="map-paths"
          viewBox="0 0 1500 1000"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="map-path-texture"
              width="64"
              height="64"
              patternUnits="userSpaceOnUse"
            >
              <rect width="64" height="64" fill="#d9bc78" />
              <circle cx="13" cy="17" r="4" fill="#b99658" opacity="0.7" />
              <circle cx="47" cy="42" r="5" fill="#fff1b8" opacity="0.65" />
            </pattern>
          </defs>

          <g className="map-paths__shadow">
            <path d="M 750 1080 L 750 555" />
            <path d="M 750 555 L 750 205" />
            <path d="M 750 555 L 250 390" />
            <path d="M 750 555 L 1250 390" />
          </g>
          <g className="map-paths__border">
            <path d="M 750 1080 L 750 555" />
            <path d="M 750 555 L 750 205" />
            <path d="M 750 555 L 250 390" />
            <path d="M 750 555 L 1250 390" />
          </g>
          <g className="map-paths__surface">
            <path d="M 750 1080 L 750 555" />
            <path d="M 750 555 L 750 205" />
            <path d="M 750 555 L 250 390" />
            <path d="M 750 555 L 1250 390" />
          </g>
        </svg>
        <span className="map-scene__start">START</span>

        {giftPoints.map((point) => {
          const isCompleted = completedGames.includes(point.gift);

          return (
            <button
              className={`gift-point gift-point--${point.position}`}
              key={point.gift}
              type="button"
              onPointerEnter={() => playSound(point.soundId)}
              onPointerLeave={() => stopSound(point.soundId)}
              onClick={() => handleSelectGift(point)}
            >
              <span className="gift-point__box">{gameAssets.gift}</span>
              {isCompleted ? (
                <span className="gift-point__completed">
                  {gameAssets.completedMark}
                </span>
              ) : null}
            </button>
          );
        })}
      </section>
    </main>
  );
}
