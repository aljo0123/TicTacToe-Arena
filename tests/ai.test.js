/* =========================================================
   AI TESTS
   Verifies legality, difficulty behavior, and that the
   Impossible difficulty never loses from any position.
   ========================================================= */

import {
    assert,
    assertEquals,
    section,
    report
} from "./run.js";

import {
    emptyBoard,
    emptyCells,
    resolveBoard,
    applyMove
} from "../src/core/rules.js";

import {
    DIFFICULTIES,
    bestMove,
    createAiController,
    setAiRng,
    resetAiRng
} from "../src/ai/engine.js";

/**
 * Deterministic seeded RNG (mulberry32). Fixed seed makes every
 * run of this suite produce identical assertion counts.
 */
function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Fixed seed — reproducible suite.
setAiRng(mulberry32(1337));

section("AI — legality");

for (const id of Object.keys(DIFFICULTIES)) {
    const personality = DIFFICULTIES[id];
    const board = emptyBoard();
    const move = personality.chooseMove(board);
    assert(
        move >= 0 && move <= 8,
        `${id}: opening move is in range (${move})`
    );
    assertEquals(board[move], "", `${id}: opening move targets empty cell`);
}

section("AI — Impossible takes immediate wins");

const winBoards = [
    // O can win at index 2
    ["O", "O", "", "X", "X", "", "", "", ""],
    // O can win at index 6
    ["O", "X", "X", "", "O", "", "", "", ""],
    // O can win at index 8
    ["X", "O", "", "X", "O", "", "", "", ""]
];

for (let i = 0; i < winBoards.length; i++) {
    const move = DIFFICULTIES.impossible.chooseMove(winBoards[i].slice());
    const after = applyMove(winBoards[i].slice(), move, "O");
    const result = resolveBoard(after);
    assertEquals(
        result.status,
        "won",
        `impossible finishes the game on board ${i}`
    );
    assertEquals(result.winner, "O", `impossible's win is for O (board ${i})`);
}

section("AI — Impossible blocks immediate threats");

const blockBoards = [
    // X threatens 0-1-2, must block at 2
    ["X", "X", "", "O", "", "", "", "", ""],
    // X threatens 0-4-8, must block at 8
    ["X", "", "", "O", "X", "", "", "", ""],
    // X threatens 2-4-6, must block at 6
    ["", "", "X", "O", "X", "", "", "", ""]
];

for (let i = 0; i < blockBoards.length; i++) {
    const board = blockBoards[i].slice();
    const move = DIFFICULTIES.impossible.chooseMove(board);
    const after = applyMove(board, move, "O");
    // After the block, X must NOT have a one-move win available.
    const xStillWins = emptyCells(after).some((cell) => {
        const test = after.slice();
        test[cell] = "X";
        return resolveBoard(test).winner === "X";
    });
    assertEquals(
        xStillWins,
        false,
        `impossible blocks the threat on board ${i} (moved to ${move})`
    );
}

section("AI — Impossible never loses (exhaustive, reproducible)");

/**
 * Full game-tree simulation: from the empty board, the human
 * plays every legal move; the AI always answers with its
 * chosen personality. If the human can EVER win, the test
 * fails. This exhaustively covers all reachable positions.
 *
 * NOTE: the Impossible AI randomizes among equally-optimal
 * moves, so leaf counts can vary run to run. The INVARIANT
 * tested here (human wins == 0) holds for every random seed —
 * any optimal-move set produces a draw-or-better outcome.
 */
function simulateAllGames(personality) {
    let humanWins = 0;
    let draws = 0;
    let aiWins = 0;
    let games = 0;

    function play(board, turn) {
        const outcome = resolveBoard(board);
        games++;

        if (outcome.status === "won") {
            if (outcome.winner === "X") humanWins++;
            else aiWins++;
            return;
        }
        if (outcome.status === "draw") {
            draws++;
            return;
        }

        if (turn === "X") {
            // Human explores every possible move.
            for (const cell of emptyCells(board)) {
                play(applyMove(board, cell, "X"), "O");
            }
        } else {
            // AI uses its personality once per position.
            const move = personality.chooseMove(board.slice());
            assert(
                move >= 0 && move <= 8 && board[move] === "",
                `impossible returned legal move in sim (move=${move}, board=${JSON.stringify(board)})`
            );
            play(applyMove(board, move, "O"), "X");
        }
    }

    play(emptyBoard(), "X");
    return { humanWins, draws, aiWins, games };
}

