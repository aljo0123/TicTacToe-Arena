/* =========================================================
   PHASE 1 TESTS — result banner, final status, ad gating
   ========================================================= */

import {
    assert,
    assertEquals,
    section,
    report
} from "./run.js";

import "./shim.js";

import {
    finalStatusLabel,
    resultBannerCopy
} from "../src/ui/results.js";

import {
    createAdGate
} from "../src/ui/ad-gate.js";

/* ---------------------------------------------------------
   1–2. Final status copy for every ending
   --------------------------------------------------------- */

section("Results — status labels for every ending");

assertEquals(
    finalStatusLabel({ status: "won", winner: "X", line: [0, 1, 2] }, true),
    "You Win!",
    "AI game, X wins → You Win!"
);
assertEquals(
    finalStatusLabel({ status: "won", winner: "O", line: null }, true),
    "AI Wins",
    "AI game, O wins → AI Wins"
);
assertEquals(
    finalStatusLabel({ status: "won", winner: "X", line: null }, false),
    "Player X Wins!",
    "Local game, X wins → Player X Wins!"
);
assertEquals(
    finalStatusLabel({ status: "won", winner: "O", line: null }, false),
    "Player O Wins!",
    "Local game, O wins → Player O Wins!"
);
assertEquals(
    finalStatusLabel({ status: "draw", winner: null, line: null }, true),
    "Draw!",
    "AI game draw → Draw!"
);
assertEquals(
    finalStatusLabel({ status: "draw", winner: null, line: null }, false),
    "Draw!",
    "Local draw → Draw!"
);
assertEquals(
    finalStatusLabel({ status: "timeout", winner: "X" }, true),
    "You Win!",
    "AI timed mode, X wins on timeout → You Win!"
);
assertEquals(
    finalStatusLabel({ status: "timeout", winner: "O" }, true),
    "AI Wins",
    "AI timed mode, O wins on timeout → AI Wins"
);
assertEquals(
    finalStatusLabel({ status: "timeout", winner: "O" }, false),
    "Player O Wins!",
    "Local timed mode, O wins on timeout → Player O Wins!"
);
assertEquals(
    finalStatusLabel(null, true),
    "",
    "null result → empty label"
);

section("Results — banner copy");

const aiWinCopy = resultBannerCopy({ status: "won", winner: "X", line: null }, true);
assertEquals(aiWinCopy.title, "You Win!", "banner title for AI-game win");
assert(aiWinCopy.sub.length > 0, "banner has subtitle text");

const drawCopy = resultBannerCopy({ status: "draw", winner: null, line: null }, false);
assertEquals(drawCopy.title, "Draw!", "banner title for draw");

const timeoutCopy = resultBannerCopy({ status: "timeout", winner: "O" }, false);
assertEquals(timeoutCopy.title, "Player O Wins!", "banner title for local timeout");
assertEquals(timeoutCopy.sub, "The clock ran out.", "banner subtitle for timeout");

/* ---------------------------------------------------------
   3–8. Ad gate behavior
   --------------------------------------------------------- */

section("Ad gate — no ad while banner is open");

const gate = createAdGate();
let adCalls = 0;
const fakePlatform = {
    showMidgameAd: async () => {
        adCalls++;
        return;
    }
};

// Banner opens on game over — no request fires.
gate.bannerOpened();
const r1 = await gate.request(fakePlatform);
assertEquals(r1.requested, false, "no ad while banner open");
assertEquals(adCalls, 0, "platform ad not called while banner open");

// Dismissal via Home/Change Mode arms the ad.
const armed = gate.bannerDismissed();
assertEquals(armed, true, "dismissal arms the ad");

section("Ad gate — request after dismissal");

const r2 = await gate.request(fakePlatform);
assertEquals(r2.requested, true, "ad fires after dismissal");
assertEquals(adCalls, 1, "platform ad called exactly once");

section("Ad gate — duplicate clicks cannot double-fire");

// A second dismissal with no banner open must not arm anything.
const armed2 = gate.bannerDismissed();
assertEquals(armed2, false, "dismissal without banner does not arm");

// New game → banner opens → double dismissal attempts.
gate.bannerOpened();
assertEquals(gate.bannerDismissed(), true, "first dismissal arms");
assertEquals(gate.bannerDismissed(), false, "second dismissal is rejected");
const r3 = await gate.request(fakePlatform);
assertEquals(r3.requested, true, "only one request for the armed ad");
assertEquals(adCalls, 2, "no duplicate ad");
const r3b = await gate.request(fakePlatform);
assertEquals(r3b.requested, false, "request while in-flight is refused");
assertEquals(adCalls, 2, "still no duplicate ad");

section("Ad gate — in-flight blocking (slow SDK)");

const slowGate = createAdGate();
let slowResolved = 0;
const slowPlatform = {
    showMidgameAd: () => new Promise((resolve) => {
        setTimeout(() => {
            slowResolved++;
            resolve();
        }, 200);
    })
};

slowGate.bannerOpened();
assertEquals(slowGate.bannerDismissed(), true, "slow: dismissal arms");
const slowRequest = slowGate.request(slowPlatform);
const refusedMidFlight = slowGate.request(slowPlatform);
assertEquals((await refusedMidFlight).requested, false, "second request while in-flight refused");
await slowRequest;
assertEquals(slowResolved, 1, "slow ad resolved exactly once");

// After completion the gate is fully reset.
slowGate.bannerOpened();
assertEquals(slowGate.bannerDismissed(), true, "gate reusable after completion");

section("Ad gate — SDK failure never blocks");

const failGate = createAdGate();
const failingPlatform = {
    showMidgameAd: async () => {
        throw new Error("ad SDK exploded");
    }
};
failGate.bannerOpened();
assertEquals(failGate.bannerDismissed(), true, "failure case: dismissal arms");
const failed = await failGate.request(failingPlatform);
assertEquals(failed.requested, true, "request still reports fired");
assertEquals(failGate.isAdInFlight(), false, "in-flight flag released after failure");

// Gate is reusable after a failure — player is never blocked.
failGate.bannerOpened();
assertEquals(failGate.bannerDismissed(), true, "gate reusable after ad failure");

section("Ad gate — timeout on hanging SDK");

const hangGate = createAdGate();
const hangingPlatform = {
    showMidgameAd: () => new Promise(() => { })  // never resolves
};
hangGate.bannerOpened();
assertEquals(hangGate.bannerDismissed(), true, "hang case: dismissal arms");
const hangStart = Date.now();
await hangGate.request(hangingPlatform);
const hangElapsed = Date.now() - hangStart;
assert(hangElapsed < 10000, `hanging ad did not block (released in ${hangElapsed}ms)`);
assertEquals(hangGate.isAdInFlight(), false, "in-flight cleared after timeout");

section("Ad gate — missing platform");

const missingGate = createAdGate();
missingGate.bannerOpened();
assertEquals(missingGate.bannerDismissed(), true, "missing platform: dismissal arms");
const missingResult = await missingGate.request(null);
assertEquals(missingResult.requested, false, "null platform does not crash");
assertEquals(missingGate.isAdInFlight(), false, "no in-flight after null platform");

section("Ad gate — reset");

const resetGate = createAdGate();
resetGate.bannerOpened();
resetGate.reset();
assertEquals(resetGate.isBannerOpen(), false, "reset clears banner state");
assertEquals(resetGate.bannerDismissed(), false, "reset prevents arming");

report();
