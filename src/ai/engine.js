/* =========================================================
   AI ENGINE — Tic Tac Toe opponent
   Alpha-beta minimax core + difficulty personalities.
   Pure module: board in, move index out. No DOM.
   ========================================================= */

import { WIN_PATTERNS, emptyCells, isBoardFull } from "../core/rules.js";

/* ---------------------------------------------------------
   Board evaluation helpers
   --------------------------------------------------------- */

const AI = "O";
const HUMAN = "X";

function winnerOf(board) {
    for (const [a, b, c] of WIN_PATTERNS) {
        if (
            board[a] !== "" &&
            board[a] === board[b] &&
            board[b] === board[c]
        ) {
            return board[a];
        }
    }
    return null;
}

/* ---------------------------------------------------------
   Move ordering: center > corners > edges.
   Improves alpha-beta pruning efficiency significantly.
   --------------------------------------------------------- */

const MOVE_ORDER = [4, 0, 2, 8, 6, 1, 3, 5, 7];

function orderedMoves(board) {
    const moves = [];
    for (const i of MOVE_ORDER) {
        if (board[i] === "") moves.push(i);
    }
    return moves;
}

/* ---------------------------------------------------------
   Alpha-beta minimax
   Depth-adjusted scores prefer faster wins / slower losses.
   --------------------------------------------------------- */

function minimax(board, depth, alpha, beta, maximizing) {
    const winner = winnerOf(board);

    if (winner === AI) return 10 - depth;
    if (winner === HUMAN) return depth - 10;
    if (isBoardFull(board)) return 0;

    const moves = orderedMoves(board);

    if (maximizing) {
        let best = -Infinity;
        for (const i of moves) {
            board[i] = AI;
            const score = minimax(board, depth + 1, alpha, beta, false);
            board[i] = "";
            if (score > best) best = score;
            if (best > alpha) alpha = best;
            if (alpha >= beta) break;
        }
        return best;
    }

    let best = Infinity;
    for (const i of moves) {
        board[i] = HUMAN;
        const score = minimax(board, depth + 1, alpha, beta, true);
        board[i] = "";
        if (score < best) best = score;
        if (best < beta) beta = best;
        if (alpha >= beta) break;
    }
    return best;
}

/**
 * Returns all moves tied for the best minimax score.
 * Used by Impossible (picks randomly among equals for variety)
 * and by Hard (as a base for occasional imperfection).
 */
export function bestMoves(board, player = AI) {
    const empty = emptyCells(board);
    if (empty.length === 0) return [];

    const isMaximizingForAI = player === AI;
    let bestScore = isMaximizingForAI ? -Infinity : Infinity;
    let best = [];

    const work = board.slice();

    for (const i of empty) {
        work[i] = player;
        const score = minimax(
            work,
            1,
            -Infinity,
            Infinity,
            !isMaximizingForAI
        );
        work[i] = "";

        if (isMaximizingForAI ? score > bestScore : score < bestScore) {
            bestScore = score;
            best = [i];
        } else if (score === bestScore) {
            best.push(i);
        }
    }

    return best;
}

/* ---------------------------------------------------------
   RNG — injectable for deterministic tests. Defaults to
   Math.random for gameplay variety; tests may set a seeded
   generator via setAiRng() to make simulations reproducible.
   --------------------------------------------------------- */

let rng = Math.random;

/** Replaces the engine's RNG (used by tests for fixed seeds). */
export function setAiRng(next) {
    rng = next || Math.random;
}

export function resetAiRng() {
    rng = Math.random;
}

export function bestMove(board, player = AI) {
    const options = bestMoves(board, player);
    if (options.length === 0) return -1;
    return options[Math.floor(rng() * options.length)];
}

/* ---------------------------------------------------------
   Tactical helpers shared by lower difficulties
   --------------------------------------------------------- */

