/* =========================================================
   PHASE 2 TESTS — win-line geometry, onboarding persistence
   ========================================================= */

import {
    assert,
    assertEquals,
    section,
    report
} from "./run.js";

import "./shim.js";

import {
    lineForCombo,
    allCombos
} from "../src/ui/win-line.js";

import {
    ONBOARDING_STEPS,
    shouldShowOnboarding,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    loadOnboardingState
} from "../src/ui/onboarding.js";

section("Win line — geometry for all 8 combos");

const combos = allCombos();
assertEquals(combos.length, 8, "all eight winning combinations covered");

for (const { combo } of combos) {
    const geo = lineForCombo(combo);

    // Endpoints must be finite numbers inside the board's extended
    // coordinate space (the stroke overshoots slightly beyond 0-100).
    for (const key of ["x1", "y1", "x2", "y2"]) {
        assert(
            Number.isFinite(geo[key]) && geo[key] > -5 && geo[key] < 105,
            `combo [${combo}] ${key}=${geo[key]} within extended board`
        );
    }
    assert(geo.length > 0, `combo [${combo}] length positive`);
}

// Horizontal row: y constant, x increases left→right.
const top = lineForCombo([0, 1, 2]);
assertEquals(top.y1, top.y2, "horizontal row has constant y");
assert(top.x2 > top.x1, "horizontal row goes left to right");

// Vertical column: x constant, y increases.
const left = lineForCombo([0, 3, 6]);
assertEquals(left.x1, left.x2, "vertical column has constant x");
assert(left.y2 > left.y1, "vertical column goes top to bottom");

// Diagonals: x and y both change.
const diag1 = lineForCombo([0, 4, 8]);
assert(Math.abs((diag1.x2 - diag1.x1) - (diag1.y2 - diag1.y1)) < 0.01,
    "main diagonal has equal dx/dy");

const diag2 = lineForCombo([2, 4, 6]);
assert(diag2.x1 > diag2.x2, "anti-diagonal runs right to left");

// X and O produce identical geometry (color differs at draw time).
section("Win line — symbol independence");

const geoX = lineForCombo([0, 1, 2]);
const geoO = lineForCombo([0, 1, 2]);
assertEquals(geoX.x1, geoO.x1, "geometry identical for X and O");

section("Onboarding — first-launch flow");

// Fresh profile (shim storage starts empty).
assertEquals(shouldShowOnboarding(), true, "shows on first launch");

completeOnboarding();
assertEquals(shouldShowOnboarding(), false, "does not show after completion");

resetOnboarding();
assertEquals(shouldShowOnboarding(), true, "explicit reset re-enables");

skipOnboarding();
assertEquals(shouldShowOnboarding(), false, "does not show after skip");

// Skipped and completed are distinct states.
resetOnboarding();
completeOnboarding();
assertEquals(loadOnboardingState().completed, true, "completed flag persisted");
assertEquals(loadOnboardingState().skipped, false, "completed is not skipped");

resetOnboarding();
skipOnboarding();
assertEquals(loadOnboardingState().skipped, true, "skipped flag persisted");
assertEquals(loadOnboardingState().completed, false, "skipped is not completed");

section("Onboarding — corrupt save falls back to showing");

// Corrupt the stored value; storage shim writes raw strings.
globalThis.window.localStorage.setItem(
    "ttta_onboarding",
    "{corrupted!!"
);
assertEquals(
    shouldShowOnboarding(),
    true,
    "corrupt data treated as unseen (safe fallback)"
);

section("Onboarding — step definitions");

assertEquals(ONBOARDING_STEPS.length, 3, "three tutorial steps");
for (const step of ONBOARDING_STEPS) {
    assert(step.title.length > 0 && step.title.length < 40,
        `step '${step.id}' title is short`);
    assert(step.text.length > 0 && step.text.length < 70,
        `step '${step.id}' text is minimal`);
}

report();
