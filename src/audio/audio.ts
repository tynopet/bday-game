import { Howl, Howler } from "howler";

import armeniaHintSource from "../assets/audio/armenia-hint.wav";
import japanHintSource from "../assets/audio/japan-hint.ogg";
import puppyHintSource from "../assets/audio/puppy-hint.mp3";

export type SoundId = "puppyHint" | "armeniaHint" | "japanHint";
export type GachaSoundId = "button" | "prize" | "special" | "jackpot";
export type PuppySoundId = "spawn" | "catch" | "miss" | "win" | "lose";

interface SoundDefinition {
  source: string;
  duration: number;
  volume: number;
}

const soundDefinitions: Record<SoundId, SoundDefinition> = {
  puppyHint: {
    source: puppyHintSource,
    duration: 2700,
    volume: 0.8,
  },
  armeniaHint: {
    source: armeniaHintSource,
    duration: 4000,
    volume: 1,
  },
  japanHint: {
    source: japanHintSource,
    duration: 2800,
    volume: 0.78,
  },
};

const sounds: Partial<Record<SoundId, Howl>> = {};
const activeGachaSources = new Set<AudioScheduledSourceNode>();
const activePuppySources = new Set<AudioScheduledSourceNode>();
let puppyMusicSource: AudioBufferSourceNode | null = null;
let puppyMusicBuffer: AudioBuffer | null = null;
let armeniaMusicSource: AudioBufferSourceNode | null = null;
let armeniaMusicBuffer: AudioBuffer | null = null;

interface ToneOptions {
  frequency: number;
  offset: number;
  duration: number;
  volume: number;
  type?: OscillatorType;
  endFrequency?: number;
}

function stopSources(sources: Set<AudioScheduledSourceNode>): void {
  sources.forEach((source) => {
    try {
      source.stop();
    } catch {
      // The source may already have finished between scheduling and cleanup.
    }
  });
  sources.clear();
}

function stopGachaSounds(): void {
  stopSources(activeGachaSources);
}

function addTone(
  context: AudioContext,
  output: AudioNode,
  { frequency, offset, duration, volume, type = "sine", endFrequency }: ToneOptions,
  sources = activeGachaSources,
): void {
  const startAt = context.currentTime + offset;
  const endAt = startAt + duration;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  if (endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, endAt);
  }

  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, endAt);

  oscillator.connect(envelope);
  envelope.connect(output);
  oscillator.addEventListener("ended", () => sources.delete(oscillator));
  sources.add(oscillator);
  oscillator.start(startAt);
  oscillator.stop(endAt + 0.02);
}

function getAudioContext(): AudioContext | null {
  const context = Howler.ctx;

  if (context?.state === "suspended") {
    void context.resume();
  }

  return context ?? null;
}

function createPuppyMusicBuffer(context: AudioContext): AudioBuffer {
  const stepDuration = 0.24;
  const melody = [
    659.25, 0, 783.99, 659.25, 523.25, 0, 587.33, 659.25,
    783.99, 0, 880, 783.99, 659.25, 587.33, 523.25, 0,
  ];
  const bass = [130.81, 130.81, 146.83, 146.83, 174.61, 164.81, 146.83, 123.47];
  const duration = melody.length * stepDuration;
  const frameCount = Math.ceil(duration * context.sampleRate);
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const channel = buffer.getChannelData(0);

  for (let frame = 0; frame < frameCount; frame += 1) {
    const time = frame / context.sampleRate;
    const melodyStep = Math.floor(time / stepDuration);
    const bassStep = Math.floor(time / (stepDuration * 2));
    const localMelodyTime = time % stepDuration;
    const localBassTime = time % (stepDuration * 2);
    const melodyFrequency = melody[melodyStep] ?? 0;
    const bassFrequency = bass[bassStep] ?? bass[0];
    const melodyEnvelope = Math.min(localMelodyTime / 0.012, 1) *
      Math.max(0, 1 - localMelodyTime / (stepDuration * 0.88));
    const bassEnvelope = Math.min(localBassTime / 0.02, 1) *
      Math.max(0, 1 - localBassTime / (stepDuration * 1.8));
    const melodyWave = melodyFrequency === 0
      ? 0
      : Math.sign(Math.sin(2 * Math.PI * melodyFrequency * time));
    const bassWave = Math.sin(2 * Math.PI * bassFrequency * time);

    channel[frame] = melodyWave * melodyEnvelope * 0.075 +
      bassWave * bassEnvelope * 0.065;
  }

  return buffer;
}

