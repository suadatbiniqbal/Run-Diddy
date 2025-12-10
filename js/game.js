/**

 * With IP-based geolocation and fixed Justin music pause
 */

// Game Configuration
const config = {
    canvas: null,
    ctx: null,
    gridCanvas: null,
    gridCtx: null,
    width: 0,
    height: 0,
    thiefSpeed: 10,
    itemSpeed: 2.5,
    itemSpawnRate: 0.015,
    copSpawnRate: 0.006,
    justinSpawnRate: 0.003,
    thiefSize: 100,
    itemSize: 80,
    copSize: 90,
    justinSize: 85,
    gridSize: 50
};

// Game State
const gameState = {
    isRunning: false,
    isPaused: false,
    score: 0,
    justinCatches: 0,
    highScore: 0,
    totalJustinCatches: 0,
    username: '',
    location: '',
    latitude: null,
    longitude: null,
    keys: {},
    thief: null,
    fallingObjects: [],
    animationId: null,
    imagesLoaded: 0,
    totalImages: 6,
    justinSpawned: false,
    justinSpawnCooldown: 0,
    difficultyIncreased: false,
    audioContext: null,
    gainNode: null,
    locationFetched: false
};

// Asset Storage
const assets = {
    images: {},
    sounds: {}
};

// Item Types
const itemTypes = [
    { name: 'fried_chicken', points: 10 },
    { name: 'watermelon', points: 15 },
    { name: 'cotton', points: 5 }
];

/**
 * Initialize game
 */
window.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    initAudioBoost();
    loadAssets();
    loadLocalProgress();
    fetchUserLocationFromIP();
    setupEventListeners();
});

/**
 * Fetch user location from IP address (no permission needed)
 */
function fetchUserLocationFromIP() {
    const locationStatus = document.getElementById('location-status');
    locationStatus.textContent = 'Fetching location...';
    
    // Use ip-api.com free service (no API key needed)
    fetch('http://ip-api.com/json/')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                gameState.latitude = data.lat;
                gameState.longitude = data.lon;
                gameState.location = `${data.city}, ${data.country}`;
                locationStatus.textContent = `Location: ${gameState.location}`;
                gameState.locationFetched = true;
                checkCanStartGame();
                console.log('Location fetched from IP:', gameState.location);
            } else {
                throw new Error('Location fetch failed');
            }
        })
        .catch(error => {
            console.error('IP location error:', error);
            // Fallback to ipapi.co
            fetch('https://ipapi.co/json/')
                .then(response => response.json())
                .then(data => {
                    gameState.latitude = data.latitude;
                    gameState.longitude = data.longitude;
                    gameState.location = `${data.city}, ${data.country_name}`;
                    locationStatus.textContent = `Location: ${gameState.location}`;
                    gameState.locationFetched = true;
                    checkCanStartGame();
                    console.log('Location fetched from backup IP service:', gameState.location);
                })
                .catch(() => {
                    gameState.location = 'Unknown';
                    locationStatus.textContent = 'Location: Unknown';
                    gameState.locationFetched = true;
                    checkCanStartGame();
                    console.log('Location fetch failed, using Unknown');
                });
        });
}

/**
 * Check if game can start (username + location required)
 */
function checkCanStartGame() {
    const usernameInput = document.getElementById('username-input-start');
    const startBtn = document.getElementById('start-btn');
    const usernameStatus = document.getElementById('username-status');
    
    const username = usernameInput.value.trim();
    
    if (username.length >= 3 && gameState.locationFetched) {
        startBtn.disabled = false;
        startBtn.classList.add('ready');
        usernameStatus.textContent = '✓';
        usernameStatus.className = 'input-status valid';
    } else {
        startBtn.disabled = true;
        startBtn.classList.remove('ready');
        if (username.length > 0 && username.length < 3) {
            usernameStatus.textContent = '✗ Min 3 chars';
            usernameStatus.className = 'input-status invalid';
        } else {
            usernameStatus.textContent = '';
            usernameStatus.className = 'input-status';
        }
    }
}

/**
 * Load progress from localStorage
 */
function loadLocalProgress() {
    gameState.highScore = parseInt(localStorage.getItem('thev_highscore') || '0');
    gameState.totalJustinCatches = parseInt(localStorage.getItem('thev_total_justin') || '0');
    gameState.username = localStorage.getItem('thev_username') || '';
    
    if (gameState.username) {
        document.getElementById('username-input-start').value = gameState.username;
    }
    
    updateHighScore();
}

