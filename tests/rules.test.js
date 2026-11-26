/* =========================================================
   RULES TESTS
   ========================================================= */

import {
    assert,
    assertEquals,
    section,
    report
} from "./run.js";

import {
    emptyBoard,
    isValidMove,
    emptyCells,
    isBoardFull,
    getWinningLine,
    resolveBoard,
    applyMove,
    opponentOf
} from "../src/core/rules.js";

section("Rules — board basics");

const board = emptyBoard();
assertEquals(board.length, 9, "empty board has 9 cells");
assertEquals(emptyCells(board).length, 9, "empty board has 9 empty cells");
assertEquals(isBoardFull(board), false, "empty board not full");
assertEquals(opponentOf("X"), "O", "opponent of X is O");
assertEquals(opponentOf("O"), "X", "opponent of O is X");

section("Rules — move validation");

assertEquals(isValidMove(emptyBoard(), 0), true, "move on empty cell valid");
assertEquals(isValidMove(emptyBoard(), 8), true, "move on last cell valid");
assertEquals(isValidMove(emptyBoard(), -1), false, "negative index invalid");
assertEquals(isValidMove(emptyBoard(), 9), false, "index 9 invalid");
assertEquals(isValidMove(emptyBoard(), 1.5), false, "fractional index invalid");
assertEquals(isValidMove(["X", "", "", "", "", "", "", "", ""], 0), false, "occupied cell invalid");

section("Rules — win detection (all 8 lines, both players)");

const winsX = [
    ["X", "X", "X", "", "", "", "", "", ""],
    ["", "", "", "X", "X", "X", "", "", ""],
    ["", "", "", "", "", "", "X", "X", "X"],
    ["X", "", "", "X", "", "", "X", "", ""],
    ["", "X", "", "", "X", "", "", "X", ""],
    ["", "", "X", "", "", "X", "", "", "X"],
    ["X", "", "", "", "X", "", "", "", "X"],
    ["", "", "X", "", "X", "", "X", "", ""]
];

for (let i = 0; i < winsX.length; i++) {
    const result = resolveBoard(winsX[i]);
    assertEquals(result.status, "won", `win pattern ${i} detected`);
    assertEquals(result.winner, "X", `win pattern ${i} winner is X`);
    assertEquals(result.line.length, 3, `win pattern ${i} has 3 cells`);
}

const winsO = winsX.map((b) => b.map((c) => (c === "X" ? "O" : c)));
for (let i = 0; i < winsO.length; i++) {
    const result = resolveBoard(winsO[i]);
    assertEquals(result.winner, "O", `O win pattern ${i} detected`);
}

section("Rules — no false wins");

const noWin = ["X", "X", "O", "O", "X", "X", "", "O", ""];
assertEquals(resolveBoard(noWin).status, "playing", "non-line board with space still playing");

// X has 4 in scattered cells, no 3 in a line.
const tricky = ["X", "O", "X", "X", "O", "O", "O", "X", ""];
const trickyResult = resolveBoard(tricky);
assertEquals(trickyResult.status, "playing", "scattered board is playing");

section("Rules — draw detection");

const drawBoard = ["X", "O", "X", "X", "O", "O", "O", "X", "X"];
assertEquals(resolveBoard(drawBoard).status, "draw", "full board no line = draw");

const notDrawYet = ["X", "O", "X", "X", "O", "O", "O", "X", ""];
assertEquals(resolveBoard(notDrawYet).status, "playing", "one empty cell = playing");

// Edge case: board full AND would-be line — win takes priority.
const winPriority = ["X", "X", "X", "O", "O", "O", "O", "X", "X"];
assertEquals(resolveBoard(winPriority).winner, "X", "win beats draw when both full");

section("Rules — applyMove immutability");

const b1 = emptyBoard();
const b2 = applyMove(b1, 4, "X");
assertEquals(b1[4], "", "original board unchanged");
assertEquals(b2[4], "X", "new board has the move");
assertEquals(b2.length, 9, "new board still 9 cells");

let threw = false;
try {
    applyMove(b2, 4, "O");
} catch (e) {
    threw = true;
}
assertEquals(threw, true, "applyMove throws on occupied cell");

report();
