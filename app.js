/* ================================================
   ACCOUNTS: Main Application
   ================================================
   Fetches data from Supabase and renders the UI
   With pagination support
   ================================================ */

// ================================================
// CONFIGURATION CHECK
// ================================================

// Check if config exists (config.js should define SUPABASE_URL and SUPABASE_ANON_KEY)
if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
    console.error('Missing Supabase configuration!');
    console.error('Please create a config.js file with SUPABASE_URL and SUPABASE_ANON_KEY');
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'flex';
    document.getElementById('error-message').textContent =
        'Yapılandırma eksik. Lütfen Supabase bilgilerinizi config.js dosyasına ekleyin.';
}

// ================================================
// SUPABASE CLIENT
// ================================================

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================================================
// CONSTANTS
// ================================================

const ACCOUNTS_PER_PAGE = 10;

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
        rankedReady: false
    },

    // Current sort
    sort: 'level-desc',

    // Pagination
    currentPage: 1,
    totalPages: 1,

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
    accountsList: document.getElementById('accounts-list'),

    // Pagination
    pagination: document.getElementById('pagination'),
    prevPage: document.getElementById('prev-page'),
    nextPage: document.getElementById('next-page'),
    pageNumbers: document.getElementById('page-numbers'),

    // Filters
    searchInput: document.getElementById('search-input'),
    clearSearch: document.getElementById('clear-search'),
    regionFilter: document.getElementById('region-filter'),
    championFilter: document.getElementById('champion-filter'),
    championFilter: document.getElementById('champion-filter'),
    rrFilter: document.getElementById('rr-filter'), // New checkbox filter
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
        throw new Error('Hesaplar yüklenemedi: ' + error.message);
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
        throw new Error('Kostümler yüklenemedi: ' + error.message);
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

    // Get unique base regions (remove " RR" suffix)
    const regions = data?.map(r => r.region).filter(Boolean) || [];
    const uniqueBaseRegions = [...new Set(regions.map(r => r.replace(' RR', '')))];
    return uniqueBaseRegions.sort();
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
    const { search, region, champion, rankedReady } = state.filters;
    const searchLower = search.toLowerCase().trim();

    state.filteredAccounts = state.accounts.filter(account => {
        // Only show accounts with skins
        if (account.skins.length === 0) {
            return false;
        }

        // Region filter (matches base region, e.g. "TR" matches "TR" and "TR RR")
        if (region) {
            const accountBaseRegion = account.region ? account.region.replace(' RR', '') : '';
            if (accountBaseRegion !== region) {
                return false;
            }
        }

        // Ranked Ready filter
        if (rankedReady) {
            // Check if region ends with "RR"
            // Note: account.region comes from server_info
            if (!account.region || !account.region.endsWith(' RR')) {
                return false;
            }
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

    // Reset to page 1 when filters change
    state.currentPage = 1;

    // Calculate total pages
    state.totalPages = Math.ceil(state.filteredAccounts.length / ACCOUNTS_PER_PAGE);
    if (state.totalPages === 0) state.totalPages = 1;
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
// PAGINATION
// ================================================

/**
 * Gets accounts for current page
 */
function getPageAccounts() {
    const start = (state.currentPage - 1) * ACCOUNTS_PER_PAGE;
    const end = start + ACCOUNTS_PER_PAGE;
    return state.filteredAccounts.slice(start, end);
}

/**
 * Go to specific page
 */
function goToPage(page) {
    if (page < 1 || page > state.totalPages) return;
    state.currentPage = page;
    render();
    // Scroll to top of list
    elements.accountsList.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Renders pagination controls
 */
function renderPagination() {
    if (state.totalPages <= 1) {
        elements.pagination.style.display = 'none';
        return;
    }

    elements.pagination.style.display = 'flex';

    // Update prev/next buttons
    elements.prevPage.disabled = state.currentPage === 1;
    elements.nextPage.disabled = state.currentPage === state.totalPages;

    // Generate page numbers
    const pageNumbersHtml = generatePageNumbers();
    elements.pageNumbers.innerHTML = pageNumbersHtml;

    // Add click listeners to page numbers
    elements.pageNumbers.querySelectorAll('.page-number').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = parseInt(btn.dataset.page);
            goToPage(page);
        });
    });
}

/**
 * Generates page number buttons with ellipsis for large page counts
 */
function generatePageNumbers() {
    const current = state.currentPage;
    const total = state.totalPages;
    const pages = [];

    // Always show first page
    pages.push(1);

    // Calculate range around current page
    let start = Math.max(2, current - 1);
    let end = Math.min(total - 1, current + 1);

    // Add ellipsis after first page if needed
    if (start > 2) {
        pages.push('...');
    }

    // Add pages in range
    for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
            pages.push(i);
        }
    }

    // Add ellipsis before last page if needed
    if (end < total - 1) {
        pages.push('...');
    }

    // Always show last page (if more than 1 page)
    if (total > 1 && !pages.includes(total)) {
        pages.push(total);
    }

    // Generate HTML
    return pages.map(page => {
        if (page === '...') {
            return '<span class="page-ellipsis">...</span>';
        }
        return `<button class="page-number ${page === current ? 'active' : ''}" data-page="${page}">${page}</button>`;
    }).join('');
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
    elements.accountsList.innerHTML = '';
    elements.pagination.style.display = 'none';
}

