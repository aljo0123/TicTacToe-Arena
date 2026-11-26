/* =========================================================
   GAME STATE — single source of truth for the active game
   Emits events; UI subscribes. No DOM access here.
   ========================================================= */

import {
    emptyBoard,
    applyMove,
    resolveBoard,
    isValidMove,
    opponentOf
} from "./rules.js";
import { emptyCells } from "./rules.js";

/**
 * Modes:
 *   classic-local  — two humans
 *   classic-ai     — human X vs computer O
 *   streak         — endless win streak vs AI (loss = run over)
 *   timed          — per-move countdown
 *   challenge      — scripted puzzle (pre-set board, win condition)
 *   tournament     — best-of-5 vs AI
 *   daily          — seeded daily puzzle
 */
export const PHASE = {
    IDLE: "idle",
    PLAYING: "playing",
    AI_THINKING: "ai-thinking",
    OVER: "over"
};

export function createInitialState(mode = "classic-ai") {
    return {
        mode,
        board: emptyBoard(),
        currentPlayer: "X",
        phase: PHASE.IDLE,
        moveCount: 0,
        result: null,          // { status, winner, line }
        moveHistory: [],
        // Mode-specific runtime data
        config: {},
        // Timed mode
        deadline: null,
        // Tournament mode
        tournamentScore: { human: 0, ai: 0, gamesPlayed: 0 },
        // Challenge / daily
        puzzleIndex: null
    };
}

let listeners = [];
let state = createInitialState();
let aiController = null;      // { getMove(board, player) => index }
let timerHandle = null;

/* ---------------------------------------------------------
   Event system
   --------------------------------------------------------- */

export function subscribe(fn) {
    listeners.push(fn);
    return () => {
        listeners = listeners.filter((l) => l !== fn);
    };
}

function emit(event, data) {
    for (const fn of listeners.slice()) {
        try {
            fn(event, data, state);
        } catch (error) {
            // A listener failure must never break the game loop.
            console.error("Listener error:", error);
        }
    }
}

export function getState() {
    return state;
}

/* ---------------------------------------------------------
   Setup
   --------------------------------------------------------- */

/**
 * @param {object} options
 *   mode           — string mode id
 *   aiController   — { getMove(board, player) => index } or null
 *   config         — mode-specific settings
 */
export function startGame(options) {
    stopTimer();

    const {
        mode = "classic-ai",
        aiController: ai = null,
        config = {},
        puzzleIndex = null
    } = options || {};

    aiController = ai;
    state = createInitialState(mode);
    state.config = config;
    state.puzzleIndex = puzzleIndex;

    // Apply pre-set board for challenge / daily puzzles.
    if (config.presetBoard) {
        state.board = config.presetBoard.slice();
        state.moveCount = state.board.filter((c) => c !== "").length;
    }

    // Who moves first? AI-first modes let the computer open;
    // explicit startingPlayer overrides the default X (with or without AI).
    if ((config.aiMovesFirst || config.startingPlayer === "O") && ai) {
        state.currentPlayer = "O";
    } else if (config.startingPlayer === "O") {
        state.currentPlayer = "O";
    }

    state.phase = PHASE.PLAYING;
    emit("game:start", { mode });

    // If AI opens, kick it off.
    if (state.currentPlayer === "O" && aiController) {
        scheduleAiMove();
    } else {
        armTimer();
    }

    return state;
}

export function resetGame() {
    stopTimer();
    const keepMode = state.mode;
    const keepConfig = state.config;
    const keepAi = aiController;
    const keepPuzzle = state.puzzleIndex;
    state = createInitialState(keepMode);
    state.config = keepConfig;
    state.puzzleIndex = keepPuzzle;
    aiController = keepAi;
    state.phase = PHASE.IDLE;
    emit("game:reset", {});
    return state;
}

/* ---------------------------------------------------------
   Timer (timed mode only)
   --------------------------------------------------------- */

