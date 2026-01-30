/* ================================================
   LOL-PAGE: Main Application
   ================================================
   Fetches data from Supabase and renders the UI
   ================================================ */

// ================================================
// CONFIGURATION CHECK
// ================================================

// Check if config exists (config.js should define SUPABASE_URL and SUPABASE_ANON_KEY)
if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
    console.error('❌ Missing Supabase configuration!');
    console.error('Please create a config.js file with SUPABASE_URL and SUPABASE_ANON_KEY');
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'flex';
    document.getElementById('error-message').textContent =
        'Configuration missing. Please set up config.js with your Supabase credentials.';
}

// ================================================
// SUPABASE CLIENT
// ================================================

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================================================
// STATE MANAGEMENT
// ================================================

const state = {
    accounts: [],           // All accounts from DB
    skins: [],              // All skins with account info
    filteredAccounts: [],   // After applying filters
    regions: [],            // Unique regions for filter
    champions: [],          // Unique champions for filter

    // Current filter values
    filters: {
        search: '',
        region: '',
        champion: '',
        status: ''
    },

    // Current sort
    sort: 'level-desc',

    // Loading state
    isLoading: true,
    error: null
};

// ================================================
// DOM ELEMENTS
// ================================================

const elements = {
    // Containers
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    empty: document.getElementById('empty'),
    accountsGrid: document.getElementById('accounts-grid'),

    // Filters
    searchInput: document.getElementById('search-input'),
    clearSearch: document.getElementById('clear-search'),
    regionFilter: document.getElementById('region-filter'),
    championFilter: document.getElementById('champion-filter'),
    statusFilter: document.getElementById('status-filter'),
    sortSelect: document.getElementById('sort-select'),
    resetFilters: document.getElementById('reset-filters'),
    resultsCount: document.getElementById('results-count'),

    // Error
    errorMessage: document.getElementById('error-message'),
    retryBtn: document.getElementById('retry-btn'),

    // Modal
    modal: document.getElementById('skin-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalBody: document.getElementById('modal-body'),
    modalClose: document.getElementById('modal-close')
};

// ================================================
// DATA FETCHING
// ================================================

/**
 * Fetches all public accounts using the secure RPC function
 */
async function fetchAccounts() {
    const { data, error } = await supabaseClient.rpc('get_public_accounts');

    if (error) {
        console.error('Error fetching accounts:', error);
        throw new Error('Failed to load accounts: ' + error.message);
    }

    return data || [];
}

/**
 * Fetches all skins with account info using the secure RPC function
 */
async function fetchSkins() {
    const { data, error } = await supabaseClient.rpc('get_public_skins');

    if (error) {
        console.error('Error fetching skins:', error);
        throw new Error('Failed to load skins: ' + error.message);
    }

    return data || [];
}

/**
 * Fetches unique regions for the filter dropdown
 */
async function fetchRegions() {
    const { data, error } = await supabaseClient.rpc('get_regions');

    if (error) {
        console.error('Error fetching regions:', error);
        return [];
    }

    return data?.map(r => r.region).filter(Boolean) || [];
}

/**
 * Fetches unique champions for the filter dropdown
 */
async function fetchChampions() {
    const { data, error } = await supabaseClient.rpc('get_champions');

    if (error) {
        console.error('Error fetching champions:', error);
        return [];
    }

    return data?.map(c => c.champion).filter(Boolean) || [];
}

/**
 * Loads all initial data
 */
async function loadData() {
    showLoading();
    state.error = null;

    try {
        // Fetch all data in parallel
        const [accounts, skins, regions, champions] = await Promise.all([
            fetchAccounts(),
            fetchSkins(),
            fetchRegions(),
            fetchChampions()
        ]);

        state.accounts = accounts;
        state.skins = skins;
        state.regions = regions;
        state.champions = champions;

        // Group skins by account
        groupSkinsByAccount();

        // Populate filter dropdowns
        populateFilters();

        // Apply initial filters and render
        applyFiltersAndRender();

    } catch (error) {
        console.error('Failed to load data:', error);
        state.error = error.message;
        showError(error.message);
    }
}

/**
 * Groups skins by account_id for efficient lookup
 */
function groupSkinsByAccount() {
    state.accounts.forEach(account => {
        account.skins = state.skins
            .filter(skin => skin.account_id === account.id)
            .map(skin => ({
                name: skin.skin_name,
                champion: skin.champion_name
            }));
    });
}

// ================================================
// FILTERING & SORTING
// ================================================

/**
 * Applies all filters to the accounts list
 */
function applyFilters() {
    const { search, region, champion, status } = state.filters;
    const searchLower = search.toLowerCase().trim();

    state.filteredAccounts = state.accounts.filter(account => {
        // Only show accounts with skins
        if (account.skins.length === 0) {
            return false;
        }

        // Region filter
        if (region && account.region !== region) {
            return false;
        }

        // Status filter
        if (status && account.status !== status) {
            return false;
        }

        // Champion filter - check if account has any skin of this champion
        if (champion) {
            const hasChampion = account.skins.some(
                skin => skin.champion === champion
            );
            if (!hasChampion) return false;
        }

        // Search filter - search in skin names
        if (searchLower) {
            const matchesSkin = account.skins.some(
                skin => skin.name.toLowerCase().includes(searchLower)
            );
            if (!matchesSkin) return false;
        }

        return true;
    });
}

/**
 * Sorts the filtered accounts based on current sort setting
 */
function sortAccounts() {
    const [field, direction] = state.sort.split('-');
    const multiplier = direction === 'desc' ? -1 : 1;

    state.filteredAccounts.sort((a, b) => {
        switch (field) {
            case 'level':
                return (a.level - b.level) * multiplier;
            case 'skins':
                return (a.skins.length - b.skins.length) * multiplier;
            case 'id':
                return (a.id - b.id) * multiplier;
            default:
                return 0;
        }
    });
}

/**
 * Applies filters, sorts, and renders
 */
function applyFiltersAndRender() {
    applyFilters();
    sortAccounts();
    render();
}

// ================================================
// RENDERING
// ================================================

/**
 * Shows loading state
 */
function showLoading() {
    elements.loading.style.display = 'flex';
    elements.error.style.display = 'none';
    elements.empty.style.display = 'none';
    elements.accountsGrid.innerHTML = '';
}

/**
 * Shows error state
 */
function showError(message) {
    elements.loading.style.display = 'none';
    elements.error.style.display = 'flex';
    elements.empty.style.display = 'none';
    elements.errorMessage.textContent = message;
    elements.accountsGrid.innerHTML = '';
}

/**
 * Shows empty state
 */
function showEmpty() {
    elements.loading.style.display = 'none';
    elements.error.style.display = 'none';
    elements.empty.style.display = 'flex';
    elements.accountsGrid.innerHTML = '';
}

/**
 * Main render function
 */
function render() {
    elements.loading.style.display = 'none';
    elements.error.style.display = 'none';

    // Update results count
    const total = state.accounts.length;
    const shown = state.filteredAccounts.length;
    elements.resultsCount.textContent = `Showing ${shown} of ${total} accounts`;

    // Show empty state if no results
    if (state.filteredAccounts.length === 0) {
        showEmpty();
        return;
    }

    elements.empty.style.display = 'none';

    // Render account cards
    const html = state.filteredAccounts.map(account => renderAccountCard(account)).join('');
    elements.accountsGrid.innerHTML = html;

    // Attach event listeners to "more skins" buttons
    attachSkinModalListeners();
}

/**
 * Renders a single account card
 */
function renderAccountCard(account) {
    const searchTerm = state.filters.search.toLowerCase();
    const MAX_SKINS_SHOWN = 8;

    // Get skins to display (limited)
    const displaySkins = account.skins.slice(0, MAX_SKINS_SHOWN);
    const remainingSkins = account.skins.length - MAX_SKINS_SHOWN;

    // Render skin tags with highlighting
    const skinTagsHtml = displaySkins.map(skin => {
        const isHighlight = searchTerm && skin.name.toLowerCase().includes(searchTerm);
        return `<span class="skin-tag ${isHighlight ? 'highlight' : ''}">${escapeHtml(skin.name)}</span>`;
    }).join('');

    // More skins button
    const moreSkinsBtnHtml = remainingSkins > 0
        ? `<button class="more-skins" data-account-id="${account.id}">+${remainingSkins} more</button>`
        : '';

    // Status class
    const statusClass = account.status === 'in_use' ? 'in_use' : '';
    const statusText = account.status === 'in_use' ? 'In Use' : 'Available';

    return `
        <article class="account-card" data-account-id="${account.id}">
            <header class="card-header">
                <div class="account-info">
                    <h2 class="account-name">Account #${account.id}</h2>
                    <span class="account-id">ID: ${account.id}</span>
                </div>
                <div class="account-level">
                    <span class="level-label">Level</span>
                    <span class="level-value">${account.level || 1}</span>
                </div>
            </header>
            
            <div class="card-meta">
                <span class="meta-badge region">📍 ${escapeHtml(account.region || 'Unknown')}</span>
                <span class="meta-badge status ${statusClass}">● ${statusText}</span>
                <span class="meta-badge skins">🎨 ${account.skins.length} skins</span>
            </div>
            
            <div class="card-body">
                <div class="skins-label">
                    <span>Skins</span>
                </div>
                <div class="skins-list">
                    ${skinTagsHtml}
                    ${moreSkinsBtnHtml}
                </div>
            </div>
        </article>
    `;
}

/**
 * Populates filter dropdowns with unique values
 */
function populateFilters() {
    // Regions
    elements.regionFilter.innerHTML = '<option value="">All Regions</option>' +
        state.regions.map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('');

    // Champions
    elements.championFilter.innerHTML = '<option value="">All Champions</option>' +
        state.champions.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
}

// ================================================
// MODAL
// ================================================

/**
 * Attaches click listeners to "more skins" buttons
 */
function attachSkinModalListeners() {
    document.querySelectorAll('.more-skins').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const accountId = parseInt(btn.dataset.accountId);
            showSkinModal(accountId);
        });
    });
}