function findWinningCell(board, player) {
    for (const [a, b, c] of WIN_PATTERNS) {
        const line = [board[a], board[b], board[c]];
        const own = line.filter((v) => v === player).length;
        const empty = line.filter((v) => v === "").length;
        if (own === 2 && empty === 1) {
            if (board[a] === "") return a;
            if (board[b] === "") return b;
            if (board[c] === "") return c;
        }
    }
    return -1;
}

/**
 * Detects a fork: a cell that creates two simultaneous
 * winning threats for `player`.
 */
function findForkCell(board, player) {
    const empty = emptyCells(board);
    const wins = [];
    for (const cell of empty) {
        const test = board.slice();
        test[cell] = player;
        let threats = 0;
        for (const [a, b, c] of WIN_PATTERNS) {
            if (
                test[a] === player &&
                test[b] === player &&
                test[c] === player
            ) {
                threats++;
            } else if (
                ((test[a] === player && test[b] === player && test[c] === "") ||
                    (test[a] === player && test[c] === player && test[b] === "") ||
                    (test[b] === player && test[c] === player && test[a] === ""))
            ) {
                threats++;
            }
        }
        if (threats >= 2) wins.push(cell);
    }
    return wins.length ? wins[0] : -1;
}

function randomOf(arr) {
    return arr[Math.floor(rng() * arr.length)];
}

/* ---------------------------------------------------------
   Difficulty personalities
   --------------------------------------------------------- */

export const DIFFICULTIES = {
    easy: {
        label: "Easy",
        // Mostly random, but takes a free win ~50% of the time and
        // blocks sometimes so it doesn't feel broken.
        chooseMove(board) {
            const empty = emptyCells(board);
            if (empty.length === 0) return -1;

            const winCell = findWinningCell(board, AI);
            if (winCell !== -1 && rng() < 0.5) return winCell;

            const blockCell = findWinningCell(board, HUMAN);
            if (blockCell !== -1 && rng() < 0.35) return blockCell;

            return randomOf(empty);
        }
    },

    medium: {
        label: "Medium",
        // Win > block > occasional fork awareness > center > corner.
        // Slips ~15% of the time so a decent player can beat it.
        chooseMove(board) {
            const empty = emptyCells(board);
            if (empty.length === 0) return -1;

            if (rng() < 0.15) return randomOf(empty);

            const winCell = findWinningCell(board, AI);
            if (winCell !== -1) return winCell;

            const blockCell = findWinningCell(board, HUMAN);
            if (blockCell !== -1) return blockCell;

            const forkCell = findForkCell(board, AI);
            if (forkCell !== -1) return forkCell;

            const humanFork = findForkCell(board, HUMAN);
            if (humanFork !== -1 && emptyCells(board).length > 6) {
                return humanFork;
            }

            if (board[4] === "") return 4;

            const corners = [0, 2, 6, 8].filter((i) => board[i] === "");
            if (corners.length) return randomOf(corners);

            return randomOf(empty);
        }
    },

    hard: {
        label: "Hard",
        // Optimal minimax but slips ~20% of the time into the
        // second-best tier of moves. Strong but beatable.
        chooseMove(board) {
            const empty = emptyCells(board);
            if (empty.length === 0) return -1;

            if (rng() < 0.2) {
                return randomOf(empty);
            }
            return bestMove(board, AI);
        }
    },

    impossible: {
        label: "Impossible",
        // Full alpha-beta. Never loses. Random among equal-value
        // moves so it doesn't play the identical game every time.
        chooseMove(board) {
            return bestMove(board, AI);
        }
    }
};

export const DIFFICULTY_IDS = Object.keys(DIFFICULTIES);

export function getDifficulty(id) {
    return DIFFICULTIES[id] || DIFFICULTIES.easy;
}

/**
 * Factory used by state.js as an aiController.
 */
export function createAiController(difficultyId) {
    const personality = getDifficulty(difficultyId);
    return {
        difficultyId,
        getMove(board, player) {
            if (player !== AI) {
                // Engine only plays as O; map defensively.
                return personality.chooseMove(board);
            }
            return personality.chooseMove(board);
        }
    };
}
