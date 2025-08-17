document.addEventListener('DOMContentLoaded', () => {
    // Game state
    let grid = [];
    let score = 0;
    let bestScore = localStorage.getItem('bestScore') || 0;
    let gameOver = false;
    let gameWon = false;
    let canMove = true;
    
    // DOM elements
    const gridContainer = document.querySelector('.grid');
    const scoreElement = document.getElementById('score');
    const bestScoreElement = document.getElementById('best-score');
    const newGameButton = document.getElementById('new-game');
    const tryAgainButton = document.getElementById('try-again');
    const keepGoingButton = document.getElementById('keep-going');
    const gameOverElement = document.querySelector('.game-over');
    const gameWonElement = document.querySelector('.game-won');
    const creditMessage = document.getElementById('credit-message');
    
    // Audio Context for sound effects
    let audioContext;
    let soundEnabled = true;
    
    // Initialize audio context
    function initAudio() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
            soundEnabled = false;
        }
    }
    
    // Create sound effect using Web Audio API
    function playSound(frequency, duration, type = 'sine', volume = 0.1) {
        if (!soundEnabled || !audioContext) return;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    }
    
    // Sound effect functions
    function playMoveSound() {
        playSound(220, 0.1, 'sine', 0.05);
    }
    
    function playMergeSound(value) {
        if (value === 64) {
            // Special satisfying sound for 64
            playSound(523, 0.4, 'triangle', 0.12);
            setTimeout(() => playSound(659, 0.3, 'sine', 0.1), 100);
            setTimeout(() => playSound(784, 0.2, 'sine', 0.08), 200);
        } else if (value === 2048) {
            // Epic sound for 2048
            playSound(523, 0.6, 'sine', 0.15);
            setTimeout(() => playSound(659, 0.6, 'sine', 0.15), 150);
            setTimeout(() => playSound(784, 0.6, 'sine', 0.15), 300);
            setTimeout(() => playSound(1047, 0.8, 'sine', 0.15), 450);
            setTimeout(() => playSound(1318, 1.0, 'sine', 0.12), 600);
        } else {
            // Regular merge sound
            const baseFreq = 330;
            const freq = baseFreq + (Math.log2(value) * 50);
            playSound(freq, 0.2, 'triangle', 0.08);
        }
    }
    
    function playNewTileSound() {
        playSound(440, 0.15, 'square', 0.03);
    }
    
    function playWinSound() {
        // Play ascending notes
        setTimeout(() => playSound(523, 0.3, 'sine', 0.1), 0);
        setTimeout(() => playSound(659, 0.3, 'sine', 0.1), 100);
        setTimeout(() => playSound(784, 0.3, 'sine', 0.1), 200);
        setTimeout(() => playSound(1047, 0.5, 'sine', 0.1), 300);
    }
    
    function playGameOverSound() {
        // Play descending notes
        setTimeout(() => playSound(330, 0.4, 'sawtooth', 0.08), 0);
        setTimeout(() => playSound(277, 0.4, 'sawtooth', 0.08), 150);
        setTimeout(() => playSound(220, 0.6, 'sawtooth', 0.08), 300);
    }
    
    function playCreditSound() {
        // Play a magical sound for credit message
        playSound(880, 0.3, 'sine', 0.06);
        setTimeout(() => playSound(1108, 0.3, 'sine', 0.06), 100);
        setTimeout(() => playSound(1318, 0.4, 'sine', 0.06), 200);
    }
    
    // Initialize the game
    function initGame() {
        // Reset game state
        grid = Array(4).fill().map(() => Array(4).fill(0));
        score = 0;
        gameOver = false;
        gameWon = false;
        canMove = true;
        
        // Update UI
        updateScore();
        gameOverElement.style.display = 'none';
        gameWonElement.style.display = 'none';
        
        // Clear the grid
        document.querySelectorAll('.tile').forEach(tile => tile.remove());
        
        // Create grid cells
        gridContainer.innerHTML = '';
        for (let i = 0; i < 16; i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            gridContainer.appendChild(cell);
        }
        
        // Add initial tiles
        addRandomTile();
        addRandomTile();
    }
    
    // Add a random tile (2 or 4) to an empty cell
    function addRandomTile() {
        const emptyCells = [];
        
        // Find all empty cells
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (grid[row][col] === 0) {
                    emptyCells.push({ row, col });
                }
            }
        }
        
        if (emptyCells.length > 0) {
            // Pick a random empty cell
            const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            // 90% chance for 2, 10% chance for 4
            grid[row][col] = Math.random() < 0.9 ? 2 : 4;
            createTile(row, col, grid[row][col], true);
            playNewTileSound();
        }
    }
    
    // Create a tile element
    function createTile(row, col, value, isNew = false) {
        const tile = document.createElement('div');
        tile.className = `tile tile-${value} ${isNew ? 'tile-new' : ''}`;
        tile.textContent = value;
        
        // Fixed positioning to match grid cells exactly
        const tilePos = (position) => 15 + position * 115; // 100px tile + 15px gap
        
        tile.style.top = `${tilePos(row)}px`;
        tile.style.left = `${tilePos(col)}px`;
        
        tile.dataset.row = row;
        tile.dataset.col = col;
        tile.dataset.value = value;
        
        document.querySelector('.game-container').appendChild(tile);
        return tile;
    }
    
    // Update all tile positions based on current grid state
    function updateTilePositions() {
        // Remove all existing tiles
        document.querySelectorAll('.tile').forEach(tile => tile.remove());
        
        // Create tiles for current grid state
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (grid[row][col] !== 0) {
                    createTile(row, col, grid[row][col], false);
                }
            }
        }
    }
    
    // Update the score display
    function updateScore() {
        scoreElement.textContent = score;
        bestScore = Math.max(score, bestScore);
        bestScoreElement.textContent = bestScore;
        localStorage.setItem('bestScore', bestScore);
    }
    
    // Move tiles in the specified direction
    async function moveTiles(direction) {
        if (!canMove || gameOver) return false;
        
        const oldGrid = grid.map(row => [...row]);
        let moved = false;
        
        // Create a copy of the grid for processing
        let newGrid = grid.map(row => [...row]);
        
        // Process each line based on direction
        for (let i = 0; i < 4; i++) {
            let line = [];
            
            // Extract the line
            for (let j = 0; j < 4; j++) {
                if (direction === 'left' || direction === 'right') {
                    line.push(newGrid[i][j]);
                } else {
                    line.push(newGrid[j][i]);
                }
            }
            
            // Remove zeros and process the line
            const filteredLine = line.filter(val => val !== 0);
            const processedLine = [];
            let skip = false;
            
            for (let k = 0; k < filteredLine.length; k++) {
                if (skip) {
                    skip = false;
                    continue;
                }
                
                if (k < filteredLine.length - 1 && filteredLine[k] === filteredLine[k + 1]) {
                    // Merge tiles
                    processedLine.push(filteredLine[k] * 2);
                    score += filteredLine[k] * 2;
                    skip = true;
                    playMergeSound(filteredLine[k] * 2);
                } else {
                    processedLine.push(filteredLine[k]);
                }
            }
            
            // Add zeros to fill the line
            while (processedLine.length < 4) {
                if (direction === 'left' || direction === 'up') {
                    processedLine.push(0);
                } else {
                    processedLine.unshift(0);
                }
            }
            
            // Put the processed line back
            for (let j = 0; j < 4; j++) {
                if (direction === 'left' || direction === 'right') {
                    newGrid[i][j] = processedLine[j];
                } else {
                    newGrid[j][i] = processedLine[j];
                }
            }
        }
        
        // Check if anything moved
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (oldGrid[row][col] !== newGrid[row][col]) {
                    moved = true;
                    break;
                }
            }
            if (moved) break;
        }
        
        if (moved) {
            canMove = false;
            updateScore();
            playMoveSound();
            
            // Update the grid
            grid = newGrid;
            
            // Update tile positions with animation
            updateTilePositions();
            
            // Wait for animations to complete (increased from 300ms to 600ms for smoother animation)
            setTimeout(() => {
                addRandomTile();
                canMove = true;
                
                // Check for win condition
                if (!gameWon && grid.some(row => row.includes(2048))) {
                    gameWon = true;
                    gameWonElement.style.display = 'flex';
                    playWinSound();
                }
                
                // Check for game over
                if (!hasAvailableMoves()) {
                    gameOver = true;
                    gameOverElement.style.display = 'flex';
                    playGameOverSound();
                }
            }, 600);
        }
        
        return moved;
    }
    
    
    // Check if there are any available moves left
    function hasAvailableMoves() {
        // Check for empty cells
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (grid[row][col] === 0) {
                    return true;
                }
            }
        }
        
        // Check for possible merges
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const value = grid[row][col];
                
                // Check right neighbor
                if (col < 3 && grid[row][col + 1] === value) {
                    return true;
                }
                
                // Check bottom neighbor
                if (row < 3 && grid[row + 1][col] === value) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // Prevent key repeat
    let keysPressed = new Set();
    
    // Event listeners
    document.addEventListener('keydown', async (e) => {
        if (!canMove || keysPressed.has(e.key)) return;
        
        keysPressed.add(e.key);
        
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                await moveTiles('up');
                break;
            case 'ArrowRight':
                e.preventDefault();
                await moveTiles('right');
                break;
            case 'ArrowDown':
                e.preventDefault();
                await moveTiles('down');
                break;
            case 'ArrowLeft':
                e.preventDefault();
                await moveTiles('left');
                break;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keysPressed.delete(e.key);
    });
    
    // Touch events for mobile
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, false);
    
    document.addEventListener('touchend', async (e) => {
        if (!touchStartX || !touchStartY) return;
        
        touchEndX = e.changedTouches[0].clientX;
        touchEndY = e.changedTouches[0].clientY;
        
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        
        // Determine the direction of the swipe
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            if (deltaX > 0) {
                await moveTiles('right');
            } else {
                await moveTiles('left');
            }
        } else {
            // Vertical swipe
            if (deltaY > 0) {
                await moveTiles('down');
            } else {
                await moveTiles('up');
            }
        }
        
        // Reset touch coordinates
        touchStartX = 0;
        touchStartY = 0;
        touchEndX = 0;
        touchEndY = 0;
    }, false);
    
    document.addEventListener('keyup', (e) => {
        keysPressed.delete(e.key);
    });
    
    // Button event listeners
    newGameButton.addEventListener('click', initGame);
    tryAgainButton.addEventListener('click', initGame);
    keepGoingButton.addEventListener('click', () => {
        gameWonElement.style.display = 'none';
        gameWon = false;
    });
    
    // Show credit message
    function showCreditMessage() {
        creditMessage.classList.add('show');
        setTimeout(() => {
            creditMessage.classList.add('fishing-exit');
            setTimeout(() => {
                creditMessage.classList.remove('show', 'fishing-exit');
            }, 1000); // Wait for fishing animation to complete
        }, 5000); // Show for 5 seconds
        playCreditSound();
    }
    
    // Start the game
    initAudio();
    initGame();
    showCreditMessage();
});
