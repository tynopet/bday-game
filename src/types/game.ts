export type Screen =
  | "intro"
  | "map"
  | "puppy-game"
  | "armenia-game"
  | "japan-game"
  | "certificate"
  | "final";

export type Gift = "puppy" | "armenia" | "japan";

export interface GameState {
  screen: Screen;
  selectedGift: Gift | null;
  completedGames: Gift[];
}

