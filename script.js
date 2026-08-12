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

const backToModes = document.getElementById("backToModes");

const restartBtn = document.getElementById("restartBtn");
const resetScoreBtn = document.getElementById("resetScoreBtn");
const soundBtn = document.getElementById("soundBtn");
const homeBtn = document.getElementById("homeBtn");

const difficultyBox = document.getElementById("difficultyBox");

// =========================================================
// AUDIO
// =========================================================

const clickSound = document.getElementById("clickSound");
const moveSound = document.getElementById("moveSound");
const winSound = document.getElementById("winSound");
const drawSound = document.getElementById("drawSound");


// =========================================================
// GAME STATE
// =========================================================

let boardState = [
    "", "", "",
    "", "", "",
    "", "", ""
];

let currentPlayer = "X";
let running = false;

let vsComputer = false;
let difficulty = "easy";

let soundEnabled = true;

let aiThinking = false;

let scores = {
    X: 0,
    O: 0,
    Draw: 0
};


// =========================================================
// WIN PATTERNS
// =========================================================

const WIN_PATTERNS = [

    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],

    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],

    [0, 4, 8],
    [2, 4, 6]

];


// =========================================================
// POKI SDK
// =========================================================

const sdk = window.PokiSDK;

async function initSDK() {

    if (!sdk) return;

    try {

        await sdk.init();

        console.log("Poki SDK Ready");

    } catch (error) {

        console.error("Poki SDK initialization failed:", error);

    }
}


function gameLoaded() {

    if (sdk && typeof sdk.gameLoadingFinished === "function") {

        sdk.gameLoadingFinished();

    }

}


function gameplayStart() {

    if (sdk && typeof sdk.gameplayStart === "function") {

        sdk.gameplayStart();

    }

}


function gameplayStop() {

    if (sdk && typeof sdk.gameplayStop === "function") {

        sdk.gameplayStop();

    }

}


async function commercialBreak() {

    if (!sdk || typeof sdk.commercialBreak !== "function") {
        return;
    }

    try {

        await sdk.commercialBreak();

    } catch (error) {

        console.log("Commercial break unavailable:", error);

    }

}


// =========================================================
// LOCAL STORAGE
// =========================================================