/**
 * Save progress to localStorage
 */
function saveLocalProgress() {
    localStorage.setItem('thev_highscore', gameState.highScore);
    localStorage.setItem('thev_total_justin', gameState.totalJustinCatches);
    if (gameState.username) {
        localStorage.setItem('thev_username', gameState.username);
    }
}

/**
 * Initialize fullscreen canvas with grid
 */
function initCanvas() {
    config.canvas = document.getElementById('game-canvas');
    config.ctx = config.canvas.getContext('2d');
    
    config.gridCanvas = document.getElementById('grid-canvas');
    config.gridCtx = config.gridCanvas.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

/**
 * Resize canvas to fullscreen and redraw grid
 */
function resizeCanvas() {
    config.width = window.innerWidth;
    config.height = window.innerHeight;
    
    config.canvas.width = config.width;
    config.canvas.height = config.height;
    
    config.gridCanvas.width = config.width;
    config.gridCanvas.height = config.height;
    
    drawGrid();
    
    if (gameState.thief) {
        gameState.thief.y = config.height - config.thiefSize - 20;
    }
}

/**
 * Draw grid background
 */
function drawGrid() {
    config.gridCtx.clearRect(0, 0, config.width, config.height);
    config.gridCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    config.gridCtx.lineWidth = 1;
    
    for (let x = 0; x <= config.width; x += config.gridSize) {
        config.gridCtx.beginPath();
        config.gridCtx.moveTo(x, 0);
        config.gridCtx.lineTo(x, config.height);
        config.gridCtx.stroke();
    }
    
    for (let y = 0; y <= config.height; y += config.gridSize) {
        config.gridCtx.beginPath();
        config.gridCtx.moveTo(0, y);
        config.gridCtx.lineTo(config.width, y);
        config.gridCtx.stroke();
    }
}

/**
 * Initialize Web Audio API for volume boost
 */
function initAudioBoost() {
    try {
        gameState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        gameState.gainNode = gameState.audioContext.createGain();
        gameState.gainNode.connect(gameState.audioContext.destination);
    } catch (e) {
        console.warn('Web Audio API not supported');
    }
}

/**
 * Boost audio volume
 */
function boostVolume(audioElement, multiplier) {
    if (!gameState.audioContext || !gameState.gainNode) return;
    
    try {
        const source = gameState.audioContext.createMediaElementSource(audioElement);
        source.connect(gameState.gainNode);
        gameState.gainNode.gain.value = multiplier;
    } catch (e) {
        console.log('Audio boost failed');
    }
}

/**
 * Load all game assets
 */
function loadAssets() {
    const imageNames = ['thief', 'fried_chicken', 'watermelon', 'cotton', 'cop', 'justin'];
    
    imageNames.forEach(name => {
        const img = new Image();
        img.src = `assets/${name}.png`;
        img.onload = () => {
            gameState.imagesLoaded++;
            checkAssetsLoaded();
        };
        img.onerror = () => {
            console.warn(`Failed to load: ${name}.png`);
            gameState.imagesLoaded++;
            checkAssetsLoaded();
        };
        assets.images[name] = img;
    });
    
    assets.sounds.background = document.getElementById('background-music');
    assets.sounds.collect = document.getElementById('collect-sound');
    assets.sounds.caught = document.getElementById('caught-sound');
    assets.sounds.justin = document.getElementById('justin-sound');
}

function checkAssetsLoaded() {
    if (gameState.imagesLoaded === gameState.totalImages) {
        console.log('Assets loaded');
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    document.getElementById('username-input-start').addEventListener('input', checkCanStartGame);
    
    document.addEventListener('keydown', (e) => {
        gameState.keys[e.key.toLowerCase()] = true;
        if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(e.key.toLowerCase())) {
            e.preventDefault();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        gameState.keys[e.key.toLowerCase()] = false;
    });
    
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('unmute-btn').addEventListener('click', enableSound);
    document.getElementById('continue-btn').addEventListener('click', continueGame);
}

function enableSound() {
    assets.sounds.background.play().catch(err => console.log('Autoplay prevented'));
    document.getElementById('unmute-btn').style.display = 'none';
}

/**
 * Start the game
 */
function startGame() {
    const username = document.getElementById('username-input-start').value.trim();
    
    if (!username || username.length < 3) {
        alert('Please enter a username (min 3 characters)');
        return;
    }
    
    if (!gameState.locationFetched) {
        alert('Please wait for location to be fetched');
        return;
    }
    
    gameState.username = username;
    saveLocalProgress();
    
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('score-display').style.display = 'flex';
    
    gameState.isRunning = true;
    gameState.isPaused = false;
    gameState.score = 0;
    gameState.justinCatches = 0;
    gameState.fallingObjects = [];
    gameState.justinSpawned = false;
    gameState.justinSpawnCooldown = 0;
    gameState.difficultyIncreased = false;
    updateScore();
    updateJustinCount();
    updateHighScore();
    
    gameState.thief = {
        x: config.width / 2 - config.thiefSize / 2,
        y: config.height - config.thiefSize - 20,
        width: config.thiefSize,
        height: config.thiefSize,
        speed: config.thiefSpeed
    };
    
    assets.sounds.background.play().catch(err => console.log('Audio error'));
    gameLoop();
}

/**
 * Main game loop
 */
function gameLoop() {
    if (!gameState.isRunning) return;
    if (gameState.isPaused) {
        gameState.animationId = requestAnimationFrame(gameLoop);
        return;
    }
    
    config.ctx.clearRect(0, 0, config.width, config.height);
    
    updateThief();
    spawnObjects();
    updateFallingObjects();
    drawThief();
    drawFallingObjects();
    checkCollisions();
    
    if (gameState.justinSpawnCooldown > 0) {
        gameState.justinSpawnCooldown--;
    }
    
    gameState.animationId = requestAnimationFrame(gameLoop);
}

/**
 * Update thief position
 */
function updateThief() {
    const thief = gameState.thief;
    
    if (gameState.keys['arrowleft'] || gameState.keys['a']) {
        thief.x -= thief.speed;
    }
    if (gameState.keys['arrowright'] || gameState.keys['d']) {
        thief.x += thief.speed;
    }
    
    if (thief.x < 0) thief.x = 0;
    if (thief.x + thief.width > config.width) {
        thief.x = config.width - thief.width;
    }
}

/**
 * Spawn objects
 */
function spawnObjects() {
    if (Math.random() < config.itemSpawnRate) {
        const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
        gameState.fallingObjects.push({
            type: 'item',
            itemType: itemType.name,
            points: itemType.points,
            x: Math.random() * (config.width - config.itemSize),
            y: -config.itemSize,
            width: config.itemSize,
            height: config.itemSize,
            speed: config.itemSpeed + Math.random() * 1
        });
    }
    
    if (Math.random() < config.copSpawnRate) {
        gameState.fallingObjects.push({
            type: 'cop',
            x: Math.random() * (config.width - config.copSize),
            y: -config.copSize,
            width: config.copSize,
            height: config.copSize,
            speed: config.itemSpeed + Math.random() * 1.5
        });
    }
    
    let justinSpeed, justinZigzagSpeed;
    if (gameState.score >= 30) {
        if (!gameState.difficultyIncreased) {
            gameState.difficultyIncreased = true;
        }
        justinSpeed = config.itemSpeed + 1;
        justinZigzagSpeed = 0.8;
    } else {
        justinSpeed = config.itemSpeed + 3.5;
        justinZigzagSpeed = 2.5;
    }
    
    if (!gameState.justinSpawned && gameState.justinSpawnCooldown === 0 && 
        Math.random() < config.justinSpawnRate) {
        gameState.justinSpawned = true;
        gameState.fallingObjects.push({
            type: 'justin',
            x: Math.random() * (config.width - config.justinSize),
            y: -config.justinSize,
            width: config.justinSize,
            height: config.justinSize,
            speed: justinSpeed,
            points: 1000,
            zigzag: true,
            zigzagSpeed: justinZigzagSpeed,
            zigzagDirection: Math.random() > 0.5 ? 1 : -1
        });
    }
}

/**
 * Update falling objects
 */
function updateFallingObjects() {
    gameState.fallingObjects.forEach(obj => {
        obj.y += obj.speed;
        
        if (obj.type === 'justin' && obj.zigzag) {
            obj.x += obj.zigzagSpeed * obj.zigzagDirection;
            if (obj.x <= 0 || obj.x + obj.width >= config.width) {
                obj.zigzagDirection *= -1;
            }
        }
    });
    
    gameState.fallingObjects = gameState.fallingObjects.filter(obj => {
        if (obj.y >= config.height) {
            if (obj.type === 'justin') {
                gameState.justinSpawned = false;
                gameState.justinSpawnCooldown = 600;
            }
            return false;
        }
        return true;
    });
}

/**
 * Draw thief
 */
function drawThief() {
    const thief = gameState.thief;
    const img = assets.images.thief;
    
    if (img.complete && img.naturalHeight !== 0) {
        config.ctx.drawImage(img, thief.x, thief.y, thief.width, thief.height);
    } else {
        config.ctx.fillStyle = '#fff';
        config.ctx.fillRect(thief.x, thief.y, thief.width, thief.height);
    }
}

/**
 * Draw falling objects
 */
function drawFallingObjects() {
    gameState.fallingObjects.forEach(obj => {
        let img;
        
        if (obj.type === 'item') {
            img = assets.images[obj.itemType];
        } else if (obj.type === 'cop') {
            img = assets.images.cop;
        } else if (obj.type === 'justin') {
            img = assets.images.justin;
        }
        
        if (img && img.complete && img.naturalHeight !== 0) {
            config.ctx.drawImage(img, obj.x, obj.y, obj.width, obj.height);
        } else {
            config.ctx.fillStyle = obj.type === 'cop' ? '#888' : obj.type === 'justin' ? '#fff' : '#aaa';
            config.ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        }
    });
}

/**
 * Check collisions
 */
function checkCollisions() {
    const thief = gameState.thief;
    
    for (let i = gameState.fallingObjects.length - 1; i >= 0; i--) {
        const obj = gameState.fallingObjects[i];
        
        if (thief.x < obj.x + obj.width &&
            thief.x + thief.width > obj.x &&
            thief.y < obj.y + obj.height &&
            thief.y + thief.height > obj.y) {
            
            if (obj.type === 'item') {
                handleItemCatch(obj, i);
            } else if (obj.type === 'justin') {
                handleJustinCatch(obj, i);
            } else if (obj.type === 'cop') {
                handleGameOver();
                return;
            }
        }
    }
}

/**
 * Handle item catch
 */
function handleItemCatch(item, index) {
    gameState.score += item.points;
    updateScore();
    
    assets.sounds.collect.currentTime = 0;
    assets.sounds.collect.play().catch(err => console.log('Sound error'));
    
    gameState.fallingObjects.splice(index, 1);
}

/**
 * Handle Justin catch - NO LEADERBOARD UPDATE, PAUSE JUSTIN MUSIC ON CONTINUE
 */
function handleJustinCatch(justin, index) {
    gameState.score += justin.points;
    gameState.justinCatches++;
    gameState.totalJustinCatches++;
    updateScore();
    updateJustinCount();
    
    // Save to local storage only
    saveLocalProgress();
    
    gameState.fallingObjects.splice(index, 1);
    gameState.justinSpawned = false;
    gameState.justinSpawnCooldown = 1200;
    
    gameState.isPaused = true;
    
    assets.sounds.background.pause();
    assets.sounds.justin.volume = 1.0;
    boostVolume(assets.sounds.justin, 20);
    assets.sounds.justin.currentTime = 0;
    assets.sounds.justin.play().catch(err => console.log('Justin sound error'));
    
    // Show user info on elite screen
    document.getElementById('elite-username').textContent = `Player: ${gameState.username}`;
    document.getElementById('elite-location').textContent = `Location: ${gameState.location}`;
    
    showInsaneEliteEffect();
    
    console.log('JUSTIN CAUGHT - Game continues, NO leaderboard update yet');
}

/**
 * Show insane elite effect
 */
function showInsaneEliteEffect() {
    const overlay = document.getElementById('elite-overlay');
    overlay.classList.remove('hidden');
    
    let flashCount = 0;
    const flashInterval = setInterval(() => {
        config.canvas.style.background = flashCount % 2 === 0 ? '#fff' : '#000';
        flashCount++;
        if (flashCount >= 8) {
            clearInterval(flashInterval);
            config.canvas.style.background = '#000';
        }
    }, 100);
    
    createExplosionParticles();
}

/**
 * Create explosion particles
 */
function createExplosionParticles() {
    const container = document.querySelector('.elite-particles');
    container.innerHTML = '';
    
    for (let i = 0; i < 150; i++) {
        const particle = document.createElement('div');
        const size = Math.random() * 20 + 5;
        const angle = (Math.PI * 2 * i) / 150;
        const velocity = 200 + Math.random() * 300;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;
        
        particle.style.position = 'absolute';
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.borderRadius = '50%';
        particle.style.background = '#fff';
        particle.style.left = '50%';
        particle.style.top = '50%';
        particle.style.boxShadow = '0 0 20px #fff';
        particle.style.animation = `explode 3s ease-out forwards`;
        particle.style.setProperty('--vx', vx + 'px');
        particle.style.setProperty('--vy', vy + 'px');
        
        container.appendChild(particle);
    }
    
    if (!document.getElementById('explode-style')) {
        const style = document.createElement('style');
        style.id = 'explode-style';
        style.textContent = `
            @keyframes explode {
                0% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 1;
                }
                100% {
                    transform: translate(calc(-50% + var(--vx)), calc(-50% + var(--vy))) scale(1);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Continue game after elite screen - PAUSE JUSTIN MUSIC & RESUME BACKGROUND
 */
function continueGame() {
    const overlay = document.getElementById('elite-overlay');
    overlay.classList.add('hidden');
    
    document.querySelector('.elite-particles').innerHTML = '';
    
    // PAUSE JUSTIN MUSIC (FIX)
    assets.sounds.justin.pause();
    assets.sounds.justin.currentTime = 0;
    
    // Resume game and background music
    gameState.isPaused = false;
    assets.sounds.background.play();
    
    console.log('Game resumed - Justin music paused, background music playing');
}

/**
 * Save to Firebase with location - ONLY CALLED ON GAME OVER
 */
function saveToFirebase() {
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();
    
    // Save to Firestore
    db.collection('leaderboard').add({
        username: gameState.username,
        score: gameState.score,
        justinCatches: gameState.justinCatches,
        location: gameState.location,
        latitude: gameState.latitude,
        longitude: gameState.longitude,
        timestamp: timestamp
    })
    .then(() => {
        console.log('Final score saved to Firestore');
    })
    .catch((error) => {
        console.error('Error saving to Firestore:', error);
    });
    
    // Save to RTDB
    const userKey = gameState.username.replace(/[.#$\[\]]/g, '_');
    rtdb.ref(`progress/${userKey}`).set({
        username: gameState.username,
        score: gameState.score,
        justinCatches: gameState.justinCatches,
        location: gameState.location,
        latitude: gameState.latitude,
        longitude: gameState.longitude,
        lastPlayed: Date.now()
    })
    .then(() => {
        console.log('Final progress saved to RTDB');
    })
    .catch((error) => {
        console.error('Error saving to RTDB:', error);
    });
}

function updateScore() {
    document.getElementById('score').textContent = gameState.score;
    
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        updateHighScore();
        saveLocalProgress();
    }
}

function updateJustinCount() {
    document.getElementById('justin-count').textContent = gameState.justinCatches;
}

function updateHighScore() {
    document.getElementById('high-score').textContent = gameState.highScore;
}

/**
 * Handle game over - SAVE TO FIREBASE HERE
 */
function handleGameOver() {
    gameState.isRunning = false;
    cancelAnimationFrame(gameState.animationId);
    
    assets.sounds.background.pause();
    assets.sounds.caught.currentTime = 0;
    assets.sounds.caught.play().catch(err => console.log('Sound error'));
    
    // SAVE TO FIREBASE ONLY WHEN GAME ENDS
    saveToFirebase();
    
    document.getElementById('final-score').textContent = gameState.score;
    document.getElementById('final-justin-count').textContent = gameState.justinCatches;
    document.getElementById('final-high-score').textContent = gameState.highScore;
    document.getElementById('game-over-screen').classList.remove('hidden');
    
    console.log('GAME OVER - Leaderboard updated with final score');
}

function restartGame() {
    document.getElementById('game-over-screen').classList.add('hidden');
    assets.sounds.background.currentTime = 0;
    startGame();
}
