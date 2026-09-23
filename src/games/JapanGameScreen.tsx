import { useEffect, useRef, useState } from "react";

import { gameAssets } from "../assets/gameAssets";
import { playGachaSound } from "../audio/audio";

type GamePhase = "ready" | "regular" | "special" | "won";
type RollStage = "idle" | "shaking" | "capsule" | "reveal" | "plane-flight";
type Collectible = (typeof gameAssets.japanCollectibles)[number];
type Prize = Collectible | typeof gameAssets.japanPlane;

interface JapanGameScreenProps {
  isCompleted: boolean;
  onWin: () => void;
  onClaim: () => void;
  onBack: () => void;
}

const REGULAR_ROLLS = 5;
const SPECIAL_BAG_SIZE = 5;
const SHAKE_DURATION = 560;
const CAPSULE_DURATION = 420;
const REVEAL_DURATION = 760;
const PLANE_FLIGHT_DURATION = 1650;
const REDUCED_MOTION_DURATION = 40;

function randomCollectible(): Collectible {
  const pool = gameAssets.japanCollectibles;
  return pool[Math.floor(Math.random() * pool.length)];
}

function createSpecialBag(): Prize[] {
  const bag: Prize[] = Array.from(
    { length: SPECIAL_BAG_SIZE },
    randomCollectible,
  );
  const planeIndex = 2 + Math.floor(Math.random() * 3);

  bag[planeIndex] = gameAssets.japanPlane;
  return bag;
}

