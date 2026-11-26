/* =========================================================
   XP & LEVELS — player progression
   Levels use a growing threshold curve. All values are
   validated on load by storage.js.
   ========================================================= */

import { loadProgress, saveJSON } from "../storage/storage.js";
import { MODES } from "../core/modes.js";

/**
 * Total XP required to reach a given level.
 * Level 1 = 0 XP. Each subsequent level requires more.
 * Formula: 40 * level^1.5 (rounded).
 */
export function xpForLevel(level) {
    if (level <= 1) return 0;
    return Math.round(40 * Math.pow(level, 1.5));
}

export function levelFromXp(xp) {
    let level = 1;
    while (xpForLevel(level + 1) <= xp) {
        level++;
        if (level >= 99) break;
    }
    return level;
}

export function progressWithinLevel(xp) {
    const level = levelFromXp(xp);
    const current = xpForLevel(level);
    const next = xpForLevel(level + 1);
    const span = next - current;
    const gained = xp - current;
    return {
        level,
        xp,
        currentLevelXp: current,
        nextLevelXp: next,
        ratio: span > 0 ? gained / span : 1,
        xpToNext: Math.max(0, next - xp)
    };
}

/* ---------------------------------------------------------
   Level titles — cosmetic identity per tier
   --------------------------------------------------------- */

const LEVEL_TITLES = [
    [1, "Rookie"],
    [3, "Contender"],
    [5, "Strategist"],
    [8, "Tactician"],
    [12, "Veteran"],
    [18, "Mastermind"],
    [25, "Grandmaster"]
];

export function titleForLevel(level) {
    let title = LEVEL_TITLES[0][1];
    for (const [threshold, name] of LEVEL_TITLES) {
        if (level >= threshold) title = name;
    }
    return title;
}

/* ---------------------------------------------------------
   XP awards
   --------------------------------------------------------- */

export function xpForResult(modeId, resultStatus, difficultyId) {
    const mode = MODES[modeId];
    if (!mode) return 0;

    let base;
    if (resultStatus === "won") base = mode.xpOnWin;
    else if (resultStatus === "draw") base = mode.xpOnDraw;
    else base = mode.xpOnLoss;

    if (mode.xpDifficultyMultiplier && difficultyId) {
        const mult = mode.xpDifficultyMultiplier[difficultyId] || 1;
        base = Math.round(base * mult);
    }

    return base;
}

/* ---------------------------------------------------------
   Theme & mark unlocks
   --------------------------------------------------------- */

export const THEMES = [
    { id: "default", name: "Midnight", requiredLevel: 1 },
    { id: "ocean", name: "Ocean", requiredLevel: 3 },
    { id: "sunset", name: "Sunset", requiredLevel: 6 },
    { id: "forest", name: "Forest", requiredLevel: 10 }
];

export const MARK_STYLES = [
    { id: "classic", name: "Classic", requiredLevel: 1 },
    { id: "rounded", name: "Rounded", requiredLevel: 4 },
    { id: "sharp", name: "Sharp", requiredLevel: 8 }
];

/* ---------------------------------------------------------
   Progression manager
   --------------------------------------------------------- */

let progress = null;

function ensureLoaded() {
    if (progress === null) {
        progress = loadProgress();
    }
    return progress;
}

/** Grants XP and returns { leveledUp, oldLevel, newLevel } or null. */
export function grantXp(amount) {
    if (!amount) return null;

    const p = ensureLoaded();
    const oldLevel = p.level;
    p.xp += amount;
    p.level = levelFromXp(p.xp);

    // Auto-unlock themes and marks that the new level qualifies for.
    for (const theme of THEMES) {
        if (
            p.level >= theme.requiredLevel &&
            !p.unlockedThemes.includes(theme.id)
        ) {
            p.unlockedThemes.push(theme.id);
        }
    }
    for (const mark of MARK_STYLES) {
        if (
            p.level >= mark.requiredLevel &&
            !p.unlockedMarks.includes(mark.id)
        ) {
            p.unlockedMarks.push(mark.id);
        }
    }

    saveJSON("progress", p);

    const leveledUp = p.level > oldLevel;
    return {
        leveledUp,
        oldLevel,
        newLevel: p.level,
        progress: progressWithinLevel(p.xp)
    };
}

export function getProgress() {
    const p = ensureLoaded();
    return { ...p, view: progressWithinLevel(p.xp), title: titleForLevel(p.level) };
}

export function selectTheme(themeId) {
    const p = ensureLoaded();
    const theme = THEMES.find((t) => t.id === themeId);
    if (!theme) return false;
    if (p.level < theme.requiredLevel) return false;
    p.selectedTheme = themeId;
    saveJSON("progress", p);
    return true;
}

export function selectMark(markId) {
    const p = ensureLoaded();
    const mark = MARK_STYLES.find((m) => m.id === markId);
    if (!mark) return false;
    if (p.level < mark.requiredLevel) return false;
    p.selectedMark = markId;
    saveJSON("progress", p);
    return true;
}

export function resetProgress() {
    progress = null;
    saveJSON("progress", {
        xp: 0,
        level: 1,
        unlockedThemes: ["default"],
        unlockedMarks: ["classic"],
        selectedTheme: "default",
        selectedMark: "classic"
    });
}
