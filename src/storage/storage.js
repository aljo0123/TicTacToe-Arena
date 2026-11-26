/* =========================================================
   STORAGE — safe localStorage wrapper with schema validation
   Never throws; degrades gracefully when storage unavailable.
   ========================================================= */

const PREFIX = "ttta_";
const SCHEMA_VERSION = 1;

let memoryFallback = null;

function storageAvailable() {
    try {
        const testKey = PREFIX + "__test__";
        window.localStorage.setItem(testKey, "1");
        window.localStorage.removeItem(testKey);
        return true;
    } catch (error) {
        return false;
    }
}

const HAS_STORAGE = storageAvailable();

function read(key) {
    if (!HAS_STORAGE) return memoryFallback ? memoryFallback[key] : null;
    try {
        return window.localStorage.getItem(PREFIX + key);
    } catch (error) {
        return null;
    }
}

function write(key, value) {
    if (!HAS_STORAGE) {
        if (!memoryFallback) memoryFallback = {};
        memoryFallback[key] = value;
        return true;
    }
    try {
        window.localStorage.setItem(PREFIX + key, value);
        return true;
    } catch (error) {
        // Quota exceeded / private mode — fail silently but keep game running.
        return false;
    }
}

/**
 * Loads and validates a JSON value.
 * Returns `fallback` if missing, corrupt, or schema-invalid.
 */
export function loadJSON(key, fallback, validator) {
    const raw = read(key);
    if (raw === null || raw === undefined) return fallback;

    try {
        const parsed = JSON.parse(raw);

        if (parsed === null || typeof parsed !== "object") {
            return fallback;
        }

        // Schema version check — reset if the data is from an older shape.
        if (parsed.__v !== undefined && parsed.__v !== SCHEMA_VERSION) {
            return fallback;
        }

        if (validator && !validator(parsed)) return fallback;

        return parsed;
    } catch (error) {
        // Corrupt JSON — wipe the bad entry so we don't retry forever.
        write(key, JSON.stringify(fallback));
        return fallback;
    }
}

export function saveJSON(key, value) {
    const payload = { ...value, __v: SCHEMA_VERSION };
    return write(key, JSON.stringify(payload));
}

/* ---------------------------------------------------------
   Validated record shapes
   --------------------------------------------------------- */

export function loadProgress() {
    return loadJSON(
        "progress",
        {
            xp: 0,
            level: 1,
            unlockedThemes: ["default"],
            unlockedMarks: ["classic"],
            selectedTheme: "default",
            selectedMark: "classic"
        },
        (p) =>
            typeof p.xp === "number" &&
            typeof p.level === "number" &&
            Array.isArray(p.unlockedThemes)
    );
}

export function loadStats() {
    return loadJSON(
        "stats",
        {
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            bestStreak: 0,
            currentStreak: 0,
            perDifficulty: {
                easy: { w: 0, l: 0, d: 0 },
                medium: { w: 0, l: 0, d: 0 },
                hard: { w: 0, l: 0, d: 0 },
                impossible: { w: 0, l: 0, d: 0 }
            },
            history: []
        },
        (s) =>
            typeof s.gamesPlayed === "number" &&
            typeof s.wins === "number" &&
            typeof s.perDifficulty === "object"
    );
}

export function loadAchievements() {
    return loadJSON(
        "achievements",
        {},
        (a) => typeof a === "object" && !Array.isArray(a)
    );
}

export function loadSettings() {
    return loadJSON(
        "settings",
        {
            masterVolume: 0.8,
            sfxVolume: 1.0,
            musicVolume: 0.3,
            musicEnabled: false,
            soundEnabled: true
        },
        (s) => typeof s.masterVolume === "number"
    );
}

export function loadStreakRecord() {
    return loadJSON(
        "streak",
        { best: 0 },
        (s) => typeof s.best === "number"
    );
}

export function loadDaily() {
    return loadJSON(
        "daily",
        { lastCompleted: null, streak: 0 },
        (d) => typeof d.streak === "number"
    );
}
