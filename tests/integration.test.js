/* =========================================================
   STORAGE / PROGRESSION / STATE / MODES / PLATFORM TESTS
   ========================================================= */

import {
    assert,
    assertEquals,
    section,
    report
} from "./run.js";

// Browser-global shim must load before any storage-touching module.
import "./shim.js";

import {
    emptyBoard,
    resolveBoard
} from "../src/core/rules.js";

import {
    createInitialState,
    PHASE
} from "../src/core/state.js";

import {
    MODES,
    getMode,
    PUZZLES,
    getDailyPuzzle,
    todayKey
} from "../src/core/modes.js";

import {
    xpForLevel,
    levelFromXp,
    progressWithinLevel,
    xpForResult,
    THEMES,
    MARK_STYLES
} from "../src/progression/xp.js";

import {
    ACHIEVEMENTS
} from "../src/progression/stats.js";

import {
    createPlatformAdapter
} from "../platform/interface.js";

/* ---------------------------------------------------------
   Browser-global shim for Node (loaded FIRST).
   --------------------------------------------------------- */

const store = new Map();

globalThis.window = {
    localStorage: {
        setItem: (k, v) => store.set(k, String(v)),
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        removeItem: (k) => store.delete(k)
    }
};

globalThis.document = {
    addEventListener: () => {},
    hidden: false,
    body: { dataset: {} }
};

const { loadJSON, saveJSON, loadProgress, loadStats } = await import(
    "../src/storage/storage.js"
);

section("Storage — round trip");

const sample = { xp: 50, level: 2 };
saveJSON("progress", sample);
const loaded = loadJSON("progress", null, null);
assertEquals(loaded.xp, 50, "saved value survives a round trip");
assertEquals(loaded.__v, 1, "schema version attached");

section("Storage — corruption handling");

store.set("ttta_progress", "{not valid json!!");
const recovered = loadJSON("progress", { xp: 0, level: 1 }, null);
assertEquals(recovered.xp, 0, "corrupt JSON falls back to default");

section("Storage — schema mismatch");

store.set("ttta_progress", JSON.stringify({ __v: 99, xp: 123 }));
const mismatch = loadJSON("progress", { xp: 0, level: 1 }, null);
assertEquals(mismatch.xp, 0, "old schema version resets to default");

section("Storage — non-object payloads rejected");

store.set("ttta_progress", JSON.stringify("just a string"));
const notObject = loadJSON("progress", { xp: 0, level: 1 }, null);
assertEquals(notObject.xp, 0, "string payload rejected");

section("Storage — validator enforcement");

store.set("ttta_progress", JSON.stringify({ __v: 1, xp: "bad" }));
const invalid = loadJSON(
    "progress",
    { xp: 0, level: 1 },
    (p) => typeof p.xp === "number"
);
assertEquals(invalid.xp, 0, "validator rejects bad types");

section("Progression — level curve");

assertEquals(xpForLevel(1), 0, "level 1 needs 0 xp");
assert(xpForLevel(2) > xpForLevel(1), "level 2 needs more than level 1");
assert(xpForLevel(10) > xpForLevel(9), "curve is strictly increasing");

assertEquals(levelFromXp(0), 1, "0 xp = level 1");
assertEquals(levelFromXp(xpForLevel(5)), 5, "exactly enough xp = that level");
assertEquals(levelFromXp(xpForLevel(5) - 1), 4, "one xp short = previous level");

const progress = progressWithinLevel(xpForLevel(3) + 10);
assert(progress.ratio > 0 && progress.ratio < 1, "ratio within level is 0-1");
assertEquals(progress.level, 3, "progress reports correct level");

section("Progression — XP awards");

const mode = getMode("classic-ai");
const easyWin = xpForResult("classic-ai", "won", "easy");
const impossibleWin = xpForResult("classic-ai", "won", "impossible");
assert(
    impossibleWin > easyWin,
    "impossible wins award more xp than easy wins"
);
assertEquals(
    xpForResult("classic-ai", "draw", "medium"),
    mode.xpOnDraw,
    "draw xp is base amount on medium"
);
assert(xpForResult("classic-local", "won", null) > 0, "local wins award xp");
assertEquals(xpForResult("unknown-mode", "won", null), 0, "unknown mode awards 0");

section("Progression — unlock definitions");

assert(THEMES.length >= 4, "at least four themes exist");
assert(MARK_STYLES.length >= 3, "at least three mark styles exist");
assertEquals(THEMES[0].requiredLevel, 1, "first theme unlocks at level 1");
assertEquals(MARK_STYLES[0].requiredLevel, 1, "first mark unlocks at level 1");

const levels = THEMES.map((t) => t.requiredLevel);
for (let i = 1; i < levels.length; i++) {
    assert(levels[i] > levels[i - 1], "theme unlock levels increase");
}

section("Achievements — definitions");

assertEquals(ACHIEVEMENTS.length, 12, "twelve achievements defined");
const ids = ACHIEVEMENTS.map((a) => a.id);
assertEquals(new Set(ids).size, ids.length, "achievement ids are unique");

