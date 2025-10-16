const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const restartBtn = document.getElementById('restart');
const scoreXEl = document.getElementById('score-x');
const scoreOEl = document.getElementById('score-o');
const scoreDrawEl = document.getElementById('score-draw');

const WIN_COMBOS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

const MARKS = {
    X: '✕',
    O: '◯'
};

const THINKING_DELAY = 420;

let board = Array(9).fill(null);
let currentPlayer = 'X';
let gameActive = true;
let isThinking = false;
let aiTimeout = null;

const scores = {
    X: 0,
    O: 0,
    draw: 0
};

boardEl.addEventListener('click', handleCellClick);
restartBtn.addEventListener('click', startGame);

function startGame() {
    board = Array(9).fill(null);
    currentPlayer = 'X';
    gameActive = true;
    isThinking = false;
    if (aiTimeout) {
        clearTimeout(aiTimeout);
        aiTimeout = null;
    }

    Array.from(boardEl.children).forEach((cell, index) => {
        cell.textContent = '';
        cell.classList.remove('win', 'filled', 'player-X', 'player-O');
        updateCellLabel(cell, null, index);
    });

    updateStatusForTurn('X');
}

function handleCellClick(event) {
    const target = event.target.closest('.cell');
    if (!target) return;

    const index = Number(target.dataset.index);
    if (!gameActive || isThinking || board[index]) return;

    makeMove(index, currentPlayer);
    if (!checkGameEnd()) {
        currentPlayer = 'O';
        isThinking = true;
        updateStatusForTurn('O');
        aiTimeout = setTimeout(() => {
            aiTimeout = null;
            if (gameActive) {
                botMove();
            }
        }, THINKING_DELAY);
    }
}

function makeMove(index, player) {
    board[index] = player;
    const cell = boardEl.children[index];
    cell.textContent = MARKS[player];
    cell.classList.add('filled', `player-${player}`);
    updateCellLabel(cell, player, index);
}

function checkGameEnd() {
    for (const combo of WIN_COMBOS) {
        const [a, b, c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            combo.forEach(i => boardEl.children[i].classList.add('win'));
            const winner = board[a];
            scores[winner] += 1;
            updateScoreboard();
            statusEl.textContent = `${MARKS[winner]} победили!`;
            gameActive = false;
            isThinking = false;
            return true;
        }
    }

    if (board.every(cell => cell)) {
        scores.draw += 1;
        updateScoreboard();
        statusEl.textContent = 'Ничья!';
        gameActive = false;
        isThinking = false;
        return true;
    }

    return false;
}

function botMove() {
    const bestMove = minimax(board.slice(), 'O');
    makeMove(bestMove.index, 'O');
    if (!checkGameEnd()) {
        currentPlayer = 'X';
        isThinking = false;
        updateStatusForTurn('X');
    }
}

function minimax(newBoard, player) {
    const available = newBoard.reduce((acc, value, idx) => {
        if (!value) acc.push(idx);
        return acc;
    }, []);

    if (winning(newBoard, 'X')) return { score: -10 };
    if (winning(newBoard, 'O')) return { score: 10 };
    if (available.length === 0) return { score: 0 };

    const moves = [];

    for (const idx of available) {
        const move = { index: idx };
        newBoard[idx] = player;

        if (player === 'O') {
            move.score = minimax(newBoard, 'X').score;
        } else {
            move.score = minimax(newBoard, 'O').score;
        }

        newBoard[idx] = null;
        moves.push(move);
    }

    if (player === 'O') {
        let bestScore = -Infinity;
        let bestMove = moves[0];
        for (const move of moves) {
            if (move.score > bestScore) {
                bestScore = move.score;
                bestMove = move;
            }
        }
        return bestMove;
    }

    let bestScore = Infinity;
    let bestMove = moves[0];
    for (const move of moves) {
        if (move.score < bestScore) {
            bestScore = move.score;
            bestMove = move;
        }
    }
    return bestMove;
}

function winning(boardState, player) {
    return WIN_COMBOS.some(combo => {
        const [a, b, c] = combo;
        return boardState[a] === player && boardState[b] === player && boardState[c] === player;
    });
}

function updateScoreboard() {
    scoreXEl.textContent = scores.X;
    scoreOEl.textContent = scores.O;
    scoreDrawEl.textContent = scores.draw;
}

function updateCellLabel(cell, player, index) {
    if (player) {
        const mark = player === 'X' ? 'крестик' : 'нолик';
        cell.setAttribute('aria-label', `Клетка ${index + 1}: ${mark}`);
    } else {
        cell.setAttribute('aria-label', `Пустая клетка ${index + 1}`);
    }
}

function updateStatusForTurn(player) {
    statusEl.textContent = player === 'X' ? 'Ваш ход: ✕' : 'Ходит ИИ…';
}

updateScoreboard();
startGame();
