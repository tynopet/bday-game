import { useState } from "react";

import { DesktopGuard } from "./components/DesktopGuard";
import { stopAllSounds } from "./audio/audio";
import { ArmeniaGameScreen } from "./games/ArmeniaGameScreen";
import { JapanGameScreen } from "./games/JapanGameScreen";
import { PuppyGameScreen } from "./games/PuppyGameScreen";
import { CertificateScreen } from "./screens/CertificateScreen";
import { IntroScreen } from "./screens/IntroScreen";
import { MapScreen } from "./screens/MapScreen";
import type { GameState, Gift, Screen } from "./types/game";

const initialGameState: GameState = {
  screen: "intro",
  selectedGift: null,
  completedGames: [],
};

export function App() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);

  const startGame = () => {
    setGameState((state) => ({ ...state, screen: "map" }));
  };

  const selectGift = (gift: Gift) => {
    const giftScreens: Record<Gift, Screen> = {
      puppy: "puppy-game",
      armenia: "armenia-game",
      japan: "japan-game",
    };

    stopAllSounds();
    setGameState((state) => ({
      ...state,
      screen: giftScreens[gift],
      selectedGift: gift,
    }));
  };

  const returnToMap = () => {
    stopAllSounds();
    setGameState((state) => ({
      ...state,
      screen: "map",
      selectedGift: null,
    }));
  };

  const completeGame = (gift: Gift) => {
    setGameState((state) => ({
      ...state,
      completedGames: state.completedGames.includes(gift)
        ? state.completedGames
        : [...state.completedGames, gift],
    }));
  };

  const claimGift = (gift: Gift) => {
    setGameState((state) => ({
      ...state,
      screen: "certificate",
      selectedGift: gift,
    }));
  };

  const chooseGift = () => {
    window.print();
  };

  const renderScreen = () => {
    if (gameState.screen === "intro") {
      return <IntroScreen onStart={startGame} />;
    }

    if (gameState.screen === "map") {
      return (
        <MapScreen
          completedGames={gameState.completedGames}
          onSelectGift={selectGift}
        />
      );
    }

    if (
      gameState.screen === "puppy-game" &&
      gameState.selectedGift === "puppy"
    ) {
      return (
        <PuppyGameScreen
          isCompleted={gameState.completedGames.includes("puppy")}
          onWin={() => completeGame("puppy")}
          onClaim={() => claimGift("puppy")}
          onBack={returnToMap}
        />
      );
    }

    if (
      gameState.screen === "armenia-game" &&
      gameState.selectedGift === "armenia"
    ) {
      return (
        <ArmeniaGameScreen
          isCompleted={gameState.completedGames.includes("armenia")}
          onWin={() => completeGame("armenia")}
          onClaim={() => claimGift("armenia")}
          onBack={returnToMap}
        />
      );
    }

    if (
      gameState.screen === "japan-game" &&
      gameState.selectedGift === "japan"
    ) {
      return (
        <JapanGameScreen
          isCompleted={gameState.completedGames.includes("japan")}
          onWin={() => completeGame("japan")}
          onClaim={() => claimGift("japan")}
          onBack={returnToMap}
        />
      );
    }

    if (
      gameState.screen === "certificate" &&
      gameState.selectedGift
    ) {
      return (
        <CertificateScreen
          gift={gameState.selectedGift}
          onChoose={chooseGift}
          onBack={returnToMap}
        />
      );
    }

    return (
      <MapScreen
        completedGames={gameState.completedGames}
        onSelectGift={selectGift}
      />
    );
  };

  return <DesktopGuard>{renderScreen()}</DesktopGuard>;
}