function loadScores() {

    const data = localStorage.getItem("tttScores");

    if (data) {

        try {

            const savedScores = JSON.parse(data);

            scores = {
                X: Number(savedScores.X) || 0,
                O: Number(savedScores.O) || 0,
                Draw: Number(savedScores.Draw) || 0
            };

        } catch (error) {

            console.log("Could not load saved scores.");

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


// =========================================================
// LOADING
// =========================================================

window.addEventListener("load", async () => {

    await initSDK();

    loadScores();

    setTimeout(() => {

        loadingScreen.style.display = "none";

        app.style.display = "block";

        gameLoaded();

    }, 1000);

});


// =========================================================
// UI HELPERS
// =========================================================

function showHome() {

    menu.classList.remove("difficulty-open");

    menu.style.display = "flex";

    game.style.display = "none";

    difficultyBox.style.display = "none";

}


function showDifficulty() {

    menu.classList.add("difficulty-open");

    menu.style.display = "flex";

    game.style.display = "none";

    difficultyBox.style.display = "block";

}


function showGame() {

    menu.classList.remove("difficulty-open");

    menu.style.display = "none";

    game.style.display = "block";

}


// =========================================================
// NEW GAME
// =========================================================

function newGame() {

    boardState = [
        "", "", "",
        "", "", "",
        "", "", ""
    ];

    currentPlayer = "X";

    running = true;

    aiThinking = false;

    statusText.textContent = "Player X Turn";

    cells.forEach(cell => {

        cell.innerHTML = "";

        cell.disabled = false;

        cell.classList.remove("winner");
        cell.classList.remove("pop");

    });

}


// =========================================================
// OPEN GAME
// =========================================================

function openGame() {

    showGame();

    gameplayStart();

    newGame();

}


// =========================================================
// LOCAL MULTIPLAYER
// =========================================================

localBtn.addEventListener("click", () => {

    vsComputer = false;

    openGame();

});


// =========================================================
// COMPUTER MENU
// =========================================================

computerBtn.addEventListener("click", () => {

    vsComputer = true;

    showDifficulty();

});


// =========================================================
// BACK TO GAME MODES
// =========================================================

if (backToModes) {

    backToModes.addEventListener("click", () => {

        vsComputer = false;

        showHome();

    });

}


// =========================================================
// DIFFICULTY
// =========================================================

easyBtn.addEventListener("click", () => {

    difficulty = "easy";

    vsComputer = true;

    openGame();

});


mediumBtn.addEventListener("click", () => {

    difficulty = "medium";

    vsComputer = true;

    openGame();

});


hardBtn.addEventListener("click", () => {

    difficulty = "hard";

    vsComputer = true;

    openGame();

});


// =========================================================
// RESTART
// =========================================================

restartBtn.addEventListener("click", () => {

    playSound(clickSound);

    newGame();

});


// =========================================================
// HOME
// =========================================================

homeBtn.addEventListener("click", () => {

    running = false;

    aiThinking = false;

    gameplayStop();

    showHome();

});


// =========================================================
// CELL CLICK
// =========================================================

cells.forEach((cell, index) => {

    cell.addEventListener("click", () => {

        if (!running) return;

        if (aiThinking) return;

        if (boardState[index] !== "") return;

        // In computer mode, only X is controlled by the human.
        if (vsComputer && currentPlayer !== "X") return;


        // Make the player's move.
        const moved = makeMove(index, currentPlayer);

        if (!moved) return;


        // Check whether the move ended the game.
        if (checkWinner()) return;

        if (checkDraw()) return;


        // Computer mode.
        if (vsComputer) {

            switchPlayer();

            aiThinking = true;

            running = false;

            disableBoard();

            setTimeout(() => {

                if (!vsComputer) return;

                if (currentPlayer !== "O") return;

                running = true;

                aiThinking = false;

                enableBoard();

                aiMove();

            }, 450);

            return;
        }


        // Local multiplayer.
        switchPlayer();

    });

});


// =========================================================
// MAKE MOVE
// =========================================================

function makeMove(index, player) {

    if (boardState[index] !== "") {
        return false;
    }


    boardState[index] = player;


    // Clear the cell first.
    cells[index].innerHTML = "";


    // Create CSS X/O mark.
    const mark = document.createElement("span");

    if (player === "X") {

        mark.className = "mark mark-x";

    } else {

        mark.className = "mark mark-o";

    }


    cells[index].appendChild(mark);

    cells[index].classList.add("pop");


    setTimeout(() => {

        cells[index].classList.remove("pop");

    }, 200);


    playSound(moveSound);

    return true;

}


// =========================================================
// CHANGE TURN
// =========================================================

function switchPlayer() {

    currentPlayer =
        currentPlayer === "X"
            ? "O"
            : "X";


    statusText.textContent =
        currentPlayer === "X"
            ? "Player X Turn"
            : "Player O Turn";

}


// =========================================================
// BOARD ENABLE / DISABLE
// =========================================================

function disableBoard() {

    cells.forEach(cell => {

        cell.disabled = true;

    });

}


function enableBoard() {

    cells.forEach((cell, index) => {

        cell.disabled =
            !running ||
            boardState[index] !== "";

    });

}


// =========================================================
// SOUND
// =========================================================

function playSound(sound) {

    if (!soundEnabled) return;

    if (!sound) return;

    try {

        sound.currentTime = 0;

        const promise = sound.play();

        if (promise !== undefined) {

            promise.catch(() => {});

        }

    } catch (error) {

        console.log("Sound playback unavailable.");

    }

}


// =========================================================
// SOUND TOGGLE
// =========================================================

soundBtn.addEventListener("click", () => {

    soundEnabled = !soundEnabled;

    soundBtn.innerHTML =
        soundEnabled
            ? '<span class="sound-symbol">Sound</span>'
            : '<span class="sound-symbol">Muted</span>';

});


// =========================================================
// CHECK WINNER
// =========================================================

function checkWinner() {

    for (const pattern of WIN_PATTERNS) {

        const [a, b, c] = pattern;


        if (
            boardState[a] !== "" &&
            boardState[a] === boardState[b] &&
            boardState[b] === boardState[c]
        ) {

            running = false;

            aiThinking = false;


            cells[a].classList.add("winner");
            cells[b].classList.add("winner");
            cells[c].classList.add("winner");


            disableBoard();


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


// =========================================================
// DRAW
// =========================================================

function checkDraw() {

    if (boardState.includes("")) {
        return false;
    }


    running = false;

    aiThinking = false;


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


// =========================================================
// RESET SCORES
// =========================================================

resetScoreBtn.addEventListener("click", () => {

    scores = {
        X: 0,
        O: 0,
        Draw: 0
    };


    refreshScoreboard();

    saveScores();

    playSound(clickSound);

});


// =========================================================
// COMPUTER AI
// =========================================================

function aiMove() {

    if (!vsComputer) return;

    if (!running) return;

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

        default:
            easyMove();

    }


    // Check result after AI move.

    if (checkWinner()) return;

    if (checkDraw()) return;


    // Return control to X.

    switchPlayer();

    running = true;

    aiThinking = false;

    enableBoard();

}


// =========================================================
// EASY AI
// =========================================================

function easyMove() {

    const empty = [];


    for (let i = 0; i < boardState.length; i++) {

        if (boardState[i] === "") {

            empty.push(i);

        }

    }


    if (empty.length === 0) return;


    const randomMove =
        empty[
            Math.floor(
                Math.random() * empty.length
            )
        ];


    makeMove(randomMove, "O");

}


// =========================================================
// MEDIUM AI
// =========================================================

function mediumMove() {

    // Try to win.

    let move = findWinningMove("O");


    if (move !== -1) {

        makeMove(move, "O");

        return;

    }


    // Block the player.

    move = findWinningMove("X");


    if (move !== -1) {

        makeMove(move, "O");

        return;

    }


    // Take center.

    if (boardState[4] === "") {

        makeMove(4, "O");

        return;

    }


    // Take a corner when possible.

    const corners = [0, 2, 6, 8];

    const availableCorners =
        corners.filter(
            index => boardState[index] === ""
        );


    if (availableCorners.length > 0) {

        const randomCorner =
            availableCorners[
                Math.floor(
                    Math.random() *
                    availableCorners.length
                )
            ];


        makeMove(randomCorner, "O");

        return;

    }


    // Otherwise random.

    easyMove();

}


// =========================================================
// FIND WINNING MOVE
// =========================================================

function findWinningMove(player) {

    for (const pattern of WIN_PATTERNS) {

        const [a, b, c] = pattern;


        const line = [
            boardState[a],
            boardState[b],
            boardState[c]
        ];


        const playerCount =
            line.filter(
                value => value === player
            ).length;


        const emptyCount =
            line.filter(
                value => value === ""
            ).length;


        if (
            playerCount === 2 &&
            emptyCount === 1
        ) {

            if (boardState[a] === "") {
                return a;
            }

            if (boardState[b] === "") {
                return b;
            }

            if (boardState[c] === "") {
                return c;
            }

        }

    }


    return -1;

}


// =========================================================
// HARD AI - MINIMAX
// =========================================================

function hardMove() {

    let bestScore = -Infinity;

    let bestMove = -1;


    for (let i = 0; i < 9; i++) {

        if (boardState[i] !== "") continue;


        boardState[i] = "O";


        const score =
            minimax(
                boardState,
                0,
                false
            );


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


// =========================================================
// MINIMAX
// =========================================================

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


    // AI turn.

    if (isMaximizing) {

        let bestScore = -Infinity;


        for (let i = 0; i < 9; i++) {

            if (board[i] !== "") continue;


            board[i] = "O";


            const score =
                minimax(
                    board,
                    depth + 1,
                    false
                );


            board[i] = "";


            bestScore =
                Math.max(
                    bestScore,
                    score
                );

        }


        return bestScore;

    }


    // Human turn.

    let bestScore = Infinity;


    for (let i = 0; i < 9; i++) {

        if (board[i] !== "") continue;


        board[i] = "X";


        const score =
            minimax(
                board,
                depth + 1,
                true
            );


        board[i] = "";


        bestScore =
            Math.min(
                bestScore,
                score
            );

    }


    return bestScore;

}


// =========================================================
// BOARD EVALUATION
// =========================================================

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


    if (
        board.every(
            cell => cell !== ""
        )
    ) {

        return "draw";

    }


    return null;

}


// =========================================================
// KEYBOARD SHORTCUTS
// =========================================================

document.addEventListener("keydown", event => {

    if (
        event.key === "r" ||
        event.key === "R"
    ) {

        if (
            game.style.display !== "none"
        ) {

            restartBtn.click();

        }

    }


    if (event.key === "Escape") {

        if (
            menu.classList.contains(
                "difficulty-open"
            )
        ) {

            showHome();

        }

    }

});


// =========================================================
// PREVENT TEXT SELECTION
// =========================================================

document.addEventListener(
    "selectstart",
    event => {

        event.preventDefault();

    }
);


// =========================================================
// PREVENT CONTEXT MENU
// =========================================================

document.addEventListener(
    "contextmenu",
    event => {

        event.preventDefault();

    }
);


// =========================================================
// TOUCH HANDLING
// =========================================================

let lastTouch = 0;


document.addEventListener(
    "touchend",
    event => {

        const now = Date.now();


        if (
            now - lastTouch <= 300
        ) {

            event.preventDefault();

        }


        lastTouch = now;

    },
    {
        passive: false
    }
);


// =========================================================
// VISIBILITY / AUDIO
// =========================================================

document.addEventListener(
    "visibilitychange",
    () => {

        if (document.hidden) {

            clickSound.pause();
            moveSound.pause();
            winSound.pause();
            drawSound.pause();

        }

    }
);


// =========================================================
// WINDOW BLUR
// =========================================================

window.addEventListener(
    "blur",
    () => {

        clickSound.pause();
        moveSound.pause();
        winSound.pause();
        drawSound.pause();

    }
);


// =========================================================
// WINDOW FOCUS
// =========================================================

window.addEventListener(
    "focus",
    () => {

        clickSound.currentTime = 0;

    }
);


// =========================================================
// ANIMATION CLEANUP
// =========================================================

cells.forEach(cell => {

    cell.addEventListener(
        "animationend",
        () => {

            cell.classList.remove("pop");

        }
    );

});
