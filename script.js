const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const restartBtn = document.getElementById('restart');

let board = Array(9).fill(null);
let currentPlayer = 'X';
let gameActive = true;

const winCombos = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

boardEl.addEventListener('click', handleCellClick);
restartBtn.addEventListener('click', startGame);

function startGame() {
    board = Array(9).fill(null);
    currentPlayer = 'X';
    gameActive = true;
    statusEl.textContent = '';
    Array.from(boardEl.children).forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('win');
    });
    if (currentPlayer === 'O') botMove();
}

function handleCellClick(e) {
    const index = e.target.dataset.index;
    if (index === undefined || !gameActive || board[index]) return;

    makeMove(index, currentPlayer);
    if (!checkGameEnd()) {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        botMove();
    }
}

function makeMove(index, player) {
    board[index] = player;
    boardEl.children[index].textContent = player;
}

function checkGameEnd() {
    for (const combo of winCombos) {
        const [a, b, c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            combo.forEach(i => boardEl.children[i].classList.add('win'));
            statusEl.textContent = `${board[a]} wins!`;
            gameActive = false;
            return true;
        }
    }
    if (board.every(cell => cell)) {
        statusEl.textContent = 'Draw!';
        gameActive = false;
        return true;
    }
    return false;
}

function botMove() {
    const best = minimax(board.slice(), 'O');
    makeMove(best.index, 'O');
    if (!checkGameEnd()) currentPlayer = 'X';
}

function minimax(newBoard, player) {
    const avail = newBoard.map((v, i) => v ? null : i).filter(i => i !== null);

    if (winning(newBoard, 'X')) return {score: -10};
    if (winning(newBoard, 'O')) return {score: 10};
    if (avail.length === 0) return {score: 0};

    const moves = [];
    for (const i of avail) {
        const move = {index: i};
        newBoard[i] = player;

        if (player === 'O') {
            const result = minimax(newBoard, 'X');
            move.score = result.score;
        } else {
            const result = minimax(newBoard, 'O');
            move.score = result.score;
        }

        newBoard[i] = null;
        moves.push(move);
    }

    let bestMove;
    if (player === 'O') {
        let bestScore = -Infinity;
        for (const move of moves) {
            if (move.score > bestScore) {
                bestScore = move.score;
                bestMove = move;
            }
        }
    } else {
        let bestScore = Infinity;
        for (const move of moves) {
            if (move.score < bestScore) {
                bestScore = move.score;
                bestMove = move;
            }
        }
    }
    return bestMove;
}

function winning(board, player) {
    return winCombos.some(combo => {
        const [a, b, c] = combo;
        return board[a] === player && board[b] === player && board[c] === player;
    });
}

startGame();
