import { useEffect, useRef, useState, type CSSProperties } from "react";

import { gameAssets } from "../assets/gameAssets";

type GamePhase = "ready" | "playing" | "lost" | "won";
type HorizontalSide = "left" | "right";
type VerticalLevel = "upper" | "lower";
type Lane = "upper-left" | "lower-left" | "upper-right" | "lower-right";
type AttemptResult = "caught" | "missed" | null;

interface FallingPoop {
  id: number;
  lane: Lane;
  progress: number;
}

interface PuppyGameScreenProps {
  isCompleted: boolean;
  onWin: () => void;
  onClaim: () => void;
  onBack: () => void;
}

interface Point {
  x: number;
  y: number;
}

const TARGET_SCORE = 10;
const STARTING_LIVES = 3;
const FIRST_ATTEMPT_DELAY = 700;
const ATTEMPT_GAP = 350;
const MAX_FRAME_DELTA = 50;
const LANES: Lane[] = [
  "upper-left",
  "lower-left",
  "upper-right",
  "lower-right",
];

const lanePoints: Record<Lane, { start: Point; end: Point }> = {
  "upper-left": { start: { x: 8, y: 12 }, end: { x: 45, y: 45 } },
  "lower-left": { start: { x: 8, y: 43 }, end: { x: 45, y: 68 } },
  "upper-right": { start: { x: 92, y: 12 }, end: { x: 55, y: 45 } },
  "lower-right": { start: { x: 92, y: 43 }, end: { x: 55, y: 68 } },
};

const controlKeys = new Set([
  "a",
  "d",
  "w",
  "s",
  "arrowleft",
  "arrowright",
  "arrowup",
  "arrowdown",
]);

function shuffleLanes(): Lane[] {
  const lanes = [...LANES];

  for (let index = lanes.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [lanes[index], lanes[randomIndex]] = [lanes[randomIndex], lanes[index]];
  }

  return lanes;
}

function getBasketLane(
  side: HorizontalSide | null,
  level: VerticalLevel | null,
): Lane | null {
  return side && level ? `${level}-${side}` : null;
}

function getAttemptDuration(score: number): number {
  return Math.max(1100, 1800 - score * 78);
}

