const app = document.getElementById("app");
const loadingScreen = document.getElementById("loadingScreen");

const menu = document.getElementById("menu");
const game = document.getElementById("game");

const board = document.querySelector(".board");
const cells = [...document.querySelectorAll(".board button")];

const statusText = document.getElementById("status");

const xScoreText = document.getElementById("xScore");
const oScoreText = document.getElementById("oScore");
const drawScoreText = document.getElementById("drawScore");

const localBtn = document.getElementById("localBtn");
const computerBtn = document.getElementById("computerBtn");

const easyBtn = document.getElementById("easyBtn");
const mediumBtn = document.getElementById("mediumBtn");
const hardBtn = document.getElementById("hardBtn");

const restartBtn = document.getElementById("restartBtn");
const resetScoreBtn = document.getElementById("resetScoreBtn");
const soundBtn = document.getElementById("soundBtn");
const homeBtn = document.getElementById("homeBtn");

// -------------------------------
// Audio
// -------------------------------

const clickSound = document.getElementById("clickSound");
const moveSound = document.getElementById("moveSound");
const winSound = document.getElementById("winSound");
const drawSound = document.getElementById("drawSound");

// -------------------------------
// Game State
// -------------------------------

let boardState;
let currentPlayer;
let running;

let vsComputer = false;
let difficulty = "easy";

let soundEnabled = true;

let scores = {
    X: 0,
    O: 0,
    Draw: 0
};

// -------------------------------
// Win Patterns
// -------------------------------

const WIN_PATTERNS = [
    [0,1,2],
    [3,4,5],
    [6,7,8],
    [0,3,6],
    [1,4,7],
    [2,5,8],
    [0,4,8],
    [2,4,6]
];

// -------------------------------
// Poki SDK
// -------------------------------

const sdk = window.PokiSDK;

async function initSDK() {
    if (!sdk) return;

    try {
        await sdk.init();
        console.log("Poki SDK Ready");
    } catch (err) {
        console.error(err);
    }
}

function gameLoaded() {
    if (sdk && sdk.gameLoadingFinished) {
        sdk.gameLoadingFinished();
    }
}

function gameplayStart() {
    if (sdk && sdk.gameplayStart) {
        sdk.gameplayStart();
    }
}

function gameplayStop() {
    if (sdk && sdk.gameplayStop) {
        sdk.gameplayStop();
    }
}

async function commercialBreak() {
    if (!sdk || !sdk.commercialBreak) return;

    try {
        await sdk.commercialBreak();
    } catch (e) {
        console.log(e);
    }
}

// -------------------------------
// Local Storage
// -------------------------------

function loadScores() {
    const data = localStorage.getItem("tttScores");

    if (data) {
        try {
            scores = JSON.parse(data);
        } catch {
            scores = {
                X: 0,
                O: 0,
                Draw: 0
            };
        }
    }

    refreshScoreboard();
}

function saveScores() {
    localStorage.setItem(
        "tttScores",
        JSON.stringify(scores)
    );
}

function refreshScoreboard() {
    xScoreText.textContent = scores.X;
    oScoreText.textContent = scores.O;
    drawScoreText.textContent = scores.Draw;
}

// -------------------------------
// Loading
// -------------------------------

window.addEventListener("load", async () => {
    await initSDK();

    loadScores();

    setTimeout(() => {
        loadingScreen.style.display = "none";
        app.style.display = "block";
        gameLoaded();
    }, 1500);
});

// -------------------------------
// New Game
// -------------------------------

function newGame() {
    boardState = [
        "", "", "",
        "", "", "",
        "", "", ""
    ];

    currentPlayer = "X";
    running = true;

    statusText.textContent = "Player X Turn";

    cells.forEach(cell => {
        cell.innerHTML = "";

        cell.disabled = false;

        cell.classList.remove("winner");
        cell.classList.remove("pop");
    });
}

// -------------------------------
// Open Game Screen
// -------------------------------

function openGame() {
    menu.style.display = "none";
    game.style.display = "block";

    gameplayStart();

    newGame();
}

// -------------------------------
// Menu Buttons
// -------------------------------

localBtn.addEventListener("click", () => {
    vsComputer = false;
    openGame();
});

computerBtn.addEventListener("click", () => {
    vsComputer = true;
});

easyBtn.addEventListener("click", () => {
    difficulty = "easy";
    openGame();
});

mediumBtn.addEventListener("click", () => {
    difficulty = "medium";
    openGame();
});

hardBtn.addEventListener("click", () => {
    difficulty = "hard";
    openGame();
});

