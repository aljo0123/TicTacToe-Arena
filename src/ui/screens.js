/* =========================================================
   SCREENS & OVERLAYS — navigation, game-over, settings,
   stats, achievements panels. The app's control center.
   ========================================================= */

import {
    subscribe,
    startGame,
    resetGame,
    attemptMove,
    getState,
    hasAiOpponent,
    PHASE
} from "../core/state.js";
import {
    getMode,
    PUZZLES,
    getDailyPuzzle,
    todayKey
} from "../core/modes.js";
import { createAiController } from "../ai/engine.js";
import { play, initAudio, getSettings, updateSettings, startMusic, stopMusic } from "../audio/audio.js";
import { grantXp, getProgress, selectTheme, selectMark, THEMES, MARK_STYLES } from "../progression/xp.js";
import { recordGame, getStats, getAchievements, recordContextual, resetStats } from "../progression/stats.js";
import { loadDaily, saveJSON } from "../storage/storage.js";
import { getPlatform } from "./platform-bridge.js";
import { applyTheme, applyMarkStyle } from "./themes.js";
import { finalStatusLabel, resultBannerCopy } from "./results.js";
import { createAdGate } from "./ad-gate.js";
import { maybeShowOnboarding } from "./onboarding.js";

/* ---------------------------------------------------------
   DOM references
   --------------------------------------------------------- */

const $ = (id) => document.getElementById(id);

const el = {
    app: $("app"),
    loading: $("loadingScreen"),
    menu: $("menu"),
    menuModes: $("menuModes"),
    modeSelect: $("modeSelect"),
    menuDifficulty: $("menuDifficulty"),
    game: $("game"),
    status: $("status"),
    statusLabel: $("statusLabel"),
    board: $("board"),
    xScore: $("xScore"),
    oScore: $("oScore"),
    drawScore: $("drawScore"),
    scoreXLabel: $("scoreXLabel"),
    scoreOLabel: $("scoreOLabel"),
    modeTitle: $("modeTitle"),
    turnIndicator: $("turnIndicator"),
    overlay: $("gameOverlay"),
    overlayTitle: $("overlayTitle"),
    overlaySub: $("overlaySub"),
    overlayPrimary: $("overlayPrimary"),
    overlaySecondary: $("overlaySecondary"),
    overlayTertiary: $("overlayTertiary"),
    timerBar: $("timerBar"),
    timerWrap: $("timerWrap"),
    levelBadge: $("levelBadge"),
    xpFill: $("xpFill"),
    xpText: $("xpText"),
    toast: $("toast"),
    streakNote: $("streakNote")
};

/* ---------------------------------------------------------
   Session state (UI-level, not game state)
   --------------------------------------------------------- */

let session = {
    modeId: null,
    difficulty: "medium",
    scores: { X: 0, O: 0, draws: 0 },
    currentStreak: 0,
    tournament: null,
    lastStarter: "X",
    nextStarter: "X",
    configAiFirst: false,
    aiSavedStreak: false
};

/** Gates midgame ads until the result banner is dismissed. */
const adGate = createAdGate();

/** Last-used difficulty for the lobby Play button. */
const DIFFICULTY_LABELS = {
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    impossible: "Impossible"
};

function refreshPlayButton() {
    const hint = $("playNowHint");
    if (hint) {
        hint.textContent = `vs AI · ${DIFFICULTY_LABELS[session.difficulty] || "Medium"}`;
    }
}

/* ---------------------------------------------------------
   Toasts
   --------------------------------------------------------- */

let toastTimer = null;

export function showToast(message, duration = 2600) {
    if (!el.toast) return;
    el.toast.textContent = message;
    el.toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        el.toast.classList.remove("visible");
    }, duration);
}

/* ---------------------------------------------------------
   Screen navigation
   --------------------------------------------------------- */

export function showMenu() {
    el.menu.style.display = "flex";
    el.game.style.display = "none";
    if (el.modeSelect) el.modeSelect.style.display = "none";
    getPlatform().gameplayStop();
    refreshMenuMeta();
}