section("Game state — initial state");

const initial = createInitialState("classic-ai");
assertEquals(initial.board.length, 9, "initial board has 9 cells");
assertEquals(initial.phase, PHASE.IDLE, "initial phase is idle");
assertEquals(initial.currentPlayer, "X", "X moves first by default");
assertEquals(initial.result, null, "no result initially");

section("Modes — definitions");

assertEquals(Object.keys(MODES).length, 7, "seven game modes defined");
for (const id of Object.keys(MODES)) {
    const m = getMode(id);
    assertEquals(m.id, id, `mode ${id} has consistent id`);
    assert(typeof m.name === "string" && m.name.length > 0, `mode ${id} has a name`);
    assert(
        typeof m.xpOnWin === "number" && m.xpOnWin > 0,
        `mode ${id} awards positive win xp`
    );
}

assertEquals(getMode("nonexistent").id, "classic-ai", "unknown mode falls back to classic-ai");

section("Modes — puzzles are legal");

for (const puzzle of PUZZLES) {
    const board = puzzle.board;
    assertEquals(board.length, 9, `puzzle ${puzzle.id} has 9 cells`);

    // Puzzles must not already be finished.
    assertEquals(
        resolveBoard(board).status,
        "playing",
        `puzzle ${puzzle.id} starts unresolved`
    );

    // Count marks: X to move means X count <= O count.
    const xCount = board.filter((c) => c === "X").length;
    const oCount = board.filter((c) => c === "O").length;
    assert(
        xCount <= oCount,
        `puzzle ${puzzle.id}: X to move with legal counts (X=${xCount}, O=${oCount})`
    );
}

section("Modes — daily selection is deterministic");

const key = todayKey();
const first = getDailyPuzzle(key);
const second = getDailyPuzzle(key);
assertEquals(first.id, second.id, "same day returns the same puzzle");
assert(PUZZLES.includes(first), "daily puzzle comes from the puzzle pool");

// Different dates eventually select different puzzles.
const selected = new Set();
for (let d = 1; d <= 30; d++) {
    const dateKey = `2026-01-${String(d).padStart(2, "0")}`;
    selected.add(getDailyPuzzle(dateKey).id);
}
assert(selected.size > 1, "daily selection varies across days");

section("Platform — base adapter contract");

const base = createPlatformAdapter();
assertEquals(base.id, "unknown", "base adapter has unknown id");

const info = base.getPlatformInfo();
assert(typeof info.supportsFullscreen === "boolean", "platform info has fullscreen flag");

let rewardedResolved = false;
base.showRewardedAd().then((result) => {
    rewardedResolved = true;
    assertEquals(result.rewarded, false, "base adapter never grants rewards");
});

await new Promise((resolve) => setTimeout(resolve, 50));
assert(rewardedResolved, "base rewarded ad resolves");

section("Platform — web adapter (no SDK)");

const { createWebPlatform } = await import("../src/../platform/web/web.js");
const web = createWebPlatform();
assertEquals(web.getPlatformInfo().id, "web", "web adapter identifies as web");

// Lifecycle calls must not throw without an SDK.
let webThrew = false;
try {
    web.gameLoadingFinished();
    web.gameplayStart();
    web.gameplayStop();
    await web.showMidgameAd();
} catch (error) {
    webThrew = true;
}
assertEquals(webThrew, false, "web lifecycle calls never throw");

section("Platform — poki adapter without SDK present");

const { createPokiPlatform } = await import("../platform/poki/poki.js");
const poki = createPokiPlatform();
assertEquals(poki.getPlatformInfo().id, "poki", "poki adapter identifies as poki");
assertEquals(
    poki.getPlatformInfo().supportsRewardedAds,
    false,
    "rewarded ads disabled without SDK"
);

let pokiThrew = false;
try {
    poki.gameplayStart();
    poki.gameplayStop();
    await poki.showMidgameAd();
    const reward = await poki.showRewardedAd();
    assertEquals(reward.rewarded, false, "no reward without SDK");
} catch (error) {
    pokiThrew = true;
}
assertEquals(pokiThrew, false, "poki adapter never throws without SDK");

// Gameplay start/stop deduplication.
poki.gameplayStart();
poki.gameplayStart(); // duplicate must be ignored
poki.gameplayStop();
poki.gameplayStop(); // duplicate must be ignored

section("Platform — crazygames adapter without SDK present");

const { createCrazyGamesPlatform } = await import(
    "../platform/crazygames/crazygames.js"
);
const crazy = createCrazyGamesPlatform();
assertEquals(crazy.getPlatformInfo().id, "crazygames", "crazy adapter identifies as crazygames");

let crazyThrew = false;
try {
    crazy.gameplayStart();
    crazy.gameplayStop();
    await crazy.showMidgameAd();
    const reward = await crazy.showRewardedAd();
    assertEquals(reward.rewarded, false, "no reward without SDK");
} catch (error) {
    crazyThrew = true;
}
assertEquals(crazyThrew, false, "crazygames adapter never throws without SDK");

report();
