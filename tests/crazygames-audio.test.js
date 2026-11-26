/* =========================================================
   CRAZYGAMES AUDIO MUTING TESTS
   Verifies the documented SDK v3 muteAudio integration:
   - platform mute silences audio without touching saved settings
   - unmute restores user-configured state exactly
   - listener wiring uses only documented methods
   - no CrazyGames terms leak into web/poki builds
   ========================================================= */

import {
    assert,
    assertEquals,
    section,
    report
} from "./run.js";

import "./shim.js";

/* ---------------------------------------------------------
   Minimal WebAudio stub so audio.js can create its graph.
   --------------------------------------------------------- */

function makeGainStub() {
    return {
        gain: { value: 1 },
        connect: () => { },
        disconnect: () => { }
    };
}

globalThis.AudioContext = class {
    constructor() {
        this.currentTime = 0;
        this.state = "running";
        this.destination = {};
        this._resumeCalled = false;
    }
    resume() {
        this._resumeCalled = true;
        return Promise.resolve();
    }
    createGain() {
        return makeGainStub();
    }
};

section("Audio — platform mute layer");

const audio = await import("../src/audio/audio.js");

// Saved user settings: sound on, music off, some volumes.
audio.updateSettings({
    soundEnabled: true,
    musicEnabled: false,
    masterVolume: 0.7,
    sfxVolume: 0.9,
    musicVolume: 0.4
});

const saved = audio.getSettings();

audio.setPlatformMuted(true);
assertEquals(audio.isPlatformMuted(), true, "platform mute engages");
assertEquals(audio.getSettings().soundEnabled, true, "mute does NOT change saved soundEnabled");
assertEquals(audio.getSettings().masterVolume, 0.7, "mute does NOT change saved masterVolume");
assertEquals(audio.getSettings().sfxVolume, 0.9, "mute does NOT change saved sfxVolume");
assertEquals(audio.getSettings().musicVolume, 0.4, "mute does NOT change saved musicVolume");

audio.setPlatformMuted(false);
assertEquals(audio.isPlatformMuted(), false, "platform unmute disengages");
assertEquals(audio.getSettings().soundEnabled, true, "unmute restores soundEnabled as user had it");
assertEquals(audio.getSettings().masterVolume, 0.7, "unmute restores masterVolume");
assertEquals(audio.getSettings().sfxVolume, 0.9, "unmute restores sfxVolume");
assertEquals(audio.getSettings().musicVolume, 0.4, "unmute restores musicVolume");

// User had manually disabled sound: unmute must NOT re-enable it.
audio.updateSettings({ soundEnabled: false });
audio.setPlatformMuted(true);
audio.setPlatformMuted(false);
assertEquals(
    audio.getSettings().soundEnabled,
    false,
    "unmute does not override a user-disabled sound toggle"
);

// Restore for later suites.
audio.updateSettings({ soundEnabled: true });

section("CrazyGames adapter — documented API wiring");

// Fake SDK exposing exactly the documented surface.
const listenerRegistry = { callbacks: [] };

globalThis.window = {
    ...globalThis.window,
    CrazyGames: {
        SDK: {
            init: () => Promise.resolve(),
            game: {
                settings: { muteAudio: true },
                addSettingsChangeListener: (cb) => {
                    listenerRegistry.callbacks.push(cb);
                },
                removeSettingsChangeListener: (cb) => {
                    listenerRegistry.callbacks = listenerRegistry.callbacks.filter((c) => c !== cb);
                }
            }
        }
    }
};

const { createCrazyGamesPlatform } = await import("../platform/crazygames/crazygames.js");
const platform = createCrazyGamesPlatform();

await platform.init();

// Wait for the dynamic import + initial mute application.
await new Promise((resolve) => setTimeout(resolve, 50));

assertEquals(audio.isPlatformMuted(), true, "initial muteAudio=true is applied at init");
assertEquals(listenerRegistry.callbacks.length, 1, "one settings-change listener registered");

// Portal unmutes: the game must restore user audio.
listenerRegistry.callbacks.forEach((cb) => cb({ muteAudio: false }));
assertEquals(audio.isPlatformMuted(), false, "listener applies portal unmute");

// Portal mutes again mid-session.
listenerRegistry.callbacks.forEach((cb) => cb({ muteAudio: true }));
assertEquals(audio.isPlatformMuted(), true, "listener applies portal mute");

// Listener removal works (destroy path).
platform.destroy();
await new Promise((resolve) => setTimeout(resolve, 20));
assertEquals(listenerRegistry.callbacks.length, 0, "destroy removes the settings listener");

section("Build isolation — no cross-adapter leakage");

import fs from "fs";

const pokiSource = fs.readFileSync("platform/poki/poki.js", "utf8");
const webSource = fs.readFileSync("platform/web/web.js", "utf8");
const crazySource = fs.readFileSync("platform/crazygames/crazygames.js", "utf8");

assertEquals(
    /CrazyGames/i.test(pokiSource),
    false,
    "Poki adapter contains no CrazyGames references"
);
assertEquals(
    /CrazyGames/i.test(webSource),
    false,
    "Web adapter contains no CrazyGames references"
);

assertEquals(
    /PokiSDK|game-cdn\.poki/i.test(crazySource),
    false,
    "CrazyGames adapter contains no Poki references"
);
assertEquals(
    /PokiSDK|game-cdn\.poki/i.test(webSource),
    false,
    "Web adapter contains no Poki references"
);

// The mute wiring must live ONLY in the crazygames adapter.
assertEquals(
    /muteAudio/.test(webSource + pokiSource),
    false,
    "muteAudio wiring exists only in the CrazyGames adapter"
);

// Built packages must contain only their own adapter.
const distPoki = fs.readFileSync("dist/poki/poki/poki.js", "utf8");
const distCrazy = fs.readFileSync("dist/crazygames/crazygames/crazygames.js", "utf8");
const distWeb = fs.readFileSync("dist/web/platform/web/web.js", "utf8");

assertEquals(
    /CrazyGames/i.test(distPoki),
    false,
    "dist/poki contains no CrazyGames adapter"
);
assertEquals(
    /PokiSDK|game-cdn\.poki/i.test(distCrazy),
    false,
    "dist/crazygames contains no Poki adapter"
);
assertEquals(
    /PokiSDK|CrazyGames/i.test(distWeb),
    false,
    "dist/web contains no portal adapters"
);

// Sanity: the CrazyGames dist build DOES contain the mute wiring.
assertEquals(
    /muteAudio/.test(distCrazy),
    true,
    "dist/crazygames contains the muteAudio integration"
);

report();
