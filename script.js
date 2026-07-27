

// Board
const cells = document.querySelectorAll(".board button");
const board = document.querySelector(".board");

// Status
const statusText = document.getElementById("status");

// Buttons
const restartBtn = document.getElementById("restartBtn");
const resetScoreBtn = document.getElementById("resetScoreBtn");
const homeBtn = document.getElementById("homeBtn");
const soundBtn = document.getElementById("soundBtn");

const localBtn = document.getElementById("localBtn");
const computerBtn = document.getElementById("computerBtn");

const easyBtn = document.getElementById("easyBtn");
const mediumBtn = document.getElementById("mediumBtn");
const hardBtn = document.getElementById("hardBtn");

// Screens
const menu = document.getElementById("menu");
const game = document.getElementById("game");
const loadingScreen = document.getElementById("loadingScreen");

// Score
const xScoreEl = document.getElementById("xScore");
const oScoreEl = document.getElementById("oScore");
const drawScoreEl = document.getElementById("drawScore");

// Audio
const clickSound = document.getElementById("clickSound");
const moveSound = document.getElementById("moveSound");
const winSound = document.getElementById("winSound");
const drawSound = document.getElementById("drawSound");

// ======================================

let boardState = ["","","","","","","","",""];

let currentPlayer = "X";

let running = false;

let vsComputer = false;

let aiLevel = "easy";

let soundEnabled = true;

let scores = {
    X:0,
    O:0,
    Draw:0
};

const winPatterns = [
    [0,1,2],
    [3,4,5],
    [6,7,8],

    [0,3,6],
    [1,4,7],
    [2,5,8],

    [0,4,8],
    [2,4,6]
];

// ======================================
// Loading
// ======================================

window.addEventListener("load",()=>{

    loadScores();

    setTimeout(()=>{

        loadingScreen.style.display="none";

        document.getElementById("app").style.display="block";

    },1500);

});

// ======================================
// Menu
// ======================================

localBtn.onclick=()=>{

    vsComputer=false;

    startGame();

};

computerBtn.onclick=()=>{

    vsComputer=true;

};

easyBtn.onclick=()=>{

    aiLevel="easy";

    startGame();

};

mediumBtn.onclick=()=>{

    aiLevel="medium";

    startGame();

};

hardBtn.onclick=()=>{

    aiLevel="hard";

    startGame();

};

// ======================================
// Start Game
// ======================================

function startGame(){

    menu.style.display="none";

    game.style.display="block";

    running=true;

    currentPlayer="X";

    boardState=["","","","","","","","",""];

    statusText.textContent="❌ Player X Turn";

    cells.forEach(cell=>{

        cell.textContent="";

        cell.disabled=false;

        cell.classList.remove("winner");

    });

}

// ======================================
// Cell Click
// ======================================

cells.forEach((cell,index)=>{

    cell.addEventListener("click",()=>{

        if(!running) return;

        if(boardState[index]!="") return;

        playMove(index,currentPlayer);

        if(checkWinner()) return;

        if(checkDraw()) return;

        switchPlayer();

        if(vsComputer && currentPlayer==="O"){

            setTimeout(aiMove,450);

        }

    });

});

// ======================================
// Play Move
// ======================================

function playMove(index,player){

    boardState[index]=player;

    cells[index].textContent=player==="X"?"❌":"⭕";

    cells[index].classList.add("pop");

    setTimeout(()=>{

        cells[index].classList.remove("pop");

    },250);

    if(soundEnabled){

        moveSound.currentTime=0;

        moveSound.play();

    }

}

// ======================================
// Switch Player
// ======================================

function switchPlayer(){

    currentPlayer=currentPlayer==="X"?"O":"X";

    statusText.textContent=currentPlayer==="X"
        ?"❌ Player X Turn"
        :"⭕ Player O Turn";

}

// ======================================
// Check Winner
// ======================================

function checkWinner(){

    for(const pattern of winPatterns){

        const [a,b,c]=pattern;

        if(
            boardState[a] &&
            boardState[a]===boardState[b] &&
            boardState[b]===boardState[c]
        ){

            running=false;

            cells[a].classList.add("winner");
            cells[b].classList.add("winner");
            cells[c].classList.add("winner");

            statusText.textContent=
            (boardState[a]==="X"?"❌":"⭕")+" Wins!";

            scores[boardState[a]]++;

            updateScores();

            if(soundEnabled){

                winSound.currentTime=0;

                winSound.play();

            }

            return true;

        }

    }

    return false;

}

// ======================================
// Draw
// ======================================

function checkDraw(){

    if(boardState.includes("")) return false;

    running=false;

    scores.Draw++;

    updateScores();

    statusText.textContent="🤝 Draw!";

    if(soundEnabled){

        drawSound.currentTime=0;

        drawSound.play();

    }

    return true;

}


function aiMove() {
    if (!running) return;

    switch (aiLevel) {
        case "easy":
            easyMove();
            break;

        case "medium":
            mediumMove();
            break;

        case "hard":
            hardMove(); // Implemented in Part 3
            return;
    }

    if (checkWinner()) return;
    if (checkDraw()) return;

    switchPlayer();
}

// ---------- Easy AI ----------

function easyMove() {

    const empty = [];

    boardState.forEach((cell, i) => {
        if (cell === "") empty.push(i);
    });

    if (empty.length === 0) return;

    const move = empty[Math.floor(Math.random() * empty.length)];

    playMove(move, "O");
}

// ---------- Medium AI ----------