/** Modes screen (secondary section of the lobby). */
export function showModeSelect() {
    el.menu.style.display = "none";
    el.game.style.display = "none";
    if (el.modeSelect) el.modeSelect.style.display = "flex";
    hideDifficulty();
}

/** Shows the in-mode difficulty picker for AI modes. */
export function showDifficulty() {
    if (!el.menuDifficulty) return;
    el.menuDifficulty.style.display = "block";
    const grid = document.getElementById("modeGrid");
    if (grid) grid.classList.add("hidden");
}

/** Returns from the difficulty picker to the mode list. */
export function hideDifficulty() {
    if (!el.menuDifficulty) return;
    el.menuDifficulty.style.display = "none";
    const grid = document.getElementById("modeGrid");
    if (grid) grid.classList.remove("hidden");
}

export function showGame(modeId) {
    const mode = getMode(modeId);
    el.modeTitle.textContent = mode.name;
    el.menu.style.display = "none";
    if (el.modeSelect) el.modeSelect.style.display = "none";
    el.game.style.display = "block";
    hideOverlay();
}

export function goHome() {
    // Leaving the result banner via Home is an ad-permitted break;
    // the gate arms the request and it fires once, non-blocking.
    const canAd = adGate.bannerDismissed();
    resetGame();
    session.currentStreak = 0;
    showMenu();
    if (canAd) {
        adGate.request(getPlatform());
    }
}

/* ---------------------------------------------------------
   Menu meta — level badge and progress
   --------------------------------------------------------- */

function refreshMenuMeta() {
    const progress = getProgress();
    if (el.levelBadge) {
        el.levelBadge.textContent = `LV ${progress.level} · ${progress.title}`;
    }
    if (el.xpFill && el.xpText) {
        el.xpFill.style.width = `${Math.round(progress.view.ratio * 100)}%`;
        el.xpText.textContent = `${progress.view.xpToNext} XP to level ${progress.level + 1}`;
    }
    applyTheme(progress.selectedTheme);
    applyMarkStyle(progress.selectedMark);
}

/* ---------------------------------------------------------
   Launching games
   --------------------------------------------------------- */

export function getSession() {
    return session;
}

/**
 * Lobby Play button: launches Play vs AI with the last-used
 * difficulty — one tap from lobby to gameplay.
 */
export function playNow() {
    initAudio();
    play("click");
    launchWithDifficulty(session.difficulty || "medium");
}

export function launchClassicLocal() {
    session.modeId = "classic-local";
    session.scores = { X: 0, O: 0, draws: 0 };
    session.lastStarter = "X";
    session.nextStarter = "X";
    session.configAiFirst = false;
    showGame(session.modeId);
    updateScoreboard();
    startSession();
}

export function launchClassicAi(difficulty) {
    session.modeId = "classic-ai";
    session.difficulty = difficulty;
    session.scores = { X: 0, O: 0, draws: 0 };
    session.lastStarter = "X";
    showGame(session.modeId);
    updateScoreboard();
    startSession();
}

export function launchMode(modeId) {
    const mode = getMode(modeId);

    if (modeId === "classic-local") {
        launchClassicLocal();
        return;
    }

    session.modeId = modeId;
    session.scores = { X: 0, O: 0, draws: 0 };
    session.currentStreak = 0;
    session.lastStarter = "X";
    session.nextStarter = "X";
    session.configAiFirst = false;

    if (modeId === "tournament") {
        session.tournament = { human: 0, ai: 0, games: 0 };
    }

    if (modeId === "daily") {
        const daily = loadDaily();
        if (daily.lastCompleted === todayKey()) {
            showToast("Today's challenge is already complete — come back tomorrow!");
            return;
        }
    }

    if (mode.usesAI) {
        showDifficultyForMode(modeId);
        return;
    }

    showGame(modeId);
    updateScoreboard();
    startSession();
}

let pendingModeId = null;

function showDifficultyForMode(modeId) {
    pendingModeId = modeId;
    showDifficulty();
}