/**
 * Shows modal with all skins for an account
 */
function showSkinModal(accountId) {
    const account = state.accounts.find(a => a.id === accountId);
    if (!account) return;

    elements.modalTitle.textContent = `Account #${account.id} - All Skins (${account.skins.length})`;

    const skinsHtml = account.skins.map(skin => `
        <div class="modal-skin-item">
            <span class="modal-skin-name">${escapeHtml(skin.name)}</span>
            <span class="modal-skin-champion">${escapeHtml(skin.champion || 'Unknown')}</span>
        </div>
    `).join('');

    elements.modalBody.innerHTML = `<div class="modal-skins-list">${skinsHtml}</div>`;
    elements.modal.style.display = 'flex';
}

/**
 * Closes the modal
 */
function closeModal() {
    elements.modal.style.display = 'none';
}

// ================================================
// EVENT LISTENERS
// ================================================

/**
 * Debounce helper
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Search input handler (debounced)
 */
const handleSearch = debounce((value) => {
    state.filters.search = value;
    elements.clearSearch.style.display = value ? 'flex' : 'none';
    applyFiltersAndRender();
}, 300);

/**
 * Resets all filters to default
 */
function resetFilters() {
    state.filters = {
        search: '',
        region: '',
        champion: '',
        status: ''
    };
    state.sort = 'level-desc';

    elements.searchInput.value = '';
    elements.clearSearch.style.display = 'none';
    elements.regionFilter.value = '';
    elements.championFilter.value = '';
    elements.statusFilter.value = '';
    elements.sortSelect.value = 'level-desc';

    applyFiltersAndRender();
}

