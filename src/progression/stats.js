/* =========================================================
   STATS & ACHIEVEMENTS — records, streaks, match history
   ========================================================= */

import { loadStats, loadAchievements, saveJSON } from "../storage/storage.js";

const HISTORY_LIMIT = 20;

let stats = null;
let achievements = null;

function ensureLoaded() {
    if (stats === null) stats = loadStats();
    if (achievements === null) achievements = loadAchievements();
}

/* ---------------------------------------------------------
   Achievement definitions
   predicate(stats, context) => boolean
   --------------------------------------------------------- */

export const ACHIEVEMENTS = [
    {
        id: "first-win",
        name: "First Blood",
        description: "Win your first game.",
        predicate: (s) => s.wins >= 1
    },
    {
        id: "ten-wins",
        name: "Getting Serious",
        description: "Win 10 games.",
        predicate: (s) => s.wins >= 10
    },
    {
        id: "fifty-wins",
        name: "Arena Regular",
        description: "Win 50 games.",
        predicate: (s) => s.wins >= 50
    },
    {
        id: "streak-3",
        name: "On a Roll",
        description: "Win 3 games in a row.",
        predicate: (s) => s.bestStreak >= 3
    },
    {
        id: "streak-5",
        name: "Unstoppable",
        description: "Win 5 games in a row.",
        predicate: (s) => s.bestStreak >= 5
    },
    {
        id: "beat-medium",
        name: "Solid Ground",
        description: "Beat the AI on Medium.",
        predicate: (s) => s.perDifficulty.medium.w > 0
    },
    {
        id: "beat-hard",
        name: "Sharp Mind",
        description: "Beat the AI on Hard.",
        predicate: (s) => s.perDifficulty.hard.w > 0
    },
    {
        id: "beat-impossible",
        name: "Machine Slayer",
        description: "Beat the AI on Impossible.",
        predicate: (s) => s.perDifficulty.impossible.w > 0
    },
    {
        id: "draw-master",
        name: "Fortress",
        description: "Draw 10 games.",
        predicate: (s) => s.draws >= 10
    },
    {
        id: "veteran",
        name: "Veteran",
        description: "Play 100 games.",
        predicate: (s) => s.gamesPlayed >= 100
    },
    {
        id: "daily-first",
        name: "Daily Grind",
        description: "Complete a Daily Challenge.",
        predicate: (s, ctx) => ctx && ctx.dailyCompleted
    },
    {
        id: "tournament-win",
        name: "Champion",
        description: "Win a Tournament.",
        predicate: (s, ctx) => ctx && ctx.tournamentWon
    }
];

/* ---------------------------------------------------------
   Recording results
   --------------------------------------------------------- */

/**
 * Records a finished game.
 * @param {object} params
 *   mode          — mode id
 *   playerResult  — "win" | "loss" | "draw" from the human perspective
 *   difficulty    — AI difficulty id (or null for local play)
 *   isHumanGame   — false for local multiplayer (no streak impact)
 */
export function recordGame({ mode, playerResult, difficulty, isHumanGame = true }) {
    ensureLoaded();

    stats.gamesPlayed++;

    if (playerResult === "win") {
        stats.wins++;
        if (isHumanGame) {
            stats.currentStreak++;
            if (stats.currentStreak > stats.bestStreak) {
                stats.bestStreak = stats.currentStreak;
            }
        }
    } else if (playerResult === "draw") {
        stats.draws++;
    } else if (playerResult === "loss") {
        stats.losses++;
        if (isHumanGame) stats.currentStreak = 0;
    }

    if (difficulty && stats.perDifficulty[difficulty]) {
        const bucket = stats.perDifficulty[difficulty];
        if (playerResult === "win") bucket.w++;
        else if (playerResult === "draw") bucket.d++;
        else bucket.l++;
    }

    // Match history (newest first).
    stats.history.unshift({
        mode,
        result: playerResult,
        difficulty: difficulty || null,
        time: Date.now()
    });
    if (stats.history.length > HISTORY_LIMIT) {
        stats.history.length = HISTORY_LIMIT;
    }

    saveJSON("stats", stats);

    // Check newly earned achievements.
    const newlyEarned = checkAchievements();
    return { stats: { ...stats }, newAchievements: newlyEarned };
}

export function resetStats() {
    stats = loadStats();
    // Wipe every field back to defaults but keep the shape.
    stats.gamesPlayed = 0;
    stats.wins = 0;
    stats.losses = 0;
    stats.draws = 0;
    stats.bestStreak = 0;
    stats.currentStreak = 0;
    for (const key of Object.keys(stats.perDifficulty)) {
        stats.perDifficulty[key] = { w: 0, l: 0, d: 0 };
    }
    stats.history = [];
    saveJSON("stats", stats);
}

export function setStreakRecord(best) {
    ensureLoaded();
    if (best > stats.bestStreak) {
        stats.bestStreak = best;
        saveJSON("stats", stats);
    }
}

/* ---------------------------------------------------------
   Achievements
   --------------------------------------------------------- */

function checkAchievements(context = null) {
    const newlyEarned = [];

    for (const achievement of ACHIEVEMENTS) {
        if (achievements[achievement.id]) continue;

        let earned = false;
        try {
            earned = achievement.predicate(stats, context);
        } catch (error) {
            earned = false;
        }

        if (earned) {
            achievements[achievement.id] = {
                earnedAt: Date.now()
            };
            newlyEarned.push(achievement);
        }
    }

    if (newlyEarned.length > 0) {
        saveJSON("achievements", achievements);
    }

    return newlyEarned;
}

/** Manual trigger for context-dependent achievements. */
export function recordContextual(context) {
    ensureLoaded();
    return checkAchievements(context);
}

export function getStats() {
    ensureLoaded();
    return { ...stats };
}

export function getAchievements() {
    ensureLoaded();
    return ACHIEVEMENTS.map((a) => ({
        ...a,
        earned: !!achievements[a.id],
        earnedAt: achievements[a.id] ? achievements[a.id].earnedAt : null
    }));
}

export function getEarnedCount() {
    ensureLoaded();
    return Object.keys(achievements).length;
}
