# 🎮 Tic Tac Toe Arena

A modern and responsive Tic Tac Toe web game built using **HTML, CSS, and JavaScript**.

Tic Tac Toe Arena supports local two-player gameplay and a computer opponent with three difficulty levels, including a **Minimax-based hard AI**.

## 🌐 Live Demo

**Play Now:** https://aljo0123.github.io/TicTacToe-Arena/

---

## ✨ Features

- Local 2 Player Mode
- Play Against Computer
- Easy AI
- Medium AI
- Hard AI powered by Minimax
- Persistent scoreboard using Local Storage
- Sound effects and sound controls
- Responsive design for desktop and mobile
- CSS-rendered X and O game marks
- Win and draw detection
- Winning-cell animations
- Restart Game
- Reset Scores
- Home Menu
- Google Analytics
- Poki SDK integration

---

## 🧠 AI System

The computer opponent has three difficulty levels.

### Easy

The AI selects a random available position.

### Medium

The AI follows a simple decision strategy:

1. Win if possible
2. Block the player's winning move
3. Take the center when available
4. Otherwise make a random move

### Hard

The hard difficulty uses the **Minimax algorithm**.

Minimax evaluates possible future game states and chooses the move that produces the best possible outcome for the computer.

The algorithm recursively evaluates:

- Computer wins
- Player wins
- Draws
- Possible future moves

Because Tic Tac Toe has a relatively small game-state space, the hard AI can search the game tree and play optimally.

---

## 🐛 Development and Bug Fixing

After publishing the game, I received feedback from players reporting an issue with the computer opponent's turn handling.

The reported problem involved the AI placing its move incorrectly after the player's second move.

I reproduced the issue and traced it to the turn-handling logic.

I updated the game so that:

- Local multiplayer correctly alternates between X and O.
- In computer mode, only the human player can make an X move.
- The AI receives the O turn after the human move is completed.
- The board state is checked before a move is made.
- The game correctly stops when a win or draw occurs.

The updated version was then tested and redeployed.

This was an important part of the project because it showed me how player feedback can reveal bugs that may not appear during initial testing.

---

## 🛠️ Technologies Used

- HTML5
- CSS3
- JavaScript (ES6)
- Local Storage API
- Google Analytics
- GitHub Pages
- Poki SDK

---

## 🚀 How to Play

1. Open the game.
2. Choose a game mode.
3. If playing against the computer, select a difficulty level.
4. Place your X or O on an empty cell.
5. Try to align three symbols horizontally, vertically, or diagonally.
6. The first player to complete a line wins.

---

## 📂 Project Structure

```text
TicTacToe-Arena/
│
├── index.html
├── style.css
├── script.js
│
└── assets/
    ├── sounds/
    └── images/
