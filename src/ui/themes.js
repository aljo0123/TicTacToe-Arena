/* =========================================================
   THEMES — board color themes and mark styles.
   Applied by toggling a data attribute on <body>.
   ========================================================= */

import { getProgress } from "../progression/xp.js";

export function applyTheme(themeId) {
    document.body.dataset.theme = themeId || "default";
}

export function applyMarkStyle(markId) {
    document.body.dataset.marks = markId || "classic";
}

export function initThemeFromProgress() {
    const progress = getProgress();
    applyTheme(progress.selectedTheme);
    applyMarkStyle(progress.selectedMark);
}
