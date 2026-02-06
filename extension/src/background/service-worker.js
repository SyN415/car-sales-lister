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

    case 'GET_AUTH_STATUS':
      return { success: true, isAuthenticated: !!authToken };

    case 'LISTING_FOUND':
      return await submitListing(message.listing);

    case 'GET_DEAL_SCORE':
      return await getDealScore(message.listingId);

    case 'SCRAPE_NOW':
      return await triggerScrape(message.platform);

    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}

// ---- API Helpers ----
async function apiRequest(path, options = {}) {
  const url = `${CONFIG.API_BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

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
  if (!authToken) return;
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

async function checkForNewAlerts() {
  if (!authToken) return;
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
