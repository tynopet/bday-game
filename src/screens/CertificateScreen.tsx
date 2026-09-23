import { gameAssets } from "../assets/gameAssets";
import type { Gift } from "../types/game";

interface CertificateScreenProps {
  gift: Gift;
  onChoose: () => void;
  onBack: () => void;
}

interface CertificateCopy {
  heading: string;
  title: string;
  body: string;
  note: string;
}

interface CertificateVisuals {
  corner: string;
  seal: string;
  divider: string;
}

const certificateCopy: Record<Gift, CertificateCopy> = {
  puppy: {
    heading: "СЕРТИФИКАТ",
    title: "НА ОДНОГО ЩЕНКА",
    body: "Настоящим подтверждается право предъявителя на одного щенка.",
    note: "Порода и конкретный щенок выбираются совместно.",
  },
  armenia: {
    heading: "СЕРТИФИКАТ",
    title: "НА ПОЕЗДКУ В АРМЕНИЮ",
    body: "Поездка для двух человек.",
    note: "Маршрут и даты выбираются совместно.",
  },
  japan: {
    heading: "СЕРТИФИКАТ",
    title: "НА ПОЕЗДКУ В ЯПОНИЮ",
    body: "Поездка в Японию для двух человек.",
    note: "Даты и маршрут выбирает владелец сертификата.",
  },
};

const certificateVisuals: Record<Gift, CertificateVisuals> = {
  puppy: {
    corner: gameAssets.paw,
    seal: gameAssets.puppy,
    divider: gameAssets.paw,
  },
  armenia: {
    corner: "✦",
    seal: gameAssets.armeniaFlag,
    divider: "◆",
  },
  japan: {
    corner: "🌸",
    seal: "🗻",
    divider: "✦",
  },
};

export function CertificateScreen({
  gift,
  onChoose,
  onBack,
}: CertificateScreenProps) {
  const copy = certificateCopy[gift];
  const visuals = certificateVisuals[gift];

  return (
    <main className={`screen certificate-screen certificate-screen--${gift}`}>
      <section className="certificate" aria-labelledby="certificate-title">
        <div className="certificate__inner">
          <span className="certificate__corner certificate__corner--top-left">
            {visuals.corner}
          </span>
          <span className="certificate__corner certificate__corner--top-right">
            {visuals.corner}
          </span>
          <span className="certificate__corner certificate__corner--bottom-left">
            {visuals.corner}
          </span>
          <span className="certificate__corner certificate__corner--bottom-right">
            {visuals.corner}
          </span>

          <p className="certificate__heading">{copy.heading}</p>
          <span className="certificate__seal" aria-hidden="true">
            {visuals.seal}
          </span>
          <h1 id="certificate-title">{copy.title}</h1>
          <p className="certificate__body">{copy.body}</p>
          <div className="certificate__divider" aria-hidden="true">
            ✦ {visuals.divider} ✦
          </div>
          <p className="certificate__note">{copy.note}</p>
        </div>
      </section>

      <div className="certificate-actions">
        <button className="primary-button" type="button" onClick={onChoose}>
          Я ВЫБИРАЮ ЭТО
        </button>
        <button className="secondary-button" type="button" onClick={onBack}>
          ВЕРНУТЬСЯ НА РАЗВИЛКУ
        </button>
      </div>
    </main>
  );
}