export function launchWithDifficulty(difficulty) {
    const modeId = pendingModeId || "classic-ai";
    pendingModeId = null;

    session.modeId = modeId;
    session.difficulty = difficulty;
    session.lastStarter = "X";
    session.nextStarter = "X";
    session.configAiFirst = false;

    showGame(modeId);
    updateScoreboard();
    startSession();
}

/* ---------------------------------------------------------
   Session lifecycle
   --------------------------------------------------------- */

function startSession() {
    const mode = getMode(session.modeId);
    const usesAI = mode.usesAI;

    const config = {
        ...(mode.defaultConfig || {}),
        // Alternate the opening player between games.
        startingPlayer: session.nextStarter || "X"
    };

    let presetBoard = null;
    let puzzleIndex = null;

    if (session.modeId === "challenge") {
        puzzleIndex = Math.floor(Math.random() * PUZZLES.length);
        const puzzle = PUZZLES[puzzleIndex];
        presetBoard = puzzle.board;
        showToast(`${puzzle.title} — ${puzzle.hint}`);
    }

    if (session.modeId === "daily") {
        const puzzle = getDailyPuzzle(todayKey());
        presetBoard = puzzle.board;
        showToast(`Daily Challenge — ${puzzle.title}: ${puzzle.hint}`);
    }

    // In streak mode, AI difficulty ramps up slightly with the streak.
    let difficulty = session.difficulty;
    if (session.modeId === "streak") {
        difficulty = rampDifficulty(session.currentStreak);
    }

    startGame({
        mode: session.modeId,
        aiController: usesAI ? createAiController(difficulty) : null,
        config: {
            ...config,
            aiMovesFirst: !!session.configAiFirst
        },
        puzzleIndex
    });

    // One-shot flag — the alternation applies to the next game only.
    session.configAiFirst = false;

    // Portal SDK lifecycle: active gameplay begins here. The adapter
    // deduplicates, so rematches within a session are safe.
    getPlatform().gameplayStart();

    // Player identity strip (lobby redesign).
    const diffTitle = $("difficultyTitle");
    if (diffTitle) {
        diffTitle.textContent =
            (DIFFICULTY_LABELS[difficulty] || difficulty || "").toUpperCase();
        diffTitle.style.display = usesAI ? "block" : "none";
    }
    const xName = $("playerXName");
    const oName = $("playerOName");
    if (xName) xName.textContent = usesAI ? "YOU" : "PLAYER X";
    if (oName) oName.textContent = usesAI ? "AI" : "PLAYER O";

    updateTurnLabels();
    updateScoreLabels();
}

/** Streak mode: escalate difficulty every 3 wins. */
function rampDifficulty(streak) {
    if (streak >= 6) return "impossible";
    if (streak >= 3) return "hard";
    return session.difficulty || "medium";
}

/* ---------------------------------------------------------
   Turn labels & scoreboard
   --------------------------------------------------------- */

function updateTurnLabels() {
    const state = getState();
    const mode = getMode(session.modeId);
    const isAiGame = mode.usesAI;

    // Highlight the active player card.
    const xCard = document.querySelector(".player-card.player-x");
    const oCard = document.querySelector(".player-card.player-o");
    if (xCard && oCard && state.phase !== PHASE.OVER) {
        xCard.classList.toggle("turn-active", state.currentPlayer === "X");
        oCard.classList.toggle("turn-active", state.currentPlayer === "O");
    }

    let label;
    if (state.phase === PHASE.OVER) return;

    if (isAiGame) {
        label = state.currentPlayer === "X" ? "Your Turn" : "AI Thinking…";
    } else {
        label = `Player ${state.currentPlayer} Turn`;
    }

    if (el.status) el.status.textContent = label;
    if (el.turnIndicator) {
        el.turnIndicator.className =
            `turn-dot turn-${state.currentPlayer.toLowerCase()}`;
    }
}

function updateScoreLabels() {
    const mode = getMode(session.modeId);
    if (mode.usesAI) {
        if (el.scoreXLabel) el.scoreXLabel.textContent = "YOU";
        if (el.scoreOLabel) el.scoreOLabel.textContent = "AI";
    } else {
        if (el.scoreXLabel) el.scoreXLabel.textContent = "PLAYER X";
        if (el.scoreOLabel) el.scoreOLabel.textContent = "PLAYER O";
    }
}

