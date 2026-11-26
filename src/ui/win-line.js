/* =========================================================
   WIN LINE — stroke animation across the three winning cells.
   Pure geometry is exported for testing; the drawing half is
   DOM-only. Fires immediately on game over — never delays the
   result banner and never blocks interaction (pointer-events
   are disabled on the SVG layer).
   ========================================================= */

import { WIN_PATTERNS } from "../core/rules.js";

/**
 * Computes the line segment for a winning combination in the
 * board's normalized coordinate space (0–100 per axis, cells
 * centered at 16.67/50/83.33).
 *
 * @param {number[]} combo — three cell indexes, e.g. [0,1,2]
 * @returns {{ x1,y1,x2,y2 }} endpoints in board units
 */
export function lineForCombo(combo) {
    const center = (i) => ({
        x: (i % 3) * 33.333 + 16.667,
        y: Math.floor(i / 3) * 33.333 + 16.667
    });

    const first = center(combo[0]);
    const last = center(combo[2]);

    // Extend the segment slightly beyond both end cells so the
    // stroke visually connects edge to edge, not center to center.
    const extend = 11;
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    return {
        x1: first.x - (dx / len) * extend,
        y1: first.y - (dy / len) * extend,
        x2: last.x + (dx / len) * extend,
        y2: last.y + (dy / len) * extend,
        length: len + extend * 2
    };
}

/** All 8 combos with precomputed geometry (used by tests too). */
export function allCombos() {
    return WIN_PATTERNS.map((combo) => ({
        combo,
        ...lineForCombo(combo)
    }));
}

/**
 * Draws the animated line. No-op for draws (line === null) or
 * when reduced motion is requested (line appears instantly).
 *
 * @param {HTMLElement} boardEl — the .board container
 * @param {number[]|null} combo — winning cells or null (draw)
 * @param {string} player — "X" | "O" (colors the stroke)
 */
export function drawWinLine(boardEl, combo, player) {
    if (!boardEl || !combo || combo.length !== 3) return;

    const reducedMotion =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const geo = lineForCombo(combo);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.classList.add("win-line-svg");

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", geo.x1);
    line.setAttribute("y1", geo.y1);
    line.setAttribute("x2", geo.x2);
    line.setAttribute("y2", geo.y2);
    line.setAttribute("stroke", player === "X" ? "var(--x)" : "var(--o)");
    line.classList.add("win-line-stroke");

    // Dash technique: stroke drawn by animating the offset to 0.
    const total = geo.length;
    line.style.strokeDasharray = `${total}`;
    line.style.strokeDashoffset = reducedMotion ? "0" : `${total}`;

    svg.appendChild(line);
    boardEl.appendChild(svg);

    if (!reducedMotion) {
        // Double rAF ensures the initial offset is committed first.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                line.style.transition = "stroke-dashoffset 0.45s ease-out";
                line.style.strokeDashoffset = "0";
            });
        });
    }
}

/** Removes any existing win line (rematch/reset). */
export function clearWinLine(boardEl) {
    if (!boardEl) return;
    const existing = boardEl.querySelectorAll(".win-line-svg");
    existing.forEach((el) => el.remove());
}