function mediumMove() {

    // Try to win
    for (let i = 0; i < boardState.length; i++) {

        if (boardState[i] !== "") continue;

        boardState[i] = "O";

        if (hasWinner("O")) {
            boardState[i] = "";
            playMove(i, "O");
            return;
        }

        boardState[i] = "";
    }

    // Block player
    for (let i = 0; i < boardState.length; i++) {

        if (boardState[i] !== "") continue;

        boardState[i] = "X";

        if (hasWinner("X")) {
            boardState[i] = "";
            playMove(i, "O");
            return;
        }

        boardState[i] = "";
    }

    // Otherwise random
    easyMove();
}

// ---------- Helper ----------

function hasWinner(player) {

    return winPatterns.some(pattern => {

        return pattern.every(index => boardState[index] === player);

    });

}

// ======================================
// Restart Game
// ======================================

restartBtn.addEventListener("click", () => {

    if (soundEnabled) {
        clickSound.currentTime = 0;
        clickSound.play();
    }

    boardState = ["","","","","","","","",""];

    currentPlayer = "X";

    running = true;

    statusText.textContent = "❌ Player X Turn";

    cells.forEach(cell => {

        cell.textContent = "";

        cell.disabled = false;

        cell.classList.remove("winner");

    });

});

// ======================================
// Home
// ======================================

homeBtn.addEventListener("click", () => {

    menu.style.display = "block";

    game.style.display = "none";

    running = false;

});

// ======================================
// Reset Scores
// ======================================

resetScoreBtn.addEventListener("click", () => {

    scores = {
        X: 0,
        O: 0,
        Draw: 0
    };

    updateScores();

});

// ======================================
// Sound
// ======================================

soundBtn.addEventListener("click", () => {

    soundEnabled = !soundEnabled;

    soundBtn.textContent =
        soundEnabled ? "🔊 Sound" : "🔇 Sound";

});

// ======================================
// Score Functions
// ======================================

function updateScores() {

    xScoreEl.textContent = scores.X;

    oScoreEl.textContent = scores.O;

    drawScoreEl.textContent = scores.Draw;

    localStorage.setItem(
        "tictactoe_scores",
        JSON.stringify(scores)
    );

}

function loadScores() {

    const saved = localStorage.getItem("tictactoe_scores");

    if (!saved) {

        updateScores();

        return;

    }

    scores = JSON.parse(saved);

    updateScores();

}


function hardMove() {

    let bestScore = -Infinity;
    let bestMove = -1;

    for (let i = 0; i < 9; i++) {

        if (boardState[i] !== "") continue;

        boardState[i] = "O";

        let score = minimax(boardState, 0, false);

        boardState[i] = "";

        if (score > bestScore) {
            bestScore = score;
            bestMove = i;
        }

    }

    if (bestMove !== -1) {
        playMove(bestMove, "O");
    }

}

// ======================================
// MINIMAX
// ======================================

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

            const score = minimax(board, depth + 1, false);

            board[i] = "";

            bestScore = Math.max(bestScore, score);

        }

        return bestScore;

    } else {

        let bestScore = Infinity;

        for (let i = 0; i < 9; i++) {

            if (board[i] !== "") continue;

            board[i] = "X";

            const score = minimax(board, depth + 1, true);

            board[i] = "";

            bestScore = Math.min(bestScore, score);

        }

        return bestScore;

    }

}

// ======================================
// BOARD EVALUATION
// ======================================

function evaluateBoard(board) {

    for (const pattern of winPatterns) {

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


// ---------- Poki SDK ----------

const poki = window.PokiSDK;

async function initPoki() {

    if (!poki) return;

    try {

        await poki.init();

        console.log("Poki SDK initialized.");

    } catch (err) {

        console.log("Poki SDK failed:", err);

    }

}

initPoki();

function gameplayStart() {

    if (poki && poki.gameplayStart) {

        poki.gameplayStart();

    }

}

function gameplayStop() {

    if (poki && poki.gameplayStop) {

        poki.gameplayStop();

    }

}

// ---------- Start gameplay ----------

const originalStartGame = startGame;

startGame = function () {

    originalStartGame();

    gameplayStart();

};

// ---------- End gameplay ----------

const originalWinner = checkWinner;

checkWinner = function () {

    const won = originalWinner();

    if (won) {

        gameplayStop();

        setTimeout(showCommercialBreak, 1500);

    }

    return won;

};

const originalDraw = checkDraw;

checkDraw = function () {

    const draw = originalDraw();

    if (draw) {

        gameplayStop();

        setTimeout(showCommercialBreak, 1500);

    }

    return draw;

};

// ---------- Commercial Break ----------

async function showCommercialBreak() {

    if (!poki || !poki.commercialBreak) return;

    try {

        await poki.commercialBreak();

    } catch (e) {

        console.log(e);

    }

}

// ---------- Keyboard Support ----------

document.addEventListener("keydown", e => {

    if (e.key.toLowerCase() === "r") {

        restartBtn.click();

    }

});

// ---------- Disable text selection ----------

document.addEventListener("selectstart", e => {

    e.preventDefault();

});

// ---------- Prevent double tap zoom ----------

let lastTouch = 0;

document.addEventListener("touchend", function (e) {

    const now = Date.now();

    if (now - lastTouch <= 300) {

        e.preventDefault();

    }

    lastTouch = now;

}, { passive: false });

// ---------- Visibility ----------

document.addEventListener("visibilitychange", () => {

    if (document.hidden) {

        moveSound.pause();

        winSound.pause();

        drawSound.pause();

    }

});

// ---------- Console ----------

console.log("🎮 Tic Tac Toe Arena Ready!");
