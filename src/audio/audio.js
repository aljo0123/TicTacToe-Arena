/* =========================================================
   AUDIO — WebAudio synthesized sound engine
   No external files: all sounds are generated, so loading is
   instant and there are no licensing concerns. The context
   unlocks on the first user gesture (browser autoplay rules).
   ========================================================= */

import { loadSettings, saveJSON } from "../storage/storage.js";

let ctx = null;
let settings = null;
let masterGain = null;
let sfxGain = null;
let musicGain = null;
let musicNodes = [];
let musicPlaying = false;
let platformMuted = false;

function ensureLoaded() {
    if (settings === null) settings = loadSettings();
    return settings;
}

/* ---------------------------------------------------------
   Context lifecycle
   --------------------------------------------------------- */

export function initAudio() {
    const s = ensureLoaded();

    if (ctx === null) {
        try {
            const AudioContextClass =
                window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;

            ctx = new AudioContextClass();

            masterGain = ctx.createGain();
            sfxGain = ctx.createGain();
            musicGain = ctx.createGain();

            sfxGain.connect(masterGain);
            musicGain.connect(masterGain);
            masterGain.connect(ctx.destination);

            applyVolumes();
        } catch (error) {
            // No audio support — the game still works silently.
            ctx = null;
        }
    }

    // Resume after a gesture (Chrome/Safari autoplay policy).
    if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => { });
    }
}

function applyVolumes() {
    if (!ctx) return;
    masterGain.gain.value = settings.masterVolume;
    sfxGain.gain.value = settings.sfxVolume * (settings.soundEnabled ? 1 : 0);
    musicGain.gain.value = settings.musicVolume * (settings.soundEnabled ? 1 : 0);

    // Platform mute override sits ABOVE user settings: portals such as
    // CrazyGames can force silence without touching saved preferences.
    if (platformMuted) {
        masterGain.gain.value = 0;
        sfxGain.gain.value = 0;
        musicGain.gain.value = 0;
    }
}

/* ---------------------------------------------------------
   Sound primitives
   --------------------------------------------------------- */

function tone({
    frequency = 440,
    type = "sine",
    duration = 0.1,
    volume = 0.5,
    delay = 0,
    slideTo = null,
    destination = null,
    attack = 0.01,
    detune = 0
}) {
    if (!ctx) return;

    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (detune) osc.detune.setValueAtTime(detune, start);

    if (slideTo !== null) {
        osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    }

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(destination || sfxGain);

    osc.start(start);
    osc.stop(start + duration + 0.05);
}

/** Soft filtered noise burst — adds texture to UI actions. */
function noiseBurst({ duration = 0.08, volume = 0.12, delay = 0 }) {
    if (!ctx) return;

    const start = ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1800;

    const gain = ctx.createGain();
    gain.gain.value = volume;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGain);

    src.start(start);
}

/* ---------------------------------------------------------
   Named effects
   --------------------------------------------------------- */