// -------------------------------
// Restart
// -------------------------------

restartBtn.addEventListener("click", () => {
    playSound(clickSound);
    newGame();
});

// -------------------------------
// Home
// -------------------------------

homeBtn.addEventListener("click", () => {
    gameplayStop();

    menu.style.display = "block";
    game.style.display = "none";
});

// -------------------------------
// Cell Click
// -------------------------------

cells.forEach((cell, index) => {
    cell.addEventListener("click", () => {
        if (!running) return;
        if (boardState[index] !== "") return;

        // In computer mode, only human player X can click.
        if (vsComputer && currentPlayer !== "X") return;

        // Make the move for the current player.
        makeMove(index, currentPlayer);

        if (checkWinner()) return;
        if (checkDraw()) return;

        if (vsComputer) {
            // X has moved. Give the turn to AI O.
            switchPlayer();
            running = false;

            setTimeout(() => {
                if (!vsComputer || currentPlayer !== "O") return;

                running = true;
                aiMove();
            }, 450);

            return;
        }

        // Local multiplayer: alternate X and O.
        switchPlayer();
    });
});

// -------------------------------
// Make Move
// -------------------------------

function makeMove(index, player) {
    if (boardState[index] !== "") return false;

    boardState[index] = player;

    // Remove any old content.
    cells[index].innerHTML = "";

    // Create a clean CSS-rendered X or O.
    const mark = document.createElement("span");
    mark.className = `mark mark-${player.toLowerCase()}`;

    cells[index].appendChild(mark);

    cells[index].classList.add("pop");

    setTimeout(() => {
        cells[index].classList.remove("pop");
    }, 200);

    playSound(moveSound);

    return true;
}

// -------------------------------
// Change Turn
// -------------------------------

function switchPlayer() {
    currentPlayer =
        currentPlayer === "X" ? "O" : "X";

    statusText.textContent =
        currentPlayer === "X"
            ? "Player X Turn"
            : "Player O Turn";
}

// -------------------------------
// Play Sound
// -------------------------------

function playSound(sound) {
    if (!soundEnabled || !sound) return;

    sound.currentTime = 0;

    const result = sound.play();

    if (result && typeof result.catch === "function") {
        result.catch(() => {});
    }
}

// -------------------------------
// Sound Toggle
// -------------------------------

soundBtn.addEventListener("click", () => {
    soundEnabled = !soundEnabled;

    soundBtn.textContent =
        soundEnabled
            ? "Sound"
            : "Muted";
});

// -------------------------------
// Winner
// -------------------------------

function checkWinner() {
    for (const pattern of WIN_PATTERNS) {
        const [a, b, c] = pattern;

        if (
            boardState[a] !== "" &&
            boardState[a] === boardState[b] &&
            boardState[b] === boardState[c]
        ) {
            running = false;

            cells[a].classList.add("winner");
            cells[b].classList.add("winner");
            cells[c].classList.add("winner");

            const winner = boardState[a];

            statusText.textContent =
                winner === "X"
                    ? "Player X Wins!"
                    : "Player O Wins!";

            scores[winner]++;

            refreshScoreboard();
            saveScores();

            playSound(winSound);

            gameplayStop();

            setTimeout(async () => {
                await commercialBreak();
            }, 1200);

            return true;
        }
    }

    return false;
}

// -------------------------------
// Draw
// -------------------------------

function checkDraw() {
    if (boardState.includes("")) return false;

    running = false;

    scores.Draw++;

    refreshScoreboard();
    saveScores();

    statusText.textContent = "Draw!";

    playSound(drawSound);

    gameplayStop();

    setTimeout(async () => {
        await commercialBreak();
    }, 1200);

    return true;
}

// -------------------------------
// Reset Scores
// -------------------------------

resetScoreBtn.addEventListener("click", () => {
    scores = {
        X: 0,
        O: 0,
        Draw: 0
    };

    refreshScoreboard();
    saveScores();
});

// -------------------------------
// Keyboard Shortcuts
// -------------------------------

document.addEventListener("keydown", (e) => {
    if (e.key === "r" || e.key === "R") {
        restartBtn.click();
    }
});

// -------------------------------
// Prevent Text Selection
// -------------------------------

document.addEventListener("selectstart", (e) => {
    e.preventDefault();
});

// -------------------------------
// Pause Sounds
// -------------------------------

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        clickSound.pause();
        moveSound.pause();
        winSound.pause();
        drawSound.pause();
    }
});

// -------------------------------
// AI Move
// -------------------------------

