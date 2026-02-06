import CONFIG from '../config.js';

const API_BASE = CONFIG.API_BASE_URL;

// ---- DOM Elements ----
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const userEmail = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const watchlistCount = document.getElementById('watchlist-count');
const alertCount = document.getElementById('alert-count');
const openDashboardBtn = document.getElementById('open-dashboard-btn');
const scrapeNowBtn = document.getElementById('scrape-now-btn');
const recentAlertsSection = document.getElementById('recent-alerts');
const alertsList = document.getElementById('alerts-list');
const openAppLink = document.getElementById('open-app-link');

// ---- State ----
let authToken = null;

// ---- Initialize ----
async function init() {
  const stored = await chrome.storage.local.get([
    CONFIG.STORAGE_KEYS.AUTH_TOKEN,
    CONFIG.STORAGE_KEYS.USER,
  ]);

  authToken = stored[CONFIG.STORAGE_KEYS.AUTH_TOKEN] || null;
  const user = stored[CONFIG.STORAGE_KEYS.USER] || null;

  openAppLink.href = API_BASE.replace('/api', '').replace(':3000', ':5173');

  if (authToken && user) {
    showDashboard(user);
  } else {
    showLogin();
  }
}

function showLogin() {
  loginSection.classList.remove('hidden');
  dashboardSection.classList.add('hidden');
}

async function showDashboard(user) {
  loginSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  userEmail.textContent = user.email || '';

  // Fetch stats
  try {
    const [watchlistsRes, alertsRes] = await Promise.all([
      apiRequest('/api/watchlists'),
      apiRequest('/api/alerts/count'),
    ]);

    watchlistCount.textContent = watchlistsRes?.data?.length || 0;
    const count = alertsRes?.data?.unread_count || 0;
    alertCount.textContent = count;

    // Fetch recent alerts
    if (count > 0) {
      const alertsData = await apiRequest('/api/alerts?unread=true');
      if (alertsData?.data?.length) {
        recentAlertsSection.classList.remove('hidden');
        alertsList.innerHTML = alertsData.data.slice(0, 5).map(alert => `
          <li>
            <div class="alert-title">${alert.car_listings?.title || 'Car Deal'}</div>
            <div class="alert-meta">
              Score: ${alert.deal_score}/100
              ${alert.car_listings?.price ? ' • $' + alert.car_listings.price.toLocaleString() : ''}
            </div>
          </li>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

async function apiRequest(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
    },
  });
  return response.json();
}

// ---- Event Handlers ----
loginBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    loginError.textContent = 'Please enter email and password.';
    loginError.classList.remove('hidden');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in...';
  loginError.classList.add('hidden');

  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Login failed');
    }

    authToken = data.data.session.access_token;
    const user = data.data.user;

    await chrome.storage.local.set({
      [CONFIG.STORAGE_KEYS.AUTH_TOKEN]: authToken,
      [CONFIG.STORAGE_KEYS.USER]: user,
    });

    // Notify service worker
    chrome.runtime.sendMessage({ type: 'SET_AUTH_TOKEN', token: authToken });

    showDashboard(user);
  } catch (err) {
    loginError.textContent = err.message;
    loginError.classList.remove('hidden');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
});

logoutBtn.addEventListener('click', async () => {
  authToken = null;
  await chrome.storage.local.remove([
    CONFIG.STORAGE_KEYS.AUTH_TOKEN,
    CONFIG.STORAGE_KEYS.USER,
  ]);
  chrome.runtime.sendMessage({ type: 'SET_AUTH_TOKEN', token: null });
  showLogin();
});

openDashboardBtn.addEventListener('click', () => {
  const url = API_BASE.replace('/api', '').replace(':3000', ':5173') + '/dashboard';
  chrome.tabs.create({ url });
});

scrapeNowBtn.addEventListener('click', async () => {
  scrapeNowBtn.disabled = true;
  scrapeNowBtn.textContent = 'Scanning...';

  try {
    await Promise.all([
      chrome.runtime.sendMessage({ type: 'SCRAPE_NOW', platform: 'facebook' }),
      chrome.runtime.sendMessage({ type: 'SCRAPE_NOW', platform: 'craigslist' }),
    ]);
    scrapeNowBtn.textContent = 'Scan Complete!';
    setTimeout(() => {
      scrapeNowBtn.textContent = 'Scan Now';
      scrapeNowBtn.disabled = false;
    }, 2000);
  } catch (err) {
    scrapeNowBtn.textContent = 'Scan Failed';
    setTimeout(() => {
      scrapeNowBtn.textContent = 'Scan Now';
      scrapeNowBtn.disabled = false;
    }, 2000);
  }
});

// Initialize
init();
