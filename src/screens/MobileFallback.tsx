export function MobileFallback() {
  return (
    <main className="screen mobile-fallback">
      <section className="mobile-fallback__card" aria-labelledby="fallback-title">
        <span className="mobile-fallback__icon" aria-hidden="true">
          💻
        </span>
        <h1 id="fallback-title">Oops!</h1>
        <p>Эта штука работает только на компьютере.</p>
        <p>Открой ссылку на ноутбуке 💻</p>
      </section>
    </main>
  );
}