function aiMove() {
    if (!running) return;
    if (!vsComputer) return;
    if (currentPlayer !== "O") return;

    switch (difficulty) {
        case "easy":
            easyMove();
            break;

        case "medium":
            mediumMove();
            break;

        case "hard":
            hardMove();
            break;
    }

    if (checkWinner()) return;
    if (checkDraw()) return;

    switchPlayer();
    running = true;
}

// -------------------------------
// Easy AI
// -------------------------------

function easyMove() {
    const empty = [];

    for (let i = 0; i < boardState.length; i++) {
        if (boardState[i] === "") {
            empty.push(i);
        }
    }

    if (empty.length === 0) return;

    const randomMove =
        empty[Math.floor(Math.random() * empty.length)];

    makeMove(randomMove, "O");
}

// -------------------------------
// Medium AI
// -------------------------------

function mediumMove() {
    // Win if possible.
    let move = findWinningMove("O");

    if (move !== -1) {
        makeMove(move, "O");
        return;
    }

    // Block player.
    move = findWinningMove("X");

    if (move !== -1) {
        makeMove(move, "O");
        return;
    }

    // Center.
    if (boardState[4] === "") {
        makeMove(4, "O");
        return;
    }

    // Random move.
    easyMove();
}

// -------------------------------
// Find Winning Move
// -------------------------------

function findWinningMove(player) {
    for (const pattern of WIN_PATTERNS) {
        const [a, b, c] = pattern;

        const line = [
            boardState[a],
            boardState[b],
            boardState[c]
        ];

        const playerCount =
            line.filter(v => v === player).length;

        const emptyCount =
            line.filter(v => v === "").length;

        if (playerCount === 2 && emptyCount === 1) {
            if (boardState[a] === "") return a;
            if (boardState[b] === "") return b;
            if (boardState[c] === "") return c;
        }
    }

    return -1;
}

// -------------------------------
// Hard AI
// -------------------------------

function hardMove() {
    let bestScore = -Infinity;
    let bestMove = -1;

    for (let i = 0; i < 9; i++) {
        if (boardState[i] !== "") continue;

        boardState[i] = "O";

        const score =
            minimax(boardState, 0, false);

        boardState[i] = "";

        if (score > bestScore) {
            bestScore = score;
            bestMove = i;
        }
    }

    if (bestMove !== -1) {
        makeMove(bestMove, "O");
    }
}

// -------------------------------
// Minimax
// -------------------------------

function minimax(board, depth, isMaximizing) {
    const result = evaluateBoard(board);

    if (result !== null) {
        switch (result) {
            case "O":
                return 10 - depth;

            case "X":
                return depth - 10;

            case "draw":
                return 0;
        }
    }

    if (isMaximizing) {
        let bestScore = -Infinity;

        for (let i = 0; i < 9; i++) {
            if (board[i] !== "") continue;

            board[i] = "O";

            const score =
                minimax(board, depth + 1, false);

            board[i] = "";

            bestScore =
                Math.max(bestScore, score);
        }

        return bestScore;
    }

    let bestScore = Infinity;

    for (let i = 0; i < 9; i++) {
        if (board[i] !== "") continue;

        board[i] = "X";

        const score =
            minimax(board, depth + 1, true);

        board[i] = "";

        bestScore =
            Math.min(bestScore, score);
    }

    return bestScore;
}

// -------------------------------
// Board Evaluation
// -------------------------------

function evaluateBoard(board) {
    for (const pattern of WIN_PATTERNS) {
        const [a, b, c] = pattern;

        if (
            board[a] !== "" &&
            board[a] === board[b] &&
            board[b] === board[c]
        ) {
            return board[a];
        }
    }

    if (board.every(cell => cell !== "")) {
        return "draw";
    }

    return null;
}

// -------------------------------
// Prevent Double Touch
// -------------------------------

let lastTouch = 0;

document.addEventListener(
    "touchend",
    (e) => {
        const now = Date.now();

        if (now - lastTouch <= 300) {
            e.preventDefault();
        }

        lastTouch = now;
    },
    { passive: false }
);

// -------------------------------
// Disable Right Click
// -------------------------------

document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});

// -------------------------------
// Window Blur
// -------------------------------

window.addEventListener("blur", () => {
    clickSound.pause();
    moveSound.pause();
    winSound.pause();
    drawSound.pause();
});

// -------------------------------
// Window Focus
// -------------------------------

window.addEventListener("focus", () => {
    clickSound.currentTime = 0;
});

// -------------------------------
// Animation Cleanup
// -------------------------------

cells.forEach(cell => {
    cell.addEventListener("animationend", () => {
        cell.classList.remove("pop");
    });
});