function armTimer() {
    stopTimer();
    if (state.mode !== "timed" || state.phase !== PHASE.PLAYING) return;

    const perMove = state.config.secondsPerMove || 5;
    state.deadline = Date.now() + perMove * 1000;
    emit("timer:arm", { deadline: state.deadline, duration: perMove * 1000 });

    timerHandle = setTimeout(() => {
        if (state.phase !== PHASE.PLAYING) return;
        // Timeout = turn forfeits to opponent.
        emit("timer:expired", { player: state.currentPlayer });
        if (state.config.timeoutLoses !== false) {
            endGame({
                status: "timeout",
                winner: opponentOf(state.currentPlayer),
                line: null
            });
        } else {
            attemptSwitchTurn();
        }
    }, perMove * 1000);
}

function stopTimer() {
    if (timerHandle) {
        clearTimeout(timerHandle);
        timerHandle = null;
    }
    if (state) state.deadline = null;
}

/* ---------------------------------------------------------
   Moves
   --------------------------------------------------------- */

/**
 * The single entry point for any move (human or AI).
 * Returns { ok, reason } — never throws.
 */
export function attemptMove(index, player) {
    if (state.phase !== PHASE.PLAYING) {
        return { ok: false, reason: "not-playing" };
    }

    if (player && player !== state.currentPlayer) {
        return { ok: false, reason: "wrong-turn" };
    }

    if (!isValidMove(state.board, index)) {
        return { ok: false, reason: "invalid-cell" };
    }

    stopTimer();

    state.board = applyMove(state.board, index, state.currentPlayer);
    state.moveCount++;
    state.moveHistory.push({ index, player: state.currentPlayer });

    emit("move:made", {
        index,
        player: state.currentPlayer,
        board: state.board.slice()
    });

    const outcome = resolveBoard(state.board);

    if (outcome.status === "won") {
        endGame(outcome);
        return { ok: true };
    }

    if (outcome.status === "draw") {
        endGame({ status: "draw", winner: null, line: null });
        return { ok: true };
    }

    attemptSwitchTurn();
    return { ok: true };
}

function attemptSwitchTurn() {
    state.currentPlayer = opponentOf(state.currentPlayer);
    emit("turn:changed", { player: state.currentPlayer });

    if (state.currentPlayer === "O" && aiController) {
        scheduleAiMove();
    } else {
        armTimer();
    }
}

function scheduleAiMove() {
    state.phase = PHASE.AI_THINKING;
    emit("ai:thinking", { player: "O" });

    const delay = state.config.aiReactionMs !== undefined
        ? state.config.aiReactionMs
        : 350 + Math.floor(Math.random() * 350); // 350–700ms natural timing

    setTimeout(() => {
        if (state.phase !== PHASE.AI_THINKING) return;
        if (state.currentPlayer !== "O" || !aiController) return;

        let moveIndex;
        try {
            moveIndex = aiController.getMove(state.board.slice(), "O");
        } catch (error) {
            console.error("AI error:", error);
            moveIndex = emptyCells(state.board)[0];
        }

        // Safety: AI must return a legal move.
        if (!isValidMove(state.board, moveIndex)) {
            const fallback = emptyCells(state.board);
            moveIndex = fallback.length
                ? fallback[Math.floor(Math.random() * fallback.length)]
                : -1;
        }

        if (moveIndex === -1) return;

        state.phase = PHASE.PLAYING;
        attemptMove(moveIndex, "O");
    }, delay);
}

function endGame(result) {
    stopTimer();
    state.phase = PHASE.OVER;
    state.result = result;
    emit("game:over", { result, state: { ...state, board: state.board.slice() } });
}

/* ---------------------------------------------------------
   External queries (used by AI + UI)
   --------------------------------------------------------- */

export function getBoard() {
    return state.board.slice();
}

export function getCurrentPlayer() {
    return state.currentPlayer;
}

/** True when an AI opponent is present in the current session. */
export function hasAiOpponent() {
    return aiController !== null;
}

export function isAiTurn() {
    return state.currentPlayer === "O" && aiController !== null;
}