function updateScoreboard() {
    if (el.xScore) el.xScore.textContent = session.scores.X;
    if (el.oScore) el.oScore.textContent = session.scores.O;
    if (el.drawScore) el.drawScore.textContent = session.scores.draws;
}

/* ---------------------------------------------------------
   Cell interaction
   --------------------------------------------------------- */

export function onCellClick(index) {
    initAudio();
    startMusic();

    const state = getState();
    if (state.phase !== PHASE.PLAYING) return;

    // AI games: only the human (X) may click.
    // Local multiplayer: whoever's turn it is may click.
    if (hasAiOpponent() && state.currentPlayer !== "X") return;

    const result = attemptMove(index, state.currentPlayer);
    if (!result.ok) return;

    updateTurnLabels();
}

/* ---------------------------------------------------------
   Game over flow
   --------------------------------------------------------- */

function onGameOver(event, data) {
    const result = data.result;
    const state = data.state;
    const mode = getMode(session.modeId);
    const isAiGame = mode.usesAI;

    // Set the final status IMMEDIATELY — before any async work.
    // The AI's scheduled callback can never overwrite this: the
    // state machine sets phase OVER and stops timers, and every
    // status-writing path checks phase before rendering.
    if (el.status) {
        el.status.textContent = finalStatusLabel(result, isAiGame);
    }
    if (el.statusLabel) {
        el.statusLabel.textContent = "MATCH OVER";
    }
    if (el.turnIndicator) {
        el.turnIndicator.className = "turn-dot";
    }
    document.querySelectorAll(".player-card")?.forEach((c) =>
        c.classList.remove("turn-active")
    );
    adGate.bannerOpened();

    // Scoreboard updates.
    if (result.status === "won") {
        if (result.winner === "X") session.scores.X++;
        else session.scores.O++;
    } else if (result.status === "draw") {
        session.scores.draws++;
    }
    updateScoreboard();

    // Human perspective result.
    let playerResult;
    if (result.status === "draw") playerResult = "draw";
    else if (!isAiGame) playerResult = result.winner === "X" ? "win" : "loss";
    else playerResult = result.winner === "X" ? "win" : "loss";

    const isHumanGame = session.modeId !== "classic-local";
    const { newAchievements } = recordGame({
        mode: session.modeId,
        playerResult,
        difficulty: isAiGame ? session.difficulty : null,
        isHumanGame
    });

    // XP
    const xp = xpForResultSafe(result.status);
    const levelUp = grantXp(xp);

    // Sounds
    if (result.status === "won") play(isAiGame && result.winner === "O" ? "lose" : "win");
    else if (result.status === "draw") play("draw");
    else play("lose");

    if (result.status === "timeout") play("timerExpired");

    // Tournament bookkeeping.
    if (session.modeId === "tournament" && session.tournament) {
        if (result.status === "won") {
            if (result.winner === "X") session.tournament.human++;
            else session.tournament.ai++;
        }
        session.tournament.games++;
    }

    // Daily bookkeeping.
    let dailyCompleted = false;
    if (session.modeId === "daily" && playerResult === "win") {
        const daily = loadDaily();
        daily.lastCompleted = todayKey();
        daily.streak++;
        saveJSON("daily", daily);
        dailyCompleted = true;
        recordContextual({ dailyCompleted: true });
    }

    // Streak mode bookkeeping.
    if (session.modeId === "streak") {
        if (playerResult === "win") {
            session.currentStreak++;
            showToast(`Streak: ${session.currentStreak}! Keep going.`);
        } else {
            offerStreakSave(playerResult);
            return;
        }
    }

    // Achievement toasts.
    for (const achievement of newAchievements) {
        showToast(`🏆 Achievement: ${achievement.name}`);
        play("achievement");
    }

    // Level-up toast.
    if (levelUp && levelUp.leveledUp) {
        showToast(`⬆ Level ${levelUp.newLevel} — ${getProgress().title}!`);
    }

    // Contextual achievements after state updates.
    if (session.modeId === "tournament" && session.tournament) {
        const winsNeeded = getMode("tournament").defaultConfig.winsNeeded;
        if (session.tournament.human >= winsNeeded) {
            recordContextual({ tournamentWon: true });
        }
    }

    // Show the overlay after a short beat to let the win line play.
    setTimeout(() => {
        showGameOverOverlay(result, playerResult, dailyCompleted);
    }, 900);

    getPlatform().gameplayStop();
}

