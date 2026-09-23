import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import armeniaBackground from "../../assets/armenia_bg.jpg";
import { gameAssets } from "../assets/gameAssets";

type GamePhase = "ready" | "playing" | "won";

interface ArmeniaGameScreenProps {
  isCompleted: boolean;
  onWin: () => void;
  onClaim: () => void;
  onBack: () => void;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
}

interface CanvasSize {
  width: number;
  height: number;
}

interface FoodPosition {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  symbol: (typeof gameAssets.armeniaFoods)[number];
}

const TARGET_PROGRESS = 75;
const PROGRESS_CANVAS_WIDTH = 180;
const PROGRESS_CHECK_INTERVAL = 200;

const foodPositions: FoodPosition[] = Array.from(
  { length: 54 },
  (_, index) => {
    const column = index % 9;
    const row = Math.floor(index / 9);

    return {
      x: (column + 0.5 + (row % 2 === 0 ? 0 : 0.22)) / 9,
      y: (row + 0.5) / 6,
      scale: 0.86 + ((index * 7) % 5) * 0.07,
      rotation: (((index * 29) % 34) - 17) * (Math.PI / 180),
      symbol:
        gameAssets.armeniaFoods[index % gameAssets.armeniaFoods.length],
    };
  },
);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getBrushSize(width: number, height: number): number {
  return clamp(Math.min(width, height) * 0.19, 92, 142);
}