function createArmeniaMusicBuffer(context: AudioContext): AudioBuffer {
  const stepDuration = 0.42;
  const melody = [
    293.66, 0, 349.23, 392, 440, 392, 349.23, 293.66,
    261.63, 293.66, 349.23, 293.66, 246.94, 0, 261.63, 293.66,
    349.23, 392, 440, 466.16, 440, 392, 349.23, 293.66,
  ];
  const drones = [146.83, 130.81, 123.47];
  const duration = melody.length * stepDuration;
  const frameCount = Math.ceil(duration * context.sampleRate);
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const channel = buffer.getChannelData(0);

  for (let frame = 0; frame < frameCount; frame += 1) {
    const time = frame / context.sampleRate;
    const step = Math.floor(time / stepDuration);
    const localTime = time % stepDuration;
    const frequency = melody[step] ?? 0;
    const droneFrequency = drones[Math.floor(step / 8)] ?? drones[0];
    const noteEnvelope = Math.min(localTime / 0.028, 1) *
      Math.max(0, 1 - localTime / stepDuration);
    const loopEnvelope = Math.min(time / 0.035, (duration - time) / 0.035, 1);
    const melodyWave = frequency === 0
      ? 0
      : Math.sin(2 * Math.PI * frequency * time) +
        Math.sin(2 * Math.PI * frequency * 2 * time) * 0.28 +
        Math.sin(2 * Math.PI * frequency * 3 * time) * 0.1;
    const droneWave =
      Math.sin(2 * Math.PI * droneFrequency * time) * 0.7 +
      Math.sin(2 * Math.PI * droneFrequency * 2 * time) * 0.18;

    channel[frame] = (
      melodyWave * noteEnvelope * 0.07 + droneWave * 0.035
    ) * loopEnvelope;
  }

  return buffer;
}

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

export function playGachaSound(id: GachaSoundId): void {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  const output = context.createGain();
  output.gain.value = 0.28;
  output.connect(context.destination);

  if (id === "button") {
    addTone(context, output, {
      frequency: 220,
      endFrequency: 105,
      offset: 0,
      duration: 0.075,
      volume: 0.7,
      type: "square",
    });
    addTone(context, output, {
      frequency: 95,
      endFrequency: 70,
      offset: 0.018,
      duration: 0.09,
      volume: 0.42,
      type: "triangle",
    });
    return;
  }

  if (id === "prize") {
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      addTone(context, output, {
        frequency,
        offset: index * 0.085,
        duration: index === 3 ? 0.28 : 0.16,
        volume: index === 3 ? 0.56 : 0.42,
        type: index === 3 ? "sine" : "triangle",
      });
    });
    return;
  }

  if (id === "special") {
    stopGachaSounds();
    [392, 523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      addTone(context, output, {
        frequency,
        offset: index * 0.105,
        duration: index === 4 ? 0.5 : 0.2,
        volume: index === 4 ? 0.55 : 0.38,
        type: "triangle",
      });
    });
    [523.25, 659.25, 783.99].forEach((frequency) => {
      addTone(context, output, {
        frequency,
        offset: 0.58,
        duration: 0.48,
        volume: 0.24,
        type: "sine",
      });
    });
    return;
  }

  stopGachaSounds();
  addTone(context, output, {
    frequency: 196,
    endFrequency: 392,
    offset: 0,
    duration: 0.3,
    volume: 0.42,
    type: "sawtooth",
  });
  [783.99, 1046.5, 1318.51, 1567.98, 2093].forEach((frequency, index) => {
    addTone(context, output, {
      frequency,
      offset: 0.08 + index * 0.13,
      duration: index === 4 ? 0.62 : 0.24,
      volume: index === 4 ? 0.5 : 0.34,
      type: "triangle",
    });
  });
  [523.25, 659.25, 783.99, 1046.5].forEach((frequency) => {
    addTone(context, output, {
      frequency,
      offset: 0.76,
      duration: 0.82,
      volume: 0.28,
      type: "sine",
    });
  });
  [2093, 2637.02, 3135.96].forEach((frequency, index) => {
    addTone(context, output, {
      frequency,
      offset: 0.84 + index * 0.14,
      duration: 0.22,
      volume: 0.18,
      type: "sine",
    });
  });
}

