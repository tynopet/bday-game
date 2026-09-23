interface GameLoaderProps {
  progress: number;
}

export function GameLoader({ progress }: GameLoaderProps) {
  return (
    <main className="screen game-loader" aria-live="polite" aria-busy="true">
      <div className="game-loader__content">
        <span className="game-loader__gift" aria-hidden="true">
          🎁
        </span>
        <p className="game-loader__title">Игра загружается</p>
        <div
          className="game-loader__track"
          role="progressbar"
          aria-label="Загрузка игры"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <span
            className="game-loader__progress"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="game-loader__percent">{progress}%</span>
      </div>
    </main>
  );
}
