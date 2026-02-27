import CONFIG from '../config.js';

// ---- State ----
let authToken = null;

// ---- Initialize ----
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Car Sales Lister] Extension installed');

  // Set up periodic scraping alarms
  chrome.alarms.create('scrape-facebook', { periodInMinutes: CONFIG.SCRAPE_INTERVAL_FACEBOOK });
  chrome.alarms.create('scrape-craigslist', { periodInMinutes: CONFIG.SCRAPE_INTERVAL_CRAIGSLIST });
  chrome.alarms.create('check-alerts', { periodInMinutes: 5 });

  // Load stored auth
  const stored = await chrome.storage.local.get([CONFIG.STORAGE_KEYS.AUTH_TOKEN]);
  if (stored[CONFIG.STORAGE_KEYS.AUTH_TOKEN]) {
    authToken = stored[CONFIG.STORAGE_KEYS.AUTH_TOKEN];
  }
});

// ---- Alarm Handlers ----
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log(`[Car Sales Lister] Alarm fired: ${alarm.name}`);

  switch (alarm.name) {
    case 'scrape-facebook':
      // Trigger scraping via backend API
      await triggerScrape('facebook');
      break;
    case 'scrape-craigslist':
      await triggerScrape('craigslist');
      break;
    case 'check-alerts':
      await checkForNewAlerts();
      break;
  }
});

// ---- Message Handler ----
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch((err) => {
    console.error('[Car Sales Lister] Message error:', err);
    sendResponse({ success: false, error: err.message });
  });
  return true; // Keep channel open for async response
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case 'SET_AUTH_TOKEN':
      authToken = message.token;
      await chrome.storage.local.set({ [CONFIG.STORAGE_KEYS.AUTH_TOKEN]: message.token });
      return { success: true };

    case 'GET_AUTH_STATUS': {
      // Reload from storage every time — MV3 service workers can be terminated
      // at any time, wiping the in-memory authToken. onInstalled only fires on
      // install/update, not on worker wake, so we must check storage directly.
      const stored = await chrome.storage.local.get([CONFIG.STORAGE_KEYS.AUTH_TOKEN]);
      const token = stored[CONFIG.STORAGE_KEYS.AUTH_TOKEN] || null;
      authToken = token; // refresh in-memory cache
      return { success: true, isAuthenticated: !!token };
    }

    case 'LISTING_FOUND':
      return await submitListing(message.listing);

    case 'GET_DEAL_SCORE':
      return await getDealScore(message.listingId);

    case 'GET_VALUATION':
      return await getValuation(message.data);

    case 'ADD_TO_WATCHLIST':
      return await addToWatchlist(message.data);

    case 'SCRAPE_NOW':
      return await triggerScrape(message.platform);

    case 'OPEN_DASHBOARD':
      chrome.tabs.create({ url: CONFIG.API_BASE_URL + '/dashboard' });
      return { success: true };

    case 'OPEN_POPUP':
      // Can't programmatically open the popup, but we can open the app login
      chrome.tabs.create({ url: CONFIG.API_BASE_URL + '/login' });
      return { success: true };

    case 'GET_GAS_PRICE':
      return await getGasPrice();

    case 'GET_FUEL_ECONOMY':
      return await getFuelEconomy(message.data);

    case 'GET_REPAIR_ESTIMATE':
      return await getRepairEstimate(message.data);

    case 'GET_VEHICLE_FACTORS':
      return await getVehicleFactors(message.data);

    case 'GET_RESELLABILITY':
      return await getResellability(message.data);

    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}

// ---- Auth Helper ----
// MV3 service workers can be terminated at any time, wiping in-memory state.
// Always reload the token from storage before using it.
async function ensureAuthToken() {
  if (!authToken) {
    const stored = await chrome.storage.local.get([CONFIG.STORAGE_KEYS.AUTH_TOKEN]);
    authToken = stored[CONFIG.STORAGE_KEYS.AUTH_TOKEN] || null;
  }
  return authToken;
}

