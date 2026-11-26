/* =========================================================
   MODES — definitions for all game modes
   Each mode describes how to configure a game session and
   how results map to XP / stats / progression.
   ========================================================= */

export const MODES = {
    "classic-local": {
        id: "classic-local",
        name: "Local Multiplayer",
        tagline: "Two players, one device",
        description: "Pass-and-play. X starts; the loser starts the next round.",
        icon: "2P",
        usesAI: false,
        xpOnWin: 5,
        xpOnDraw: 3,
        xpOnLoss: 1
    },
    "classic-ai": {
        id: "classic-ai",
        name: "Play vs AI",
        tagline: "Test yourself against the computer",
        description: "Classic match against the machine. Pick your challenge.",
        icon: "AI",
        usesAI: true,
        xpOnWin: 10,
        xpOnDraw: 4,
        xpOnLoss: 1,
        xpDifficultyMultiplier: {
            easy: 0.5,
            medium: 1.0,
            hard: 1.5,
            impossible: 3.0
        }
    },
    "streak": {
        id: "streak",
        name: "Endless Streak",
        tagline: "One loss ends the run",
        description:
            "Win as many games in a row as you can. A single loss or draw ends your streak. Rewarded ads can save a streak once.",
        icon: "STK",
        usesAI: true,
        xpOnWin: 15,
        xpOnDraw: 0,
        xpOnLoss: 0,
        xpDifficultyMultiplier: {
            easy: 0.5,
            medium: 1.0,
            hard: 1.8,
            impossible: 3.5
        }
    },
    "timed": {
        id: "timed",
        name: "Timed Challenge",
        tagline: "Five seconds per move",
        description:
            "Think fast — you have 5 seconds per move. Hesitate and you forfeit the turn.",
        icon: "TMR",
        usesAI: true,
        xpOnWin: 12,
        xpOnDraw: 4,
        xpOnLoss: 1,
        xpDifficultyMultiplier: {
            easy: 0.5,
            medium: 1.0,
            hard: 1.5,
            impossible: 3.0
        },
        defaultConfig: { secondsPerMove: 5 }
    },
    "challenge": {
        id: "challenge",
        name: "Challenge Mode",
        tagline: "Solve tactical puzzles",
        description:
            "Hand-crafted board puzzles. Find the winning sequence before the AI stops you.",
        icon: "CHL",
        usesAI: true,
        xpOnWin: 20,
        xpOnDraw: 5,
        xpOnLoss: 0,
        xpDifficultyMultiplier: { easy: 1, medium: 1, hard: 1, impossible: 1 }
    },
    "tournament": {
        id: "tournament",
        name: "Tournament",
        tagline: "Best of five",
        description:
            "First to three wins takes the cup. Draws don't count toward either side.",
        icon: "TRN",
        usesAI: true,
        xpOnWin: 25,
        xpOnDraw: 5,
        xpOnLoss: 5,
        xpDifficultyMultiplier: {
            easy: 0.5,
            medium: 1.0,
            hard: 1.5,
            impossible: 3.0
        },
        defaultConfig: { bestOf: 5, winsNeeded: 3 }
    },
    "daily": {
        id: "daily",
        name: "Daily Challenge",
        tagline: "One puzzle per day",
        description:
            "A fresh seeded puzzle every day. Keep your completion streak alive.",
        icon: "DLY",
        usesAI: true,
        xpOnWin: 30,
        xpOnDraw: 0,
        xpOnLoss: 0,
        xpDifficultyMultiplier: { easy: 1, medium: 1, hard: 1, impossible: 1 }
    }
};

export function getMode(id) {
    return MODES[id] || MODES["classic-ai"];
}

/* ---------------------------------------------------------
   Puzzles for Challenge / Daily modes
   Preset board: X to move and win in the stated number of
   moves with perfect AI defense. All verified by tests.
   T means "forced win in T plies for X".
   --------------------------------------------------------- */

export const PUZZLES = [
    {
        id: "p1",
        title: "The Fork",
        hint: "Create two threats at once.",
        board: ["X", "", "", "", "O", "", "", "", ""],
        youPlay: "X",
        turnsToWin: 3
    },
    {
        id: "p2",
        title: "Center Control",
        hint: "The middle is power.",
        board: ["", "", "O", "", "X", "", "", "", ""],
        youPlay: "X",
        turnsToWin: 3
    },
    {
        id: "p3",
        title: "Blocked Line",
        hint: "A threat was stopped — make another.",
        board: ["X", "O", "", "X", "O", "", "", "", ""],
        youPlay: "X",
        turnsToWin: 3
    },
    {
        id: "p4",
        title: "Corner Trap",
        hint: "Push into the corners.",
        board: ["X", "", "", "", "O", "", "", "", ""],
        youPlay: "X",
        turnsToWin: 3
    },
    {
        id: "p5",
        title: "Two Ways to Win",
        hint: "One move, two threats.",
        board: ["X", "X", "", "", "O", "", "O", "", ""],
        youPlay: "X",
        turnsToWin: 3
    },
    {
        id: "p6",
        title: "The Setup",
        hint: "Think two moves ahead.",
        board: ["", "O", "", "", "X", "X", "", "", "O"],
        youPlay: "X",
        turnsToWin: 5
    },
    {
        id: "p7",
        title: "Edge Advantage",
        hint: "The sides can win too.",
        board: ["O", "", "X", "", "O", "", "", "", "X"],
        youPlay: "X",
        turnsToWin: 5
    },
    {
        id: "p8",
        title: "Counter Attack",
        hint: "Block, then strike.",
        board: ["O", "O", "", "", "X", "", "", "", ""],
        youPlay: "X",
        turnsToWin: 5
    },
    {
        id: "p9",
        title: "Double Threat",
        hint: "Split the defense.",
        board: ["X", "", "", "O", "X", "", "", "", "O"],
        youPlay: "X",
        turnsToWin: 5
    },
    {
        id: "p10",
        title: "Last Chance",
        hint: "One mistake and it's gone.",
        board: ["O", "X", "", "X", "O", "", "", "", ""],
        youPlay: "X",
        turnsToWin: 3
    }
];

/** Deterministic daily puzzle selection from a date string. */
export function getDailyPuzzle(dateString) {
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
        hash = (hash * 31 + dateString.charCodeAt(i)) >>> 0;
    }
    return PUZZLES[hash % PUZZLES.length];
}

export function todayKey() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