export const SFX = {
    click() {
        noiseBurst({ duration: 0.05, volume: 0.10 });
        tone({ frequency: 660, type: "triangle", duration: 0.05, volume: 0.28 });
    },
    move() {
        // Two-layer: body + harmonic sparkle.
        tone({
            frequency: 340,
            slideTo: 520,
            type: "sine",
            duration: 0.12,
            volume: 0.42
        });
        tone({
            frequency: 680,
            type: "triangle",
            duration: 0.08,
            volume: 0.12,
            delay: 0.02
        });
        noiseBurst({ duration: 0.06, volume: 0.08 });
    },
    aiMove() {
        tone({
            frequency: 262,
            slideTo: 196,
            type: "sine",
            duration: 0.14,
            volume: 0.38
        });
        tone({
            frequency: 130,
            type: "triangle",
            duration: 0.10,
            volume: 0.12,
            delay: 0.01
        });
    },
    win() {
        // Rising major arpeggio + octave shimmer.
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, i) => {
            tone({
                frequency: freq,
                type: "triangle",
                duration: 0.22,
                volume: 0.38,
                delay: i * 0.09
            });
            tone({
                frequency: freq * 2,
                type: "sine",
                duration: 0.30,
                volume: 0.10,
                delay: i * 0.09 + 0.03
            });
        });
    },
    draw() {
        tone({ frequency: 330, type: "sine", duration: 0.25, volume: 0.35 });
        tone({ frequency: 262, type: "sine", duration: 0.3, volume: 0.3, delay: 0.12 });
    },
    lose() {
        tone({
            frequency: 300,
            slideTo: 150,
            type: "sawtooth",
            duration: 0.35,
            volume: 0.25
        });
    },
    achievement() {
        const notes = [659.25, 830.61, 987.77, 1318.5];
        notes.forEach((freq, i) => {
            tone({
                frequency: freq,
                type: "sine",
                duration: 0.18,
                volume: 0.32,
                delay: i * 0.08
            });
            tone({
                frequency: freq,
                type: "triangle",
                duration: 0.12,
                volume: 0.10,
                delay: i * 0.08 + 0.02,
                detune: 6
            });
        });
    },
    timerTick() {
        tone({ frequency: 900, type: "square", duration: 0.04, volume: 0.10 });
    },
    timerExpired() {
        tone({
            frequency: 440,
            slideTo: 220,
            type: "square",
            duration: 0.3,
            volume: 0.22
        });
        noiseBurst({ duration: 0.18, volume: 0.10, delay: 0.02 });
    }
};

export function play(name) {
    const s = ensureLoaded();
    if (!s.soundEnabled) return;
    if (!ctx) return;
    if (ctx.state === "suspended") {
        // Can't play before the gesture — skip silently.
        return;
    }
    const effect = SFX[name];
    if (effect) {
        try {
            effect();
        } catch (error) {
            // Never let audio break gameplay.
        }
    }
}

/* ---------------------------------------------------------
   Ambient music — soft generative pad loop, optional
   --------------------------------------------------------- */

const MUSIC_SCALE = [261.63, 311.13, 349.23, 392.0, 466.16, 523.25];

function musicStep() {
    if (!musicPlaying || !ctx) return;

    const freq = MUSIC_SCALE[Math.floor(Math.random() * MUSIC_SCALE.length)];

    tone({
        frequency: freq,
        type: "sine",
        duration: 2.2,
        volume: 0.16,
        destination: musicGain
    });
    tone({
        frequency: freq * 1.5,
        type: "sine",
        duration: 2.4,
        volume: 0.06,
        delay: 0.3,
        destination: musicGain
    });

    setTimeout(musicStep, 1400 + Math.random() * 1200);
}

export function startMusic() {
    const s = ensureLoaded();
    if (!s.musicEnabled || musicPlaying) return;
    if (!ctx || ctx.state === "suspended") return;

    musicPlaying = true;
    musicStep();
}

export function stopMusic() {
    musicPlaying = false;
    musicNodes = [];
}

/* ---------------------------------------------------------
   Settings
   --------------------------------------------------------- */

export function getSettings() {
    return { ...ensureLoaded() };
}

export function updateSettings(patch) {
    const s = ensureLoaded();
    Object.assign(s, patch);
    saveJSON("settings", s);
    applyVolumes();
    if (!s.musicEnabled) stopMusic();
    return { ...s };
}

export function toggleSound() {
    const s = ensureLoaded();
    const next = updateSettings({ soundEnabled: !s.soundEnabled });
    return next.soundEnabled;
}

/**
 * Platform mute override (e.g. CrazyGames `muteAudio` setting).
 * Layers above user settings and NEVER modifies saved preferences:
 * unmuting restores exactly what the user had configured, and a
 * user-disabled sound toggle stays disabled.
 */
export function setPlatformMuted(muted) {
    platformMuted = !!muted;
    applyVolumes();
}

export function isPlatformMuted() {
    return platformMuted;
}

/** Called when the tab loses focus or an ad starts. */
export function duckForInterruption() {
    if (!ctx) return;
    try {
        masterGain.gain.value = 0;
    } catch (error) {
        // ignore
    }
}

/** Called when returning from an interruption. */
export function restoreFromInterruption() {
    applyVolumes();
}