const sim = simulateAllGames(DIFFICULTIES.impossible);

assertEquals(sim.humanWins, 0, `impossible never loses (human won ${sim.humanWins} of ${sim.games} games)`);
assert(sim.aiWins > 0, "impossible wins some games");
assert(sim.games > 1000, `simulation covered the full game tree (${sim.games} leaf games)`);

section("AI — Medium blocks obvious threats");

// Medium should block this X threat the majority of the time.
// A large deterministic-invariant sample: with only a 15% slip
// rate, blocking is overwhelmingly likely in any window. We test
// the invariant (blocked at least once in 40 tries) plus a
// statistical floor (>=50%) that holds with near-certainty at
// n=40, p=0.85 (binomial sd ~1.5; failure odds < 1e-6).
let blockedCount = 0;
for (let i = 0; i < 40; i++) {
    const board = ["X", "X", "", "O", "", "", "", "", ""];
    const move = DIFFICULTIES.medium.chooseMove(board);
    if (move === 2) blockedCount++;
}
assert(
    blockedCount >= 1,
    `medium blocks obvious threats (blocked ${blockedCount}/40)`
);
assert(
    blockedCount >= 20,
    `medium blocks most of the time (${blockedCount}/40, floor 20)`
);

section("AI — Easy is legal and sometimes suboptimal");

// Easy's invariant: it must NEVER be perfectly optimal in every
// sampled game (that would make it identical to Impossible), and
// it must never block 100% (that would make it identical to
// Medium). Sample 40 and assert the statistical band.
let easyBlocked = 0;
for (let i = 0; i < 40; i++) {
    const board = ["X", "X", "", "O", "", "", "", "", ""];
    const move = DIFFICULTIES.easy.chooseMove(board);
    if (move === 2) easyBlocked++;
}
assert(
    easyBlocked < 40,
    `easy is imperfect by design (${easyBlocked}/40 blocks)`
);

section("AI — bestMove opening optimality");

// From the empty board every opening move for O scores 0 (draw),
// so all nine are equally optimal. Sample 90 times and assert
// the deterministic invariant: every sampled move is legal, and
// with 90 draws from 9 options, all nine WILL appear (coupon-
// collector; probability of missing any single one < 0.0004).
const seen = new Set();
for (let i = 0; i < 90; i++) {
    seen.add(bestMove(emptyBoard(), "O"));
}
assertEquals(seen.size, 9, `all nine openings sampled across 90 tries (got ${seen.size})`);

// Decisive positions: bestMove must pick the only winning move.

// O can win immediately at index 5 (line 3-4-5).
const winNow = ["X", "X", "", "O", "O", "", "", "", ""];
assertEquals(bestMove(winNow, "O"), 5, "bestMove takes the immediate win");

// O cannot win; X threatens index 2, so blocking 2 is the only
// move that avoids loss.
const mustBlock = ["X", "X", "", "O", "", "", "", "", ""];
assertEquals(bestMove(mustBlock, "O"), 2, "bestMove blocks the only threat");

section("AI — controller factory");

const controller = createAiController("impossible");
assertEquals(controller.difficultyId, "impossible", "controller keeps difficulty id");
const ctrlMove = controller.getMove(emptyBoard(), "O");
assert(ctrlMove >= 0 && ctrlMove <= 8, "controller returns legal move");
assert(
    typeof DIFFICULTIES.easy.chooseMove(emptyBoard()) === "number",
    "easy personality callable directly"
);

console.log(
    `\nImpossible simulation summary: ` +
    `${sim.games} leaf positions, ` +
    `AI wins ${sim.aiWins}, draws ${sim.draws}, human wins ${sim.humanWins}`
);

// Restore the production RNG for any subsequent suites.
resetAiRng();

report();
