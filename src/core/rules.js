/* =========================================================
   RULES — win detection, draw detection, move validation
   Pure functions, no DOM, no state. Testable.
   ========================================================= */

export const WIN_PATTERNS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

export function emptyBoard() {
    return ["", "", "", "", "", "", "", "", ""];
}

export function isValidMove(board, index) {
    return (
        Number.isInteger(index) &&
        index >= 0 &&
        index <= 8 &&
        board[index] === ""
    );
}

export function emptyCells(board) {
    const result = [];
    for (let i = 0; i < 9; i++) {
        if (board[i] === "") result.push(i);
    }
    return result;
}

export function isBoardFull(board) {
    return board.every((cell) => cell !== "");
}

/**
 * Returns { winner: "X"|"O", line: [a,b,c] } or null.
 */
export function getWinningLine(board) {
    for (const pattern of WIN_PATTERNS) {
        const [a, b, c] = pattern;
        if (
            board[a] !== "" &&
            board[a] === board[b] &&
            board[b] === board[c]
        ) {
            return { winner: board[a], line: pattern };
        }
    }
    return null;
}

/**
 * Full board resolution. Returns:
 *   { status: "playing" }
 *   { status: "won", winner, line }
 *   { status: "draw" }
 */
export function resolveBoard(board) {
    const win = getWinningLine(board);
    if (win) {
        return {
            status: "won",
            winner: win.winner,
            line: win.line
        };
    }
    if (isBoardFull(board)) {
        return { status: "draw" };
    }
    return { status: "playing" };
}

/**
 * Applies a move to a fresh copy of the board (immutable).
 * Throws on invalid move — callers should validate first.
 */
export function applyMove(board, index, player) {
    if (!isValidMove(board, index)) {
        throw new Error(
            `Invalid move: cell ${index} with board ${JSON.stringify(board)}`
        );
    }
    const next = board.slice();
    next[index] = player;
    return next;
}

export function opponentOf(player) {
    return player === "X" ? "O" : "X";
}