/**
 * Shows error state
 */
function showError(message) {
    elements.loading.style.display = 'none';
    elements.error.style.display = 'flex';
    elements.empty.style.display = 'none';
    elements.errorMessage.textContent = message;
    elements.accountsList.innerHTML = '';
    elements.pagination.style.display = 'none';
}

/**
 * Shows empty state
 */
function showEmpty() {
    elements.loading.style.display = 'none';
    elements.error.style.display = 'none';
    elements.empty.style.display = 'flex';
    elements.accountsList.innerHTML = '';
    elements.pagination.style.display = 'none';
}

/**
 * Main render function
 */
function render() {
    elements.loading.style.display = 'none';
    elements.error.style.display = 'none';

    // Update results count
    const total = state.filteredAccounts.length;
    const start = (state.currentPage - 1) * ACCOUNTS_PER_PAGE + 1;
    const end = Math.min(state.currentPage * ACCOUNTS_PER_PAGE, total);

    if (total === 0) {
        elements.resultsCount.textContent = 'Hesap bulunamadı';
    } else {
        elements.resultsCount.textContent = `Toplam ${total} hesaptan ${start}-${end} arası gösteriliyor`;
    }

    // Show empty state if no results
    if (state.filteredAccounts.length === 0) {
        showEmpty();
        return;
    }

    elements.empty.style.display = 'none';

    // Get accounts for current page
    const pageAccounts = getPageAccounts();

    // Render account rows
    const html = pageAccounts.map(account => renderAccountRow(account)).join('');
    elements.accountsList.innerHTML = html;

    // Render pagination
    renderPagination();

    // Attach event listeners to "more skins" buttons
    attachSkinModalListeners();
}

/**
 * Renders a single account row
 */
function renderAccountRow(account) {
    const searchTerm = state.filters.search.toLowerCase();
    const MAX_SKINS_SHOWN = 15;

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
        ? `<button class="more-skins" data-account-id="${account.id}">+${remainingSkins} tane daha</button>`
        : '';

    // Status class
    const statusClass = '';
    const statusText = 'Unranked';

    return `
        <article class="account-row" data-account-id="${account.id}">
            <header class="row-header">
                <div class="account-id-badge">
                    <span class="id-label">ID</span>
                    <span class="id-value">#${account.id}</span>
                </div>
                
                <div class="account-meta">
                    <span class="meta-item level">⭐ Seviye ${account.level || 1}</span>
                    <span class="meta-item region">
                        📍 ${escapeHtml(account.region || 'Bilinmiyor')}
                        ${(account.region && account.region.endsWith(' RR')) ? '<span class="rr-badge">RR</span>' : ''}
                    </span>
                    <span class="meta-item status ${statusClass}">● ${statusText}</span>
                    <span class="meta-item skin-count">🎨 ${account.skins.length} kostüm</span>
                </div>
            </header>
            
            <div class="row-body">
                <div class="skins-container">
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
    elements.regionFilter.innerHTML = '<option value="">Tüm Sunucular</option>' +
        state.regions.map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('');

    // Champions
    elements.championFilter.innerHTML = '<option value="">Tüm Şampiyonlar</option>' +
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

    elements.modalTitle.textContent = `Hesap #${account.id} - Tüm Kostümler (${account.skins.length})`;

    const skinsHtml = account.skins.map(skin => `
        <div class="modal-skin-item">
            <span class="modal-skin-name">${escapeHtml(skin.name)}</span>
            <span class="modal-skin-champion">${escapeHtml(skin.champion || 'Bilinmiyor')}</span>
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
        rankedReady: false
    };
    state.sort = 'level-desc';
    state.currentPage = 1;

    elements.searchInput.value = '';
    elements.clearSearch.style.display = 'none';
    elements.regionFilter.value = '';
    elements.championFilter.value = '';
    if (elements.rrFilter) elements.rrFilter.checked = false; // Reset checkbox
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



    // Ranked Ready filter
    if (elements.rrFilter) {
        elements.rrFilter.addEventListener('change', (e) => {
            state.filters.rankedReady = e.target.checked;
            applyFiltersAndRender();
        });
    }

    // Sort
    elements.sortSelect.addEventListener('change', (e) => {
        state.sort = e.target.value;
        sortAccounts();
        state.currentPage = 1; // Reset to first page on sort change
        render();
    });

    // Reset filters
    elements.resetFilters.addEventListener('click', resetFilters);

    // Retry button
    elements.retryBtn.addEventListener('click', loadData);

    // Pagination
    elements.prevPage.addEventListener('click', () => {
        goToPage(state.currentPage - 1);
    });

    elements.nextPage.addEventListener('click', () => {
        goToPage(state.currentPage + 1);
    });

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
// THEME TOGGLE
// ================================================

/**
 * Initializes theme based on localStorage or system preference
 */
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
}

/**
 * Toggles between dark and light theme
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

/**
 * Sets up theme toggle button
 */
function setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

// ================================================
// INITIALIZATION
// ================================================

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupThemeToggle();
    setupEventListeners();
    loadData();
});
