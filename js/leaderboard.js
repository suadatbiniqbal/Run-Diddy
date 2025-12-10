/**
 * Leaderboard with Small Card Design and Lazy Loading
 * Loads 5 cards initially, then 10 more on scroll
 */

let allLeaderboardData = [];
let currentIndex = 0;
const INITIAL_LOAD = 5;
const LOAD_MORE = 10;
let isLoading = false;

/**
 * Load leaderboard data from Firestore
 */
function loadLeaderboard() {
    const cardsContainer = document.getElementById('leaderboard-cards');
    cardsContainer.innerHTML = '<div class="loading-card"><p>Loading...</p></div>';

    // Fetch top 50 from Firestore
    db.collection('leaderboard')
        .orderBy('score', 'desc')
        .limit(50)
        .get()
        .then((querySnapshot) => {
            cardsContainer.innerHTML = '';
            
            if (querySnapshot.empty) {
                cardsContainer.innerHTML = '<div class="empty-card"><p>No scores yet. Be the first!</p></div>';
                return;
            }

            // Store all data
            allLeaderboardData = [];
            querySnapshot.forEach((doc) => {
                allLeaderboardData.push(doc.data());
            });

            // Reset index and load initial cards
            currentIndex = 0;
            loadInitialCards();
            
            // Setup scroll listener
            setupInfiniteScroll();
        })
        .catch((error) => {
            console.error('Error loading leaderboard:', error);
            cardsContainer.innerHTML = '<div class="error-card"><p>Error loading leaderboard</p></div>';
        });
}

/**
 * Load initial 5 cards
 */
function loadInitialCards() {
    const cardsContainer = document.getElementById('leaderboard-cards');
    const fragment = document.createDocumentFragment();
    
    const count = Math.min(INITIAL_LOAD, allLeaderboardData.length);
    
    for (let i = 0; i < count; i++) {
        const data = allLeaderboardData[i];
        const rank = i + 1;
        const card = createLeaderboardCard(data, rank);
        fragment.appendChild(card);
    }
    
    cardsContainer.appendChild(fragment);
    currentIndex = count;
}

/**
 * Load more cards (10 at a time)
 */
function loadMoreCards() {
    if (isLoading || currentIndex >= allLeaderboardData.length) return;
    
    isLoading = true;
    const cardsContainer = document.getElementById('leaderboard-cards');
    const fragment = document.createDocumentFragment();
    
    const remaining = allLeaderboardData.length - currentIndex;
    const count = Math.min(LOAD_MORE, remaining);
    
    for (let i = 0; i < count; i++) {
        const data = allLeaderboardData[currentIndex + i];
        const rank = currentIndex + i + 1;
        const card = createLeaderboardCard(data, rank);
        fragment.appendChild(card);
    }
    
    cardsContainer.appendChild(fragment);
    currentIndex += count;
    
    setTimeout(() => {
        isLoading = false;
    }, 100);
}

/**
 * Setup infinite scroll listener
 */
function setupInfiniteScroll() {
    const cardsContainer = document.getElementById('leaderboard-cards');
    
    // Remove previous listener if exists
    window.removeEventListener('scroll', handleScroll);
    
    // Add new listener
    window.addEventListener('scroll', handleScroll);
}

/**
 * Handle scroll event
 */
function handleScroll() {
    const cardsContainer = document.getElementById('leaderboard-cards');
    const scrollPosition = window.innerHeight + window.scrollY;
    const threshold = document.documentElement.scrollHeight - 300;
    
    if (scrollPosition >= threshold && !isLoading && currentIndex < allLeaderboardData.length) {
        loadMoreCards();
    }
}

/**
 * Create leaderboard card element (smaller design, no emojis)
 */
function createLeaderboardCard(data, rank) {
    const card = document.createElement('div');
    card.className = 'leaderboard-card';
    
    if (rank === 1) card.classList.add('rank-1');
    else if (rank === 2) card.classList.add('rank-2');
    else if (rank === 3) card.classList.add('rank-3');
    
    const rankDisplay = getRankDisplay(rank);
    const location = data.location || 'Unknown';
    const justinCatches = data.justinCatches || 0;
    
    card.innerHTML = `
        <div class="card-rank">${rankDisplay}</div>
        <div class="card-content">
            <div class="card-username">${escapeHtml(data.username)}</div>
            <div class="card-location">${escapeHtml(location)}</div>
            <div class="card-stats">
                <div class="card-stat">
                    <span class="stat-label">Score</span>
                    <span class="stat-value">${data.score}</span>
                </div>
                <div class="card-stat justin-stat-card">
                    <span class="stat-label">Justin</span>
                    <span class="stat-value">${justinCatches}</span>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

/**
 * Get rank display WITHOUT emojis (professional)
 */
function getRankDisplay(rank) {
    if (rank === 1) return '1ST';
    if (rank === 2) return '2ND';
    if (rank === 3) return '3RD';
    return `#${rank}`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Initialize leaderboard
 */
window.addEventListener('DOMContentLoaded', () => {
    loadLeaderboard();
    
    document.getElementById('refresh-btn').addEventListener('click', () => {
        // Remove scroll listener before reload
        window.removeEventListener('scroll', handleScroll);
        loadLeaderboard();
    });
});