function drawFoodCover(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  context.save();
  context.globalCompositeOperation = "source-over";
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#9e5237";
  context.fillRect(0, 0, width, height);

  const tileSize = 54;

  for (let y = 0; y < height; y += tileSize) {
    for (let x = 0; x < width; x += tileSize) {
      const isLightTile = (x / tileSize + y / tileSize) % 2 === 0;
      context.fillStyle = isLightTile
        ? "rgba(255, 235, 184, 0.17)"
        : "rgba(91, 42, 27, 0.10)";
      context.fillRect(x, y, tileSize, tileSize);
    }
  }

  const baseFoodSize = clamp(Math.min(width / 13, height / 5.6), 58, 104);
  context.fillStyle = "#fff";
  context.textAlign = "center";
  context.textBaseline = "middle";

  foodPositions.forEach((food) => {
    context.save();
    context.translate(food.x * width, food.y * height);
    context.rotate(food.rotation);
    context.font = `${baseFoodSize * food.scale}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    context.shadowColor = "rgba(57, 31, 20, 0.32)";
    context.shadowBlur = 0;
    context.shadowOffsetY = 6;
    context.fillText(food.symbol, 0, 0);
    context.restore();
  });

  context.restore();
}

function eraseSegment(
  context: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  width: number,
  height: number,
  brushSize: number,
) {
  context.save();
  context.globalCompositeOperation = "destination-out";
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = brushSize;
  context.beginPath();
  context.moveTo(from.x * width, from.y * height);
  context.lineTo(to.x * width, to.y * height);
  context.stroke();

  if (from.x === to.x && from.y === to.y) {
    context.beginPath();
    context.arc(
      from.x * width,
      from.y * height,
      brushSize / 2,
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  context.restore();
}

function eraseStroke(
  context: CanvasRenderingContext2D,
  stroke: Stroke,
  width: number,
  height: number,
  brushSize: number,
) {
  if (stroke.points.length === 0) {
    return;
  }

  if (stroke.points.length === 1) {
    eraseSegment(
      context,
      stroke.points[0],
      stroke.points[0],
      width,
      height,
      brushSize,
    );
    return;
  }

  context.save();
  context.globalCompositeOperation = "destination-out";
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = brushSize;
  context.beginPath();
  context.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);

  stroke.points.slice(1).forEach((point) => {
    context.lineTo(point.x * width, point.y * height);
  });

  context.stroke();
  context.restore();
}

export function ArmeniaGameScreen({
  isCompleted,
  onWin,
  onClaim,
  onBack,
}: ArmeniaGameScreenProps) {
  const [phase, setPhase] = useState<GamePhase>("ready");
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lavashPosition, setLavashPosition] = useState<Point | null>(null);

  const arenaRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasSizeRef = useRef<CanvasSize>({ width: 1, height: 1 });
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const phaseRef = useRef<GamePhase>("ready");
  const progressRef = useRef(0);
  const isDraggingRef = useRef(false);
  const hasWonRef = useRef(false);
  const progressTimerRef = useRef<number | null>(null);
  const lastProgressCheckRef = useRef(0);

  const repaintCanvases = useCallback(() => {
    const arena = arenaRef.current;
    const canvas = canvasRef.current;

    if (!arena || !canvas) {
      return;
    }

    const rect = arena.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const devicePixelRatio = window.devicePixelRatio || 1;
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    canvasSizeRef.current = { width, height };
    canvas.width = Math.round(width * devicePixelRatio);
    canvas.height = Math.round(height * devicePixelRatio);
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    if (phaseRef.current === "won") {
      context.clearRect(0, 0, width, height);
    } else {
      drawFoodCover(context, width, height);
      const brushSize = getBrushSize(width, height);

      strokesRef.current.forEach((stroke) => {
        eraseStroke(context, stroke, width, height, brushSize);
      });
    }

    const progressCanvas = progressCanvasRef.current ?? document.createElement("canvas");
    const progressHeight = Math.max(
      1,
      Math.round(PROGRESS_CANVAS_WIDTH * (height / width)),
    );
    const progressContext = progressCanvas.getContext("2d", {
      willReadFrequently: true,
    });

    progressCanvasRef.current = progressCanvas;
    progressCanvas.width = PROGRESS_CANVAS_WIDTH;
    progressCanvas.height = progressHeight;

    if (!progressContext) {
      return;
    }

    if (phaseRef.current === "won") {
      progressContext.clearRect(
        0,
        0,
        PROGRESS_CANVAS_WIDTH,
        progressHeight,
      );
      return;
    }

    progressContext.globalCompositeOperation = "source-over";
    progressContext.fillStyle = "#000";
    progressContext.fillRect(0, 0, PROGRESS_CANVAS_WIDTH, progressHeight);

    const progressBrushSize =
      getBrushSize(width, height) * (PROGRESS_CANVAS_WIDTH / width);

    strokesRef.current.forEach((stroke) => {
      eraseStroke(
        progressContext,
        stroke,
        PROGRESS_CANVAS_WIDTH,
        progressHeight,
        progressBrushSize,
      );
    });
  }, []);

  const calculateProgress = useCallback(() => {
    if (phaseRef.current !== "playing") {
      return;
    }

    const canvas = progressCanvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });

    if (!canvas || !context) {
      return;
    }

    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let clearedPixels = 0;

    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] < 128) {
        clearedPixels += 1;
      }
    }

    const measuredProgress = Math.round(
      (clearedPixels / (pixels.length / 4)) * 100,
    );
    const nextProgress = Math.max(progressRef.current, measuredProgress);

    if (nextProgress !== progressRef.current) {
      progressRef.current = nextProgress;
      setProgress(nextProgress);
    }

    if (nextProgress >= TARGET_PROGRESS && !hasWonRef.current) {
      hasWonRef.current = true;
      phaseRef.current = "won";
      isDraggingRef.current = false;
      setIsDragging(false);
      setLavashPosition(null);
      setPhase("won");
      onWin();
    }
  }, [onWin]);

  const scheduleProgressCheck = useCallback(
    (immediate = false) => {
      if (progressTimerRef.current !== null) {
        window.clearTimeout(progressTimerRef.current);
        progressTimerRef.current = null;
      }

      const elapsed = performance.now() - lastProgressCheckRef.current;

      if (immediate || elapsed >= PROGRESS_CHECK_INTERVAL) {
        lastProgressCheckRef.current = performance.now();
        calculateProgress();
        return;
      }

      progressTimerRef.current = window.setTimeout(() => {
        progressTimerRef.current = null;
        lastProgressCheckRef.current = performance.now();
        calculateProgress();
      }, PROGRESS_CHECK_INTERVAL - elapsed);
    },
    [calculateProgress],
  );

  useEffect(() => {
    repaintCanvases();

    const arena = arenaRef.current;
    const resizeObserver = new ResizeObserver(repaintCanvases);

    if (arena) {
      resizeObserver.observe(arena);
    }

    window.addEventListener("resize", repaintCanvases);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", repaintCanvases);
    };
  }, [repaintCanvases]);

  useEffect(() => {
    repaintCanvases();
  }, [phase, repaintCanvases]);

  useEffect(
    () => () => {
      if (progressTimerRef.current !== null) {
        window.clearTimeout(progressTimerRef.current);
      }
    },
    [],
  );

  const startRound = () => {
    strokesRef.current = [];
    currentStrokeRef.current = null;
    progressRef.current = 0;
    hasWonRef.current = false;
    phaseRef.current = "playing";
    isDraggingRef.current = false;
    lastProgressCheckRef.current = 0;

    setProgress(0);
    setIsDragging(false);
    setLavashPosition(null);
    setPhase("playing");
    repaintCanvases();
  };

  const getPointerPosition = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ): Point => {
    const rect = event.currentTarget.getBoundingClientRect();

    return {
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
    };
  };

  const eraseLatestSegment = (from: Point, to: Point) => {
    const canvas = canvasRef.current;
    const progressCanvas = progressCanvasRef.current;
    const { width, height } = canvasSizeRef.current;
    const context = canvas?.getContext("2d");
    const progressContext = progressCanvas?.getContext("2d", {
      willReadFrequently: true,
    });

    if (!canvas || !context || !progressCanvas || !progressContext) {
      return;
    }

    eraseSegment(context, from, to, width, height, getBrushSize(width, height));
    eraseSegment(
      progressContext,
      from,
      to,
      progressCanvas.width,
      progressCanvas.height,
      getBrushSize(width, height) * (progressCanvas.width / width),
    );
  };

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    if (phaseRef.current !== "playing" || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const point = getPointerPosition(event);
    const stroke = { points: [point] };

    strokesRef.current.push(stroke);
    currentStrokeRef.current = stroke;
    isDraggingRef.current = true;
    setIsDragging(true);
    setLavashPosition(point);
    eraseLatestSegment(point, point);
    scheduleProgressCheck();
  };

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    const stroke = currentStrokeRef.current;

    if (!isDraggingRef.current || !stroke || phaseRef.current !== "playing") {
      return;
    }

    event.preventDefault();
    const point = getPointerPosition(event);
    const previousPoint = stroke.points[stroke.points.length - 1];

    stroke.points.push(point);
    setLavashPosition(point);
    eraseLatestSegment(previousPoint, point);
    scheduleProgressCheck();
  };

  const finishPointerStroke = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    if (!isDraggingRef.current) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    currentStrokeRef.current = null;
    isDraggingRef.current = false;
    setIsDragging(false);
    setLavashPosition(null);
    scheduleProgressCheck(true);
  };

  return (
    <main className="screen armenia-game-screen">
      <section className="armenia-game" aria-label="Армянское застолье">
        <header className="armenia-game__header">
          <button className="back-button" type="button" onClick={onBack}>
            ← НА РАЗВИЛКУ
          </button>
          <div
            className="armenia-game__progress"
            role="progressbar"
            aria-label="Очищенная часть экрана"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            ОЧИЩЕНО <strong>{progress}%</strong>
          </div>
        </header>

        <div className="armenia-arena" ref={arenaRef}>
          <img
            className="armenia-reveal"
            src={armeniaBackground}
            alt="Каскад в Ереване"
            draggable={false}
          />
          <canvas
            className={`armenia-mask${isDragging ? " is-dragging" : ""}`}
            ref={canvasRef}
            aria-label="Слой армянского застолья. Зажмите мышь и стирайте его лавашом."
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishPointerStroke}
            onPointerCancel={finishPointerStroke}
            onContextMenu={(event) => event.preventDefault()}
          />

          {lavashPosition && phase === "playing" ? (
            <span
              className="lavash-cursor"
              style={{
                left: `${lavashPosition.x * 100}%`,
                top: `${lavashPosition.y * 100}%`,
              }}
              aria-hidden="true"
            >
              {gameAssets.lavash}
            </span>
          ) : null}

          {phase === "playing" ? (
            <p className="armenia-arena__hint">
              ЗАЖМИ МЫШЬ И ПРОТРИ ЭКРАН ЛАВАШОМ
            </p>
          ) : null}

          {phase === "ready" ? (
            <div className="armenia-overlay">
              <div className="armenia-overlay__card">
                <span className="armenia-overlay__emoji" aria-hidden="true">
                  {gameAssets.lavash} 🥩 🍅
                </span>
                <p className="eyebrow">После большого застолья</p>
                <h2>Пора прибраться после застолья.</h2>
                <p>
                  Зажми мышь и протирай экран лавашом. Очисти хотя бы 75%.
                </p>
                <div className="game-intro-actions">
                  <button
                    className="primary-button"
                    type="button"
                    onClick={startRound}
                  >
                    ВЗЯТЬ ЛАВАШ
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
            <div className="armenia-overlay armenia-overlay--won">
              <div className="armenia-overlay__card armenia-overlay__card--won">
                <span className="armenia-overlay__emoji" aria-hidden="true">
                  {gameAssets.armeniaFlag} {gameAssets.lavash}
                </span>
                <p className="eyebrow">Найдено</p>
                <h2>Кажется, под шашлыком была Армения.</h2>
                <button
                  className="primary-button"
                  type="button"
                  onClick={onClaim}
                >
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
