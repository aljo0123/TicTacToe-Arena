/* =========================================================
   RESULTS COPY — final status text for every ending.
   Pure module: no DOM. Used by screens.js so the status
   line and the result banner can never disagree.
   ========================================================= */

/**
 * Returns the final status-line text for a finished game.
 * @param {object} result — { status, winner, line } from state.js
 * @param {boolean} isAiGame — true when the opponent is the computer
 */
export function finalStatusLabel(result, isAiGame) {
    if (!result) return "";

    if (result.status === "draw") {
        return "Draw!";
    }

    if (result.status === "timeout") {
        // Timeout: the player who failed to move loses the turn.
        if (isAiGame) {
            return result.winner === "X" ? "You Win!" : "AI Wins";
        }
        return `Player ${result.winner} Wins!`;
    }

    if (isAiGame) {
        return result.winner === "X" ? "You Win!" : "AI Wins";
    }
    return `Player ${result.winner} Wins!`;
}

/**
 * Returns { title, sub } for the game-over banner.
 */
export function resultBannerCopy(result, isAiGame) {
    if (!result) return { title: "", sub: "" };

    if (result.status === "draw") {
        return {
            title: "Draw!",
            sub: "Perfectly balanced. Nobody gives ground."
        };
    }

    if (result.status === "timeout") {
        return {
            title: finalStatusLabel(result, isAiGame),
            sub: "The clock ran out."
        };
    }

    if (result.winner === "X") {
        return {
            title: isAiGame ? "You Win!" : "Player X Wins!",
            sub: isAiGame ? "Outplayed the machine." : "X takes the round."
        };
    }

    return {
        title: isAiGame ? "AI Wins" : "Player O Wins!",
        sub: isAiGame ? "The machine holds this round." : "O takes the round."
    };
}