/**
 * Sets up all event listeners
 */
function setupEventListeners() {
    // Search
    elements.searchInput.addEventListener('input', (e) => {
        handleSearch(e.target.value);
    });

    // Clear search
    elements.clearSearch.addEventListener('click', () => {
        elements.searchInput.value = '';
        elements.clearSearch.style.display = 'none';
        state.filters.search = '';
        applyFiltersAndRender();
    });

    // Region filter
    elements.regionFilter.addEventListener('change', (e) => {
        state.filters.region = e.target.value;
        applyFiltersAndRender();
    });

    // Champion filter
    elements.championFilter.addEventListener('change', (e) => {
        state.filters.champion = e.target.value;
        applyFiltersAndRender();
    });

    // Status filter
    elements.statusFilter.addEventListener('change', (e) => {
        state.filters.status = e.target.value;
        applyFiltersAndRender();
    });

    // Sort
    elements.sortSelect.addEventListener('change', (e) => {
        state.sort = e.target.value;
        sortAccounts();
        render();
    });

    // Reset filters
    elements.resetFilters.addEventListener('click', resetFilters);

    // Retry button
    elements.retryBtn.addEventListener('click', loadData);

    // Modal close
    elements.modalClose.addEventListener('click', closeModal);

    // Close modal on backdrop click
    elements.modal.addEventListener('click', (e) => {
        if (e.target === elements.modal) {
            closeModal();
        }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.modal.style.display === 'flex') {
            closeModal();
        }
    });
}

// ================================================
// UTILITIES
// ================================================

/**
 * Escapes HTML to prevent XSS
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ================================================
// INITIALIZATION
// ================================================

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadData();
});
