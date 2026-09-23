import { useEffect } from "react";

import daffodilSprite from "../../assets/daffodil-sprite.png";
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

interface FlowerPatch {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

const giftPoints: GiftPoint[] = [
  { gift: "puppy", position: "left", soundId: "puppyHint" },
  { gift: "armenia", position: "top", soundId: "armeniaHint" },
  { gift: "japan", position: "right", soundId: "japanHint" },
];

const FLOWER_COLUMNS = 16;
const FLOWER_ROWS = 9;

const flowerPatches: FlowerPatch[] = Array.from(
  { length: FLOWER_COLUMNS * FLOWER_ROWS },
  (_, index) => {
    const column = index % FLOWER_COLUMNS;
    const row = Math.floor(index / FLOWER_COLUMNS);
    const horizontalJitter = (((index * 17) % 9) - 4) * 0.055;
    const verticalJitter = (((index * 23) % 7) - 3) * 0.05;

    return {
      id: index + 1,
      x: ((column + 0.15 + horizontalJitter) / FLOWER_COLUMNS) * 100,
      y: ((row + 0.08 + verticalJitter) / FLOWER_ROWS) * 100,
      rotation: ((index * 29) % 33) - 16,
      scale: 0.72 + ((index * 11) % 9) * 0.055,
    };
  },
);

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
          <img
            className="field-flower"
            key={flower.id}
            src={daffodilSprite}
            alt=""
            draggable={false}
            style={{
              left: `${flower.x}%`,
              top: `${flower.y}%`,
              rotate: `${flower.rotation}deg`,
              scale: `${flower.scale}`,
            }}
          />
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
