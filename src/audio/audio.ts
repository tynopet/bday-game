import { Howl, Howler } from "howler";

import armeniaHintSource from "../assets/audio/armenia-hint.ogg";
import japanHintSource from "../assets/audio/japan-hint.ogg";
import puppyHintSource from "../assets/audio/puppy-hint.ogg";

export type SoundId = "puppyHint" | "armeniaHint" | "japanHint";

interface SoundDefinition {
  source: string;
  duration: number;
  volume: number;
}

const soundDefinitions: Record<SoundId, SoundDefinition> = {
  puppyHint: {
    source: puppyHintSource,
    duration: 800,
    volume: 0.8,
  },
  armeniaHint: {
    source: armeniaHintSource,
    duration: 2800,
    volume: 0.72,
  },
  japanHint: {
    source: japanHintSource,
    duration: 2800,
    volume: 0.78,
  },
};

const sounds: Partial<Record<SoundId, Howl>> = {};

function getSound(id: SoundId): Howl {
  if (sounds[id]) {
    return sounds[id];
  }

  const definition = soundDefinitions[id];

  const sound = new Howl({
    src: [definition.source],
    preload: true,
    volume: definition.volume,
    sprite: {
      hint: [0, definition.duration],
    },
    onloaderror: (_soundId, error) => {
      console.warn(`Sound ${id} could not be loaded`, error);
    },
    onplayerror: (_soundId, error) => {
      console.warn(`Sound ${id} could not be played`, error);
    },
  });
  sounds[id] = sound;
  return sound;
}

(Object.keys(soundDefinitions) as SoundId[]).forEach((id) => getSound(id));

export async function unlockAudio(): Promise<void> {
  Howler.autoUnlock = true;

  if (Howler.ctx?.state === "suspended") {
    await Howler.ctx.resume();
  }
}

export function playSound(id: SoundId): void {
  stopAllSounds();
  const sound = getSound(id);
  sound.play("hint");
}

export function stopSound(id: SoundId): void {
  sounds[id]?.stop();
}

export function stopAllSounds(): void {
  Object.values(sounds).forEach((sound) => sound?.stop());
}