function xpForResultSafe(status) {
    try {
        const mode = getMode(session.modeId);
        let base;
        if (status === "won") base = mode.xpOnWin;
        else if (status === "draw") base = mode.xpOnDraw;
        else base = mode.xpOnLoss;

        if (mode.xpDifficultyMultiplier && mode.usesAI) {
            const mult = mode.xpDifficultyMultiplier[session.difficulty] || 1;
            base = Math.round(base * mult);
        }
        return base;
    } catch (error) {
        return 0;
    }
}

/* ---------------------------------------------------------
   Streak save (rewarded ad integration point)
   --------------------------------------------------------- */

function offerStreakSave(playerResult) {
    const platform = getPlatform();
    const canSave = platform.getPlatformInfo().supportsRewardedAds && !session.aiSavedStreak;

    if (playerResult === "draw") {
        // Draw simply ends the streak with no save offer.
        session.currentStreak = 0;
        showGameOverOverlay({ status: "draw", winner: null, line: null }, "draw", false);
        return;
    }

    if (!canSave) {
        session.currentStreak = 0;
        showGameOverOverlay({ status: "won", winner: "O", line: null }, "loss", false);
        return;
    }

    // Offer a rewarded continuation.
    el.overlayTitle.textContent = `Streak: ${session.currentStreak}`;
    el.overlaySub.textContent = "Watch a short ad to save your streak and keep playing?";
    el.overlayPrimary.textContent = "Save Streak ▶";
    el.overlaySecondary.textContent = "Continue Without Saving";
    el.overlayTertiary.textContent = "Home";

    el.overlayPrimary.onclick = async () => {
        hideOverlay();
        const ad = await platform.showRewardedAd();
        if (ad.rewarded) {
            showToast("Streak saved! Keep going.");
            startSession();
        } else {
            session.currentStreak = 0;
            showGameOverOverlay({ status: "won", winner: "O", line: null }, "loss", false);
        }
    };

    el.overlaySecondary.onclick = () => {
        hideOverlay();
        session.currentStreak = 0;
        showGameOverOverlay({ status: "won", winner: "O", line: null }, "loss", false);
    };

    el.overlayTertiary.onclick = () => {
        hideOverlay();
        goHome();
    };

    showOverlay();
}

/* ---------------------------------------------------------
   Game-over overlay
   --------------------------------------------------------- */

