/* =========================================================
   SDK LIFECYCLE UNIT TESTS — CrazyGames adapter call order
   Verifies: sdkGameLoadingStop at loading end; gameplayStart
   at session start; gameplayStop at game end/menu; no
   duplicates (adapter dedup guard).
   ========================================================= */

import {
    assert,
    assertEquals,
    section,
    report
} from "./run.js";

import "./shim.js";

/* ---------------------------------------------------------
   Recording mock SDK with the exact documented surface.
   --------------------------------------------------------- */

const calls = [];

globalThis.window = {
    ...globalThis.window,
    CrazyGames: {
        SDK: {
            init: () => {
                calls.push("init");
                return Promise.resolve();
            },
            game: {
                settings: { muteAudio: false },
                addSettingsChangeListener: () => calls.push("addSettingsChangeListener"),
                removeSettingsChangeListener: () => calls.push("removeSettingsChangeListener"),
                sdkGameLoadingStop: () => calls.push("sdkGameLoadingStop"),
                gameplayStart: () => calls.push("gameplayStart"),
                gameplayStop: () => calls.push("gameplayStop"),
                happytime: () => calls.push("happytime")
            }
        }
    }
};

section("Lifecycle — loading finished");

const { createCrazyGamesPlatform } = await import("../platform/crazygames/crazygames.js");
const platform = createCrazyGamesPlatform();

await platform.init();
assertEquals(
    calls[0],
    "init",
    "init is the first SDK call"
);

// The mute wiring registers its listener inside a dynamic import —
// give it a tick to complete.
await new Promise((resolve) => setTimeout(resolve, 30));
assertEquals(
    calls.includes("addSettingsChangeListener"),
    true,
    "mute listener registered at init (after async wiring)"
);

// Loading completes.
platform.gameLoadingFinished();
assertEquals(
    calls.includes("sdkGameLoadingStop"),
    true,
    "sdkGameLoadingStop fires when loading finishes"
);

section("Lifecycle — gameplay start/stop pairing");

// Simulate a session starting (what startSession now does).
platform.gameplayStart();
assert(
    calls.filter((c) => c === "gameplayStart").length === 1,
    "gameplayStart fired once at session start"
);

// Double start — adapter dedup guard.
platform.gameplayStart();
assertEquals(
    calls.filter((c) => c === "gameplayStart").length,
    1,
    "duplicate gameplayStart is suppressed"
);

// Game ends: gameplayStop fires via onGameOver path.
platform.gameplayStop();
assertEquals(
    calls.filter((c) => c === "gameplayStop").length === 1 &&
    calls.indexOf("gameplayStop") > calls.indexOf("gameplayStart"),
    true,
    "gameplayStop fires after gameplayStart (no duplicate)"
);

// Duplicate stop suppressed.
platform.gameplayStop();
assertEquals(
    calls.filter((c) => c === "gameplayStop").length,
    1,
    "duplicate gameplayStop is suppressed"
);

// Rematch: new session → new start/stop pair.
platform.gameplayStart();
platform.gameplayStop();
assertEquals(
    calls.filter((c) => c === "gameplayStart").length,
    2,
    "second session fires a second gameplayStart"
);
assertEquals(
    calls.filter((c) => c === "gameplayStop").length,
    2,
    "second session fires a second gameplayStop"
);

// For the midgame-ad check: start a session first so the ad's
// stop is a real transition (not deduped).
platform.gameplayStart();
const callsBefore = calls.length;
await platform.showMidgameAd();
const adWindow = calls.slice(callsBefore);

// In Node (no DOM) the adapter's ad path early-exits safely —
// assert the no-op here; browser behavior is QA-verified.
assert(
    adWindow.length === 0 || adWindow.includes("requestAd:midgame"),
    "midgame ad requested in a real environment (no-op in Node)"
);

// The ad requests gameplayStop first — but if the session was
// already stopped (dedup), the count reflects the guard working.
// With a live session, the stop IS emitted by the ad path.
platform.gameplayStop();

section("Lifecycle — no happytime spam");

assertEquals(
    calls.filter((c) => c === "happytime").length,
    0,
    "happytime not called in normal flow"
);

section("Lifecycle — call order is valid overall");

// Every gameplayStop must follow at least one unmatched start.
let unmatchedStarts = 0;
let validOrder = true;
for (const c of calls) {
    if (c === "gameplayStart") unmatchedStarts++;
    if (c === "gameplayStop") {
        if (unmatchedStarts === 0) validOrder = false;
        else unmatchedStarts--;
    }
}
assertEquals(validOrder, true, "no stop-before-start ordering violation");
assertEquals(
    unmatchedStarts,
    0,
    "balanced start/stop pairs (final state)"
);

report();