// ---- API Helpers ----
async function apiRequest(path, options = {}) {
  const token = await ensureAuthToken();
  const url = `${CONFIG.API_BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }
  return response.json();
}

async function submitListing(listing) {
  try {
    const result = await apiRequest('/api/listings', {
      method: 'POST',
      body: JSON.stringify(listing),
    });
    return { success: true, data: result.data };
  } catch (error) {
    console.error('[Car Sales Lister] Submit listing error:', error);
    return { success: false, error: error.message };
  }
}

async function getDealScore(listingId) {
  try {
    const result = await apiRequest(`/api/listings/${listingId}`);
    return { success: true, dealScore: result.data?.deal_score };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function triggerScrape(platform) {
  if (!(await ensureAuthToken())) return;
  try {
    await apiRequest('/api/admin/scrape', {
      method: 'POST',
      body: JSON.stringify({ platform }),
    });
    await chrome.storage.local.set({
      [platform === 'facebook' ? CONFIG.STORAGE_KEYS.LAST_SCRAPE_FB : CONFIG.STORAGE_KEYS.LAST_SCRAPE_CL]: Date.now(),
    });
  } catch (error) {
    console.error(`[Car Sales Lister] Scrape ${platform} error:`, error);
  }
}

async function getValuation(data) {
  if (!(await ensureAuthToken())) return { success: false, error: 'Not authenticated' };
  try {
    const params = new URLSearchParams({
      make: data.make,
      model: data.model,
      year: String(data.year),
      mileage: String(data.mileage || 50000),
      condition: data.condition || 'good',
    });
    if (data.vin) params.set('vin', data.vin);

    const result = await apiRequest(`/api/valuations/kbb?${params.toString()}`);
    return { success: true, data: result.data };
  } catch (error) {
    console.error('[Car Sales Lister] Valuation error:', error);
    return { success: false, error: error.message };
  }
}

async function addToWatchlist(data) {
  if (!(await ensureAuthToken())) return { success: false, error: 'Not authenticated' };
  try {
    const result = await apiRequest('/api/watchlists', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { success: true, data: result.data };
  } catch (error) {
    console.error('[Car Sales Lister] Add to watchlist error:', error);
    return { success: false, error: error.message };
  }
}

async function checkForNewAlerts() {
  if (!(await ensureAuthToken())) return;
  try {
    const result = await apiRequest('/api/alerts/count');
    const count = result.data?.unread_count || 0;
    if (count > 0) {
      chrome.action.setBadgeText({ text: String(count) });
      chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });

      // Show notification for new deals
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icon-128.png',
        title: 'Car Sales Lister',
        message: `You have ${count} new deal alert${count > 1 ? 's' : ''}!`,
      });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (error) {
    console.error('[Car Sales Lister] Check alerts error:', error);
  }
}

async function getGasPrice() {
  if (!(await ensureAuthToken())) return { success: false, error: 'Not authenticated' };
  try {
    const result = await apiRequest('/api/valuations/gas-price');
    return { success: true, data: result.data };
  } catch (error) {
    console.error('[Car Sales Lister] Gas price error:', error);
    return { success: false, error: error.message };
  }
}

async function getFuelEconomy(data) {
  if (!(await ensureAuthToken())) return { success: false, error: 'Not authenticated' };
  if (!data?.make || !data?.model || !data?.year) return { success: false, error: 'Missing make/model/year' };
  try {
    const params = new URLSearchParams({ make: data.make, model: data.model, year: String(data.year) });
    const result = await apiRequest(`/api/valuations/fuel-economy?${params.toString()}`);
    return { success: true, data: result.data };
  } catch (error) {
    console.error('[Car Sales Lister] Fuel economy error:', error);
    return { success: false, error: error.message };
  }
}

async function getRepairEstimate(data) {
  if (!(await ensureAuthToken())) return { success: false, error: 'Not authenticated' };
  try {
    const params = new URLSearchParams({ description: data?.description || '' });
    const result = await apiRequest(`/api/valuations/repair-estimate?${params.toString()}`);
    return { success: true, data: result.data };
  } catch (error) {
    console.error('[Car Sales Lister] Repair estimate error:', error);
    return { success: false, error: error.message };
  }
}

async function getVehicleFactors(data) {
  if (!(await ensureAuthToken())) return { success: false, error: 'Not authenticated' };
  if (!data?.make || !data?.model) return { success: false, error: 'Missing make/model' };
  try {
    const params = new URLSearchParams({ make: data.make, model: data.model, year: String(data.year || '') });
    const result = await apiRequest(`/api/valuations/vehicle-factors?${params.toString()}`);
    return { success: true, data: result.data };
  } catch (error) {
    console.error('[Car Sales Lister] Vehicle factors error:', error);
    return { success: false, error: error.message };
  }
}

async function getResellability(data) {
  if (!(await ensureAuthToken())) return { success: false, error: 'Not authenticated' };
  if (!data?.make || !data?.model || !data?.year || !data?.price) return { success: false, error: 'Missing required fields' };
  try {
    const params = new URLSearchParams({
      make: data.make, model: data.model, year: String(data.year),
      price: String(data.price), mileage: String(data.mileage || 50000),
    });
    const result = await apiRequest(`/api/valuations/resellability?${params.toString()}`);
    return { success: true, data: result.data };
  } catch (error) {
    console.error('[Car Sales Lister] Resellability error:', error);
    return { success: false, error: error.message };
  }
}