function showGameOverOverlay(result, playerResult, dailyCompleted) {
    const mode = getMode(session.modeId);
    const isAiGame = mode.usesAI;

    const copy = resultBannerCopy(result, isAiGame);
    let { title, sub } = copy;

    // Tournament special-casing.
    if (session.modeId === "tournament" && session.tournament) {
        const winsNeeded = getMode("tournament").defaultConfig.winsNeeded;
        sub = `You ${session.tournament.human} — ${session.tournament.ai} AI (first to ${winsNeeded})`;

        if (session.tournament.human >= winsNeeded) {
            title = "🏆 Tournament Won!";
            sub = `Final score ${session.tournament.human}–${session.tournament.ai}`;
        } else if (session.tournament.ai >= winsNeeded) {
            title = "Tournament Lost";
            sub = `Final score ${session.tournament.human}–${session.tournament.ai}`;
        }
    }

    if (dailyCompleted) {
        sub += " Daily streak extended!";
    }

    el.overlayTitle.textContent = title;
    el.overlaySub.textContent = sub;

    // Primary action depends on mode.
    const tournamentDecided =
        session.modeId === "tournament" && session.tournament &&
        (session.tournament.human >= getMode("tournament").defaultConfig.winsNeeded ||
            session.tournament.ai >= getMode("tournament").defaultConfig.winsNeeded);

    el.overlayPrimary.textContent = tournamentDecided
        ? "New Tournament"
        : session.modeId === "daily"
            ? "Home"
            : "Rematch";

    el.overlaySecondary.textContent = session.modeId === "daily" ? "Rematch (practice)" : "Change Mode";
    el.overlayTertiary.textContent = "Home";

    el.overlayPrimary.onclick = () => {
        hideOverlay();
        if (session.modeId === "daily") {
            goHome();
            return;
        }
        if (tournamentDecided) {
            session.tournament = { human: 0, ai: 0, games: 0 };
        }
        // Alternate who starts the next game (works for local AND AI).
        session.nextStarter = session.nextStarter === "O" ? "X" : "O";
        if (session.nextStarter === "O" && getMode(session.modeId).usesAI) {
            session.configAiFirst = true;
        }
        startSession();
    };

    el.overlaySecondary.onclick = () => {
        hideOverlay();
        goHome();
    };

    el.overlayTertiary.onclick = () => {
        hideOverlay();
        goHome();
    };

    showOverlay();

    // NO midgame ad here. The ad fires only when the player leaves
    // the banner via Home or Change Mode — see the dismiss handlers
    // in goHome() and via adGate.bannerDismissed().
}

function showOverlay() {
    if (!el.overlay) return;
    el.overlay.classList.add("visible");
    if (el.game) el.game.classList.add("banner-open");

    // Guarantee the full board stays visible: add space below the
    // page equal to the banner height, then scroll the board so its
    // bottom edge sits above the banner's top edge.
    requestAnimationFrame(() => {
        const bannerH = el.overlay.offsetHeight;
        const boardEl = document.querySelector(".board");
        if (!boardEl || bannerH <= 0) return;

        if (el.game) {
            el.game.style.paddingBottom = `${bannerH + 16}px`;
        }

        // Instant scroll in the same frame as the padding so the
        // board's bottom edge always lands above the banner.
        const rect = boardEl.getBoundingClientRect();
        const targetBottom = window.innerHeight - bannerH - 12;
        const delta = rect.bottom - targetBottom;
        if (delta > 0) {
            window.scrollBy({ top: delta, behavior: "instant" });
        }
    });
}

function hideOverlay() {
    if (!el.overlay) return;
    el.overlay.classList.remove("visible");
    if (el.game) el.game.classList.remove("banner-open");
    if (el.game) {
        el.game.style.paddingBottom = "";
    }
}

/* ---------------------------------------------------------
   Timer UI
   --------------------------------------------------------- */

let timerRaf = null;

function onTimerArm(event, data) {
    if (!el.timerWrap) return;
    el.timerWrap.style.display = "block";
    animateTimer(data.deadline, data.duration);
}

function animateTimer(deadline, duration) {
    if (timerRaf) cancelAnimationFrame(timerRaf);

    function frame() {
        const remaining = deadline - Date.now();
        if (remaining <= 0) {
            if (el.timerBar) el.timerBar.style.width = "0%";
            timerRaf = null;
            return;
        }
        const ratio = remaining / duration;
        if (el.timerBar) el.timerBar.style.width = `${ratio * 100}%`;
        el.timerBar.classList.toggle("urgent", ratio < 0.33);
        timerRaf = requestAnimationFrame(frame);
    }

    frame();
}

function onTimerExpired() {
    if (el.timerWrap) el.timerWrap.style.display = "none";
}

/* ---------------------------------------------------------
   AI turn indicator animation
   --------------------------------------------------------- */

function onAiThinking() {
    updateTurnLabels();
}

/* ---------------------------------------------------------
   Settings panel
   --------------------------------------------------------- */