export function JapanGameScreen({
  isCompleted,
  onWin,
  onClaim,
  onBack,
}: JapanGameScreenProps) {
  const [phase, setPhase] = useState<GamePhase>("ready");
  const [stage, setStage] = useState<RollStage>("idle");
  const [regularRolls, setRegularRolls] = useState(0);
  const [specialRolls, setSpecialRolls] = useState(0);
  const [currentPrize, setCurrentPrize] = useState<Prize | null>(null);
  const [collection, setCollection] = useState<Collectible[]>([]);

  const timerRef = useRef<number | null>(null);
  const specialBagRef = useRef<Prize[]>([]);
  const isRollingRef = useRef(false);
  const hasWonRef = useRef(false);
  const prefersReducedMotionRef = useRef(
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const getDuration = (duration: number) =>
    prefersReducedMotionRef.current ? REDUCED_MOTION_DURATION : duration;

  const schedule = (callback: () => void, duration: number) => {
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      callback();
    }, getDuration(duration));
  };

  useEffect(() => clearTimer, []);

  const startGame = () => {
    clearTimer();
    specialBagRef.current = [];
    isRollingRef.current = false;
    hasWonRef.current = false;
    setRegularRolls(0);
    setSpecialRolls(0);
    setCurrentPrize(null);
    setCollection([]);
    setStage("idle");
    setPhase("regular");
  };

  const finishGame = () => {
    if (hasWonRef.current) {
      return;
    }

    hasWonRef.current = true;
    isRollingRef.current = false;
    setCurrentPrize(null);
    setStage("idle");
    setPhase("won");
    onWin();
  };

  const finishCollectibleRoll = (
    prize: Collectible,
    rollPhase: "regular" | "special",
  ) => {
    setCollection((items) => [...items, prize]);
    setStage("reveal");

    if (rollPhase === "regular") {
      const nextRollCount = regularRolls + 1;
      setRegularRolls(nextRollCount);

      schedule(() => {
        setCurrentPrize(null);

        if (nextRollCount === REGULAR_ROLLS) {
          specialBagRef.current = createSpecialBag();
          setSpecialRolls(0);
          setPhase("special");
          playGachaSound("special");
        }

        setStage("idle");
        isRollingRef.current = false;
      }, REVEAL_DURATION);
      return;
    }

    setSpecialRolls((count) => count + 1);
    schedule(() => {
      setCurrentPrize(null);
      setStage("idle");
      isRollingRef.current = false;
    }, REVEAL_DURATION);
  };

  const roll = () => {
    if (
      isRollingRef.current ||
      stage !== "idle" ||
      (phase !== "regular" && phase !== "special")
    ) {
      return;
    }

    isRollingRef.current = true;
    const rollPhase = phase;
    const prize =
      rollPhase === "regular"
        ? randomCollectible()
        : specialBagRef.current[specialRolls];

    if (!prize) {
      isRollingRef.current = false;
      return;
    }

    playGachaSound("button");
    setCurrentPrize(null);
    setStage("shaking");

    schedule(() => {
      setStage("capsule");

      schedule(() => {
        setCurrentPrize(prize);

        if (prize === gameAssets.japanPlane) {
          playGachaSound("jackpot");
          setSpecialRolls((count) => count + 1);
          setStage("plane-flight");
          schedule(finishGame, PLANE_FLIGHT_DURATION);
          return;
        }

        playGachaSound("prize");
        finishCollectibleRoll(prize, rollPhase);
      }, CAPSULE_DURATION);
    }, SHAKE_DURATION);
  };

  const handleBack = () => {
    clearTimer();
    isRollingRef.current = false;
    onBack();
  };

  const isSpecial = phase === "special";
  const isBusy = stage !== "idle";
  const displayedRolls = isSpecial ? specialRolls : regularRolls;
  const statusLabel =
    phase === "ready"
      ? "5 ROLLS + SSR"
      : phase === "won"
        ? "SSR FOUND"
        : isSpecial
          ? `SUPER ${displayedRolls}/${SPECIAL_BAG_SIZE}`
          : `ROLLS ${displayedRolls}/${REGULAR_ROLLS}`;

  return (
    <main className="screen japan-game-screen">
      <section
        className={`japan-game${isSpecial ? " japan-game--special" : ""}`}
        aria-label="Японская гача"
      >
        <header className="japan-game__header">
          <button className="back-button" type="button" onClick={handleBack}>
            ← НА РАЗВИЛКУ
          </button>
          <div className="japan-game__status" aria-live="polite">
            {statusLabel}
          </div>
        </header>

        <div className={`japan-arena japan-arena--${stage}`}>
          <div className="japan-decor" aria-hidden="true">
            <span>🌸</span>
            <span>🏮</span>
            <span>🌸</span>
            <span>🏮</span>
          </div>

          {isSpecial ? (
            <div className="super-rare-banner" aria-live="polite">
              {gameAssets.japanSparkle} SUPER RARE CHANCE {gameAssets.japanSparkle}
            </div>
          ) : null}

          <div className={`gacha-machine${isBusy ? " is-busy" : ""}`}>
            <div className="gacha-machine__marquee">
              {isSpecial ? "超レア · SUPER RARE" : "LUCKY GACHA"}
            </div>

            <div className="gacha-machine__globe" aria-hidden="true">
              {gameAssets.japanCollectibles.slice(0, 7).map((item, index) => (
                <span
                  className={`gacha-ball gacha-ball--${index + 1}`}
                  key={`${item}-${index}`}
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="gacha-machine__body">
              <div className="gacha-machine__window" aria-live="polite">
                {stage === "shaking" ? (
                  <span className="gacha-machine__question">?</span>
                ) : null}

                {stage === "capsule" || stage === "reveal" ? (
                  <span
                    className={`gacha-capsule${stage === "reveal" ? " is-open" : ""}`}
                  >
                    <span className="gacha-capsule__top" />
                    <span className="gacha-capsule__bottom" />
                    {stage === "reveal" && currentPrize ? (
                      <span className="gacha-capsule__prize">{currentPrize}</span>
                    ) : null}
                  </span>
                ) : null}

                {stage === "idle" ? (
                  <span className="gacha-machine__ready">
                    {isSpecial ? gameAssets.japanSparkle : gameAssets.japanCapsule}
                  </span>
                ) : null}
              </div>

              <button
                className="gacha-roll-button"
                type="button"
                disabled={isBusy || phase === "ready" || phase === "won"}
                onClick={roll}
              >
                <span>{isSpecial ? "SSR ROLL" : "КРУТИТЬ"}</span>
                <small>{isSpecial ? "運試し" : "PUSH"}</small>
              </button>

              <div className="gacha-machine__slot" aria-hidden="true" />
            </div>
          </div>

          <section className="gacha-collection" aria-label="Коллекция призов">
            <div className="gacha-collection__heading">
              <span>COLLECTION</span>
              <strong>{collection.length}</strong>
            </div>
            <div className="gacha-collection__items">
              {collection.length === 0 ? (
                <span className="gacha-collection__empty">
                  Здесь появятся твои сокровища
                </span>
              ) : (
                collection.map((item, index) => (
                  <span
                    className="gacha-collection__item"
                    key={`${item}-${index}`}
                    aria-label={`Приз ${index + 1}`}
                  >
                    {item}
                  </span>
                ))
              )}
            </div>
          </section>

          {stage === "plane-flight" ? (
            <div className="plane-flight" aria-live="assertive">
              <span className="plane-flight__sparkles" aria-hidden="true">
                ✦ ✦ ✦
              </span>
              <span className="plane-flight__plane" aria-label="Самолёт">
                {gameAssets.japanPlane}
              </span>
            </div>
          ) : null}

          {phase === "ready" ? (
            <div className="japan-overlay">
              <div className="japan-overlay__card">
                <span className="japan-overlay__emoji" aria-hidden="true">
                  🌸 {gameAssets.japanCapsule} 🗻
                </span>
                <p className="eyebrow">Испытай удачу</p>
                <h2>Пять капсул. А потом — кое-что редкое.</h2>
                <p>
                  Крути автомат, открывай капсулы и собирай всё, что выпадет.
                  Дубликаты тоже считаются сокровищами.
                </p>
                <div className="game-intro-actions">
                  <button className="primary-button" type="button" onClick={startGame}>
                    НАЧАТЬ КРУТИТЬ
                  </button>
                  {isCompleted ? (
                    <button className="secondary-button" type="button" onClick={onClaim}>
                      ПОСМОТРЕТЬ СЕРТИФИКАТ
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {phase === "won" ? (
            <div className="japan-overlay japan-overlay--won">
              <div className="japan-overlay__card japan-overlay__card--won">
                <span className="japan-overlay__rarity">
                  {gameAssets.japanSparkle} SSR {gameAssets.japanSparkle}
                </span>
                <span className="japan-overlay__plane" aria-hidden="true">
                  {gameAssets.japanPlane}
                </span>
                <h2>ПОЕЗДКА В ЯПОНИЮ</h2>
                <p>Поздравляем. Гача внезапно оказалась очень щедрой.</p>
                <button className="primary-button" type="button" onClick={onClaim}>
                  ПОЛУЧИТЬ ПРИЗ
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