export function PuppyGameScreen({
  isCompleted,
  onWin,
  onClaim,
  onBack,
}: PuppyGameScreenProps) {
  const [phase, setPhase] = useState<GamePhase>("ready");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [side, setSide] = useState<HorizontalSide | null>(null);
  const [level, setLevel] = useState<VerticalLevel | null>(null);
  const [projectile, setProjectile] = useState<FallingPoop | null>(null);
  const [attemptResult, setAttemptResult] = useState<AttemptResult>(null);

  const phaseRef = useRef<GamePhase>("ready");
  const scoreRef = useRef(0);
  const livesRef = useRef(STARTING_LIVES);
  const sideRef = useRef<HorizontalSide | null>(null);
  const levelRef = useRef<VerticalLevel | null>(null);
  const laneQueueRef = useRef<Lane[]>([]);
  const projectileIdRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const nextAttemptTimerRef = useRef<number | null>(null);

  const cancelScheduledWork = () => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (nextAttemptTimerRef.current !== null) {
      window.clearTimeout(nextAttemptTimerRef.current);
      nextAttemptTimerRef.current = null;
    }
  };

  const takeNextLane = (): Lane => {
    if (laneQueueRef.current.length === 0) {
      laneQueueRef.current = shuffleLanes();
    }

    return laneQueueRef.current.shift() ?? "upper-left";
  };

  const scheduleNextAttempt = (delay: number) => {
    nextAttemptTimerRef.current = window.setTimeout(() => {
      nextAttemptTimerRef.current = null;

      if (phaseRef.current === "playing") {
        launchAttempt();
      }
    }, delay);
  };

  const resolveAttempt = (lane: Lane) => {
    animationFrameRef.current = null;
    setProjectile(null);

    const basketLane = getBasketLane(sideRef.current, levelRef.current);
    const caught = basketLane === lane;

    if (caught) {
      const nextScore = scoreRef.current + 1;
      scoreRef.current = nextScore;
      setScore(nextScore);
      setAttemptResult("caught");

      if (nextScore === TARGET_SCORE) {
        phaseRef.current = "won";
        setPhase("won");
        onWin();
        return;
      }
    } else {
      const nextLives = livesRef.current - 1;
      livesRef.current = nextLives;
      setLives(nextLives);
      setAttemptResult("missed");

      if (nextLives === 0) {
        phaseRef.current = "lost";
        setPhase("lost");
        return;
      }
    }

    scheduleNextAttempt(ATTEMPT_GAP);
  };

  const launchAttempt = () => {
    const lane = takeNextLane();
    const id = projectileIdRef.current + 1;
    const duration = getAttemptDuration(scoreRef.current);
    let elapsed = 0;
    let previousTimestamp: number | null = null;

    projectileIdRef.current = id;
    setAttemptResult(null);
    setProjectile({ id, lane, progress: 0 });

    const animate = (timestamp: number) => {
      if (phaseRef.current !== "playing") {
        animationFrameRef.current = null;
        return;
      }

      if (previousTimestamp !== null) {
        elapsed += Math.min(timestamp - previousTimestamp, MAX_FRAME_DELTA);
      }
      previousTimestamp = timestamp;

      const progress = Math.min(elapsed / duration, 1);
      setProjectile({ id, lane, progress });

      if (progress === 1) {
        resolveAttempt(lane);
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);
  };

  const startRound = () => {
    cancelScheduledWork();
    phaseRef.current = "playing";
    scoreRef.current = 0;
    livesRef.current = STARTING_LIVES;
    sideRef.current = null;
    levelRef.current = null;
    laneQueueRef.current = [];

    setPhase("playing");
    setScore(0);
    setLives(STARTING_LIVES);
    setSide(null);
    setLevel(null);
    setProjectile(null);
    setAttemptResult(null);

    scheduleNextAttempt(FIRST_ATTEMPT_DELAY);
  };

  useEffect(() => cancelScheduledWork, []);

  useEffect(() => {
    if (phase !== "playing") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if (!controlKeys.has(key)) {
        return;
      }

      event.preventDefault();

      if (key === "a" || key === "arrowleft") {
        sideRef.current = "left";
        setSide("left");
      } else if (key === "d" || key === "arrowright") {
        sideRef.current = "right";
        setSide("right");
      } else if (key === "w" || key === "arrowup") {
        levelRef.current = "upper";
        setLevel("upper");
      } else {
        levelRef.current = "lower";
        setLevel("lower");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase]);

  const basketLane = getBasketLane(side, level);
  const projectilePosition = projectile
    ? {
        left: `${
          lanePoints[projectile.lane].start.x +
          (lanePoints[projectile.lane].end.x -
            lanePoints[projectile.lane].start.x) *
            projectile.progress
        }%`,
        top: `${
          lanePoints[projectile.lane].start.y +
          (lanePoints[projectile.lane].end.y -
            lanePoints[projectile.lane].start.y) *
            projectile.progress
        }%`,
      }
    : undefined;

  return (
    <main className="screen puppy-game-screen">
      <section className="puppy-game" aria-label="Щенячий переполох">
        <header className="puppy-game__header">
          <button className="back-button" type="button" onClick={onBack}>
            ← НА РАЗВИЛКУ
          </button>
          <div className="puppy-game__hud" aria-label="Состояние игры">
            <span>
              ПОЙМАНО <strong>{score}/{TARGET_SCORE}</strong>
            </span>
            <span className="puppy-game__lives" aria-label={`Жизней: ${lives}`}>
              {Array.from({ length: STARTING_LIVES }, (_, index) => (
                <span
                  className={index < lives ? "life life--active" : "life"}
                  key={index}
                  aria-hidden="true"
                >
                  ♥
                </span>
              ))}
            </span>
          </div>
        </header>

        <div className="puppy-arena">
          <svg
            className="puppy-lanes"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {LANES.map((lane) => {
              const { start, end } = lanePoints[lane];

              return (
                <g key={lane}>
                  <line
                    className="puppy-lane puppy-lane--shadow"
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                  />
                  <line
                    className="puppy-lane puppy-lane--border"
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                  />
                  <line
                    className="puppy-lane puppy-lane--fill"
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                  />
                  <line
                    className="puppy-lane puppy-lane--slats"
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                  />
                  <line
                    className="puppy-lane puppy-lane--shine"
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                  />
                </g>
              );
            })}
          </svg>

          {LANES.map((lane) => (
            <span
              className={`puppy-station puppy-station--${lane}`}
              key={lane}
              aria-hidden="true"
            >
              {gameAssets.puppy}
            </span>
          ))}

          <span
            className={`catch-basket catch-basket--${basketLane ?? "center"}`}
            aria-label="Корзина"
          >
            {gameAssets.basket}
          </span>

          {projectile ? (
            <span
              className="falling-poop"
              style={projectilePosition as CSSProperties}
              aria-hidden="true"
            >
              {gameAssets.poop}
            </span>
          ) : null}

          <div className="puppy-controls" aria-label="Управление">
            <span className={level === "upper" ? "control-key is-active" : "control-key"}>
              W / ↑<small>ВЕРХ</small>
            </span>
            <span className={side === "left" ? "control-key is-active" : "control-key"}>
              A / ←<small>ЛЕВО</small>
            </span>
            <span className={level === "lower" ? "control-key is-active" : "control-key"}>
              S / ↓<small>НИЗ</small>
            </span>
            <span className={side === "right" ? "control-key is-active" : "control-key"}>
              D / →<small>ПРАВО</small>
            </span>
          </div>

          <p className={`attempt-result attempt-result--${attemptResult ?? "idle"}`} aria-live="polite">
            {attemptResult === "caught"
              ? "+1 ПОЙМАНО!"
              : attemptResult === "missed"
                ? "МИМО!"
                : ""}
          </p>

          {phase === "ready" ? (
            <div className="puppy-overlay">
              <div className="puppy-overlay__card">
                <span className="puppy-overlay__emoji" aria-hidden="true">
                  {gameAssets.puppy} {gameAssets.poop} {gameAssets.basket}
                </span>
                <p className="eyebrow">Срочная операция</p>
                <h2>Поймай 10. Не пропусти 3.</h2>
                <p>
                  Сначала выбери сторону, затем высоту. Корзина начнёт снизу по
                  центру.
                </p>
                <div className="game-intro-actions">
                  <button className="primary-button" type="button" onClick={startRound}>
                    НАЧАТЬ ЛОВИТЬ
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

          {phase === "lost" ? (
            <div className="puppy-overlay">
              <div className="puppy-overlay__card">
                <span className="puppy-overlay__emoji" aria-hidden="true">
                  {gameAssets.poop} {gameAssets.poop} {gameAssets.poop}
                </span>
                <p className="eyebrow">Это провал</p>
                <h2>Щенячья катастрофа произошла.</h2>
                <div className="puppy-overlay__actions">
                  <button className="primary-button" type="button" onClick={startRound}>
                    ПОПРОБОВАТЬ ЕЩЁ
                  </button>
                  <button className="secondary-button" type="button" onClick={onBack}>
                    ВЕРНУТЬСЯ НА РАЗВИЛКУ
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {phase === "won" ? (
            <div className="puppy-overlay">
              <div className="puppy-overlay__card puppy-overlay__card--won">
                <span className="puppy-overlay__emoji" aria-hidden="true">
                  {gameAssets.paw} {gameAssets.puppy} {gameAssets.paw}
                </span>
                <p className="eyebrow">10 из 10</p>
                <h2>Щенячья катастрофа предотвращена.</h2>
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