export function openSettings() {
    play("click");
    const panel = $("settingsPanel");
    if (!panel) return;

    const settings = getSettings();
    panel.innerHTML = `
        <div class="panel-header">
            <h3>Settings</h3>
            <button type="button" class="panel-close" id="settingsClose">✕</button>
        </div>

        <div class="setting-row">
            <label for="masterVol">Master Volume</label>
            <input type="range" id="masterVol" min="0" max="1" step="0.05"
                value="${settings.masterVolume}">
        </div>

        <div class="setting-row">
            <label for="sfxVol">Effects Volume</label>
            <input type="range" id="sfxVol" min="0" max="1" step="0.05"
                value="${settings.sfxVolume}">
        </div>

        <div class="setting-row">
            <label for="soundToggle">Sound Effects</label>
            <button type="button" id="soundToggle" class="toggle-button ${settings.soundEnabled ? "on" : ""}">
                ${settings.soundEnabled ? "On" : "Off"}
            </button>
        </div>

        <div class="setting-row">
            <label for="musicToggle">Ambient Music</label>
            <button type="button" id="musicToggle" class="toggle-button ${settings.musicEnabled ? "on" : ""}">
                ${settings.musicEnabled ? "On" : "Off"}
            </button>
        </div>

        <div class="setting-section">Board Theme</div>
        <div class="theme-grid">
            ${THEMES.map((theme) => {
        const p = getProgress();
        const unlocked = p.level >= theme.requiredLevel;
        const active = p.selectedTheme === theme.id;
        return `
                    <button type="button"
                        class="theme-swatch theme-${theme.id} ${active ? "active" : ""} ${unlocked ? "" : "locked"}"
                        data-theme="${theme.id}"
                        ${unlocked ? "" : "disabled"}>
                        ${theme.name}${unlocked ? "" : ` (LV ${theme.requiredLevel})`}
                    </button>`;
    }).join("")}
        </div>

        <div class="setting-section">Mark Style</div>
        <div class="theme-grid">
            ${MARK_STYLES.map((mark) => {
        const p = getProgress();
        const unlocked = p.level >= mark.requiredLevel;
        const active = p.selectedMark === mark.id;
        return `
                    <button type="button"
                        class="theme-swatch ${active ? "active" : ""} ${unlocked ? "" : "locked"}"
                        data-mark="${mark.id}"
                        ${unlocked ? "" : "disabled"}>
                        ${mark.name}${unlocked ? "" : ` (LV ${mark.requiredLevel})`}
                    </button>`;
    }).join("")}
        </div>

        <div class="setting-section">Danger Zone</div>
        <button type="button" class="danger-button" id="resetAllButton">
            Reset All Progress
        </button>
    `;

    panel.style.display = "block";

    $("settingsClose").onclick = () => {
        panel.style.display = "none";
        play("click");
    };

    $("masterVol").oninput = (e) =>
        updateSettings({ masterVolume: parseFloat(e.target.value) });
    $("sfxVol").oninput = (e) =>
        updateSettings({ sfxVolume: parseFloat(e.target.value) });

    $("soundToggle").onclick = (e) => {
        const next = updateSettings({ soundEnabled: !settings.soundEnabled });
        settings.soundEnabled = next.soundEnabled;
        e.target.className = `toggle-button ${next.soundEnabled ? "on" : ""}`;
        e.target.textContent = next.soundEnabled ? "On" : "Off";
        play("click");
    };

    $("musicToggle").onclick = (e) => {
        const next = updateSettings({ musicEnabled: !settings.musicEnabled });
        settings.musicEnabled = next.musicEnabled;
        e.target.className = `toggle-button ${next.musicEnabled ? "on" : ""}`;
        e.target.textContent = next.musicEnabled ? "On" : "Off";
        if (next.musicEnabled) {
            initAudio();
            startMusic();
        } else {
            stopMusic();
        }
    };

    panel.querySelectorAll("[data-theme]").forEach((button) => {
        button.onclick = () => {
            if (selectTheme(button.dataset.theme)) {
                applyTheme(button.dataset.theme);
                openSettings();
                play("click");
            }
        };
    });

    panel.querySelectorAll("[data-mark]").forEach((button) => {
        button.onclick = () => {
            if (selectMark(button.dataset.mark)) {
                applyMarkStyle(button.dataset.mark);
                openSettings();
                play("click");
            }
        };
    });

    $("resetAllButton").onclick = () => {
        if (!confirm("Reset ALL progress, stats and unlocks? This cannot be undone.")) {
            return;
        }
        resetStats();
        saveJSON("progress", {
            xp: 0,
            level: 1,
            unlockedThemes: ["default"],
            unlockedMarks: ["classic"],
            selectedTheme: "default",
            selectedMark: "classic"
        });
        applyTheme("default");
        applyMarkStyle("classic");
        refreshMenuMeta();
        panel.style.display = "none";
        showToast("Progress reset.");
    };
}