export function startPuppyMusic(): void {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  stopPuppyMusic();
  puppyMusicBuffer ??= createPuppyMusicBuffer(context);

  const source = context.createBufferSource();
  const output = context.createGain();
  source.buffer = puppyMusicBuffer;
  source.loop = true;
  output.gain.value = 0.62;
  source.connect(output);
  output.connect(context.destination);
  source.addEventListener("ended", () => {
    if (puppyMusicSource === source) {
      puppyMusicSource = null;
    }
  });
  puppyMusicSource = source;
  source.start();
}

export function stopPuppyMusic(): void {
  if (!puppyMusicSource) {
    return;
  }

  try {
    puppyMusicSource.stop();
  } catch {
    // The music may already have stopped before cleanup runs.
  }
  puppyMusicSource = null;
}

export function playPuppySound(id: PuppySoundId): void {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  const output = context.createGain();
  output.gain.value = 0.3;
  output.connect(context.destination);
  const tone = (options: ToneOptions) =>
    addTone(context, output, options, activePuppySources);

  if (id === "spawn") {
    tone({
      frequency: 520,
      endFrequency: 230,
      offset: 0,
      duration: 0.13,
      volume: 0.5,
      type: "triangle",
    });
    tone({
      frequency: 260,
      endFrequency: 145,
      offset: 0.045,
      duration: 0.14,
      volume: 0.34,
      type: "sine",
    });
    return;
  }

  if (id === "catch") {
    [659.25, 987.77, 1318.51].forEach((frequency, index) => {
      tone({
        frequency,
        offset: index * 0.055,
        duration: index === 2 ? 0.24 : 0.11,
        volume: index === 2 ? 0.5 : 0.38,
        type: "triangle",
      });
    });
    return;
  }

  if (id === "miss") {
    tone({
      frequency: 210,
      endFrequency: 62,
      offset: 0,
      duration: 0.3,
      volume: 0.6,
      type: "sawtooth",
    });
    tone({
      frequency: 105,
      endFrequency: 48,
      offset: 0.08,
      duration: 0.3,
      volume: 0.42,
      type: "triangle",
    });
    return;
  }

  if (id === "win") {
    [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((frequency, index) => {
      tone({
        frequency,
        offset: index * 0.11,
        duration: index === 4 ? 0.72 : 0.22,
        volume: index === 4 ? 0.52 : 0.36,
        type: "triangle",
      });
    });
    [523.25, 659.25, 783.99].forEach((frequency) => {
      tone({
        frequency,
        offset: 0.64,
        duration: 0.66,
        volume: 0.22,
        type: "sine",
      });
    });
    return;
  }

  [392, 349.23, 293.66, 196].forEach((frequency, index) => {
    tone({
      frequency,
      endFrequency: frequency * 0.88,
      offset: 0.18 + index * 0.16,
      duration: index === 3 ? 0.55 : 0.24,
      volume: index === 3 ? 0.5 : 0.34,
      type: index === 3 ? "sawtooth" : "triangle",
    });
  });
}

export function stopPuppyAudio(): void {
  stopPuppyMusic();
  stopSources(activePuppySources);
}

export function startArmeniaMusic(): void {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  stopArmeniaMusic();
  armeniaMusicBuffer ??= createArmeniaMusicBuffer(context);

  const source = context.createBufferSource();
  const output = context.createGain();
  source.buffer = armeniaMusicBuffer;
  source.loop = true;
  output.gain.value = 0.58;
  source.connect(output);
  output.connect(context.destination);
  source.addEventListener("ended", () => {
    if (armeniaMusicSource === source) {
      armeniaMusicSource = null;
    }
  });
  armeniaMusicSource = source;
  source.start();
}

export function stopArmeniaMusic(): void {
  if (!armeniaMusicSource) {
    return;
  }

  try {
    armeniaMusicSource.stop();
  } catch {
    // The music may already have stopped before cleanup runs.
  }
  armeniaMusicSource = null;
}

export function stopSound(id: SoundId): void {
  sounds[id]?.stop();
}

export function stopAllSounds(): void {
  Object.values(sounds).forEach((sound) => sound?.stop());
  stopGachaSounds();
  stopPuppyAudio();
  stopArmeniaMusic();
}
