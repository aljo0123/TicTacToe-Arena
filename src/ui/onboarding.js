/* =========================================================
   ONBOARDING — first-run tutorial overlay.
   Pure decision logic is exported for testing; presentation
   is DOM-only. Completion persists via versioned storage
   alongside existing save data (separate key, schema-checked).
   ========================================================= */

import { loadJSON, saveJSON } from "../storage/storage.js";

const KEY = "onboarding";
const TOTAL_STEPS = 3;

/** Loads persisted tutorial state (validated). */
export function loadOnboardingState() {
    return loadJSON(
        KEY,
        { completed: false, skipped: false },
        (v) => typeof v.completed === "boolean" && typeof v.skipped === "boolean"
    );
}

/** True when the tutorial should run (first launch only). */
export function shouldShowOnboarding() {
    const state = loadOnboardingState();
    return !state.completed && !state.skipped;
}

/** Marks the tutorial finished (watched through). Never shows again. */
export function completeOnboarding() {
    saveJSON(KEY, { completed: true, skipped: false });
}

/** Marks the tutorial skipped. Never shows again. */
export function skipOnboarding() {
    saveJSON(KEY, { completed: false, skipped: true });
}

/** Explicit reset (the "unless the player resets it" path). */
export function resetOnboarding() {
    saveJSON(KEY, { completed: false, skipped: false });
}

/**
 * Step definitions — minimal text + a visual cue key the UI maps
 * to a small animation on each step.
 */
export const ONBOARDING_STEPS = [
    {
        id: "place",
        title: "Tap a cell",
        text: "Your mark goes where you tap.",
        cue: "place"
    },
    {
        id: "three",
        title: "Make three in a row",
        text: "Take turns. Line up three to win.",
        cue: "three"
    },
    {
        id: "modes",
        title: "Try the modes",
        text: "Streaks, timers, puzzles — explore when ready.",
        cue: "modes"
    }
];

export function stepCount() {
    return TOTAL_STEPS;
}

/* ---------------------------------------------------------
   Presentation
   --------------------------------------------------------- */

let overlayEl = null;
let currentStep = 0;
let onFinish = null;

function ensureDom() {
    if (overlayEl) return overlayEl;

    overlayEl = document.createElement("div");
    overlayEl.className = "onboarding";
    overlayEl.innerHTML = `
        <div class="onboarding-card">
            <div class="onboarding-cue" data-cue></div>
            <div class="onboarding-step" data-step></div>
            <div class="onboarding-actions">
                <button type="button" class="onboarding-skip">Skip</button>
                <button type="button" class="onboarding-next">Continue</button>
            </div>
            <div class="onboarding-dots" data-dots></div>
        </div>
    `;

    overlayEl.querySelector(".onboarding-skip").addEventListener("click", () => {
        skipOnboarding();
        hide();
        if (onFinish) onFinish({ skipped: true });
    });

    overlayEl.querySelector(".onboarding-next").addEventListener("click", () => {
        if (currentStep >= ONBOARDING_STEPS.length - 1) {
            completeOnboarding();
            hide();
            if (onFinish) onFinish({ skipped: false });
        } else {
            currentStep++;
            renderStep();
        }
    });

    document.body.appendChild(overlayEl);
    return overlayEl;
}

function renderStep() {
    const step = ONBOARDING_STEPS[currentStep];
    if (!step) return;

    const stepBox = overlayEl.querySelector("[data-step]");
    stepBox.innerHTML = `
        <h3>${step.title}</h3>
        <p>${step.text}</p>
    `;

    const cue = overlayEl.querySelector("[data-cue]");
    cue.dataset.cue = step.cue;

    const dots = overlayEl.querySelector("[data-dots]");
    dots.innerHTML = ONBOARDING_STEPS.map((s, i) =>
        `<span class="${i === currentStep ? "active" : ""}"></span>`
    ).join("");

    const nextBtn = overlayEl.querySelector(".onboarding-next");
    nextBtn.textContent =
        currentStep === ONBOARDING_STEPS.length - 1 ? "Got it" : "Continue";
}

function hide() {
    if (overlayEl) overlayEl.classList.remove("visible");
    currentStep = 0;
}

/**
 * Shows the tutorial if it hasn't been seen. Returns true when it
 * was shown.
 * @param {() => void} [finished] — callback when dismissed either way
 */
export function maybeShowOnboarding(finished) {
    if (!shouldShowOnboarding()) return false;

    onFinish = finished || null;
    currentStep = 0;
    ensureDom();
    renderStep();
    overlayEl.classList.add("visible");
    return true;
}