/* ---------------------------------------------------------
   Stats panel
   --------------------------------------------------------- */

export function openStats() {
    play("click");
    const panel = $("statsPanel");
    if (!panel) return;

    const stats = getStats();
    const total = stats.gamesPlayed || 1;
    const winRate = Math.round((stats.wins / total) * 100);

    const achievements = getAchievements();
    const earned = achievements.filter((a) => a.earned);

    panel.innerHTML = `
        <div class="panel-header">
            <h3>Statistics</h3>
            <button type="button" class="panel-close" id="statsClose">✕</button>
        </div>

        <div class="stat-grid">
            <div class="stat-box"><strong>${stats.gamesPlayed}</strong><span>Games</span></div>
            <div class="stat-box"><strong>${stats.wins}</strong><span>Wins</span></div>
            <div class="stat-box"><strong>${stats.losses}</strong><span>Losses</span></div>
            <div class="stat-box"><strong>${stats.draws}</strong><span>Draws</span></div>
            <div class="stat-box"><strong>${winRate}%</strong><span>Win Rate</span></div>
            <div class="stat-box"><strong>${stats.bestStreak}</strong><span>Best Streak</span></div>
        </div>

        <div class="setting-section">By Difficulty</div>
        <div class="stat-grid">
            ${["easy", "medium", "hard", "impossible"].map((diff) => {
        const bucket = stats.perDifficulty[diff] || { w: 0, l: 0, d: 0 };
        const name = diff.charAt(0).toUpperCase() + diff.slice(1);
        return `
                    <div class="stat-box small">
                        <strong>${bucket.w}–${bucket.l}–${bucket.d}</strong>
                        <span>${name}</span>
                    </div>`;
    }).join("")}
        </div>

        <div class="setting-section">
            Achievements (${earned.length}/${achievements.length})
        </div>
        <div class="achievement-list">
            ${achievements.map((a) => `
                <div class="achievement ${a.earned ? "earned" : "locked"}">
                    <span class="achievement-icon">${a.earned ? "🏆" : "🔒"}</span>
                    <div>
                        <strong>${a.name}</strong>
                        <small>${a.description}</small>
                    </div>
                </div>`).join("")}
        </div>

        <div class="setting-section">Recent Games</div>
        <div class="history-list">
            ${stats.history.length === 0
            ? '<small class="muted">No games yet — go play!</small>'
            : stats.history.slice(0, 10).map((h) => `
                    <div class="history-row">
                        <span class="history-result result-${h.result}">
                            ${h.result === "win" ? "WIN" : h.result === "loss" ? "LOSS" : "DRAW"}
                        </span>
                        <span>${getMode(h.mode).name}</span>
                        <small>${h.difficulty || ""}</small>
                    </div>`).join("")}
        </div>
    `;

    panel.style.display = "block";
    $("statsClose").onclick = () => {
        panel.style.display = "none";
        play("click");
    };
}

/* ---------------------------------------------------------
   Init
   --------------------------------------------------------- */

export function initScreens() {
    subscribe((event, data, state) => {
        if (event === "game:over") onGameOver(event, data);
        else if (event === "turn:changed") updateTurnLabels();
        else if (event === "ai:thinking") onAiThinking();
        else if (event === "timer:arm") onTimerArm(event, data);
        else if (event === "timer:expired") onTimerExpired();
        else if (event === "game:start") {
            if (el.statusLabel) {
                el.statusLabel.textContent = "CURRENT TURN";
            }
            updateTurnLabels();
            updateScoreLabels();
        }
    });

    refreshMenuMeta();
}
