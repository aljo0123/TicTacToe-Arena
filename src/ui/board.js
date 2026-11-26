/* =========================================================
   BOARD UI — DOM rendering for the game board
   Subscribes to state events; owns no game logic.
   ========================================================= */

import { PHASE, subscribe, hasAiOpponent } from "../core/state.js";
import { play } from "../audio/audio.js";
import { drawWinLine, clearWinLine } from "./win-line.js";

const cells = [];
let boardRoot = null;   // board container, set at init — used by win-line

export function initBoard(rootEl, { onCellClick }) {
    boardRoot = rootEl;
    rootEl.innerHTML = "";

    for (let i = 0; i < 9; i++) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "board-cell";
        cell.setAttribute("aria-label", `Cell ${i + 1}`);
        cell.dataset.index = i;

        cell.addEventListener("click", () => onCellClick(i));

        rootEl.appendChild(cell);
        cells.push(cell);
    }

    subscribe(onStateEvent);
}

function onStateEvent(event, data, state) {
    if (event === "game:start" || event === "game:reset") {
        clearBoard();
        setBoardEnabled(state.phase === PHASE.PLAYING);
        return;
    }

    if (event === "move:made") {
        renderMark(data.index, data.player);
        play(data.player === "X" ? "move" : "aiMove");
        return;
    }

    if (event === "game:over") {
        setBoardEnabled(false);
        if (data.result.line) {
            highlightWin(data.result.line);
            drawWinLine(boardRoot, data.result.line, data.result.winner);
        }
        return;
    }

    if (event === "ai:thinking") {
        setBoardEnabled(false);
        return;
    }

    if (event === "turn:changed") {
        // AI games: only the human's turn re-enables input.
        // Local games: both players use the same pointer.
        const inputEnabled =
            state.phase === PHASE.PLAYING &&
            (!hasAiOpponent() || data.player === "X");
        setBoardEnabled(inputEnabled);
    }
}

function clearBoard() {
    for (const cell of cells) {
        cell.innerHTML = "";
        cell.classList.remove("winner", "pop");
        cell.disabled = false;
    }
    clearWinLine(boardRoot);
}

function renderMark(index, player) {
    const cell = cells[index];
    cell.innerHTML = "";

    const mark = document.createElement("span");
    mark.className = `mark mark-${player.toLowerCase()}`;
    cell.appendChild(mark);

    cell.classList.add("pop");
    cell.disabled = true;
}

function highlightWin(line) {
    for (const index of line) {
        cells[index].classList.add("winner");
        cells[index].classList.remove("pop");
    }
}

function setBoardEnabled(enabled) {
    for (const cell of cells) {
        if (cell.dataset.locked === "true") continue;
        cell.disabled = !enabled || cell.innerHTML !== "";
    }
}
