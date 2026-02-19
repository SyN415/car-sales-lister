/**
 * Car Sales Lister – Overlay UI Module
 * Shared functions for rendering deal badges and detail panels
 * on Facebook Marketplace and Craigslist pages.
 *
 * Loaded BEFORE the platform-specific scout scripts via manifest content_scripts.
 * Exposes: window.CarSalesOverlay
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */

  const THRESHOLDS = { great: 80, good: 60, fair: 40 };

  function tierFromScore(score) {
    if (score == null) return 'unknown';
    if (score >= THRESHOLDS.great) return 'great';
    if (score >= THRESHOLDS.good) return 'good';
    if (score >= THRESHOLDS.fair) return 'fair';
    return 'over';
  }

  function tierLabel(tier) {
    return { great: 'GREAT DEAL', good: 'GOOD DEAL', fair: 'FAIR DEAL', over: 'OVERPRICED', unknown: 'CAR DETECTED' }[tier] || 'CAR DETECTED';
  }

  function tierEmoji(tier) {
    return { great: '🔥', good: '👍', fair: '🤔', over: '⚠️', unknown: '🚗' }[tier] || '🚗';
  }

  function fmt(n) {
    if (n == null) return '—';
    return '$' + Number(n).toLocaleString('en-US');
  }

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  }

  /** Send message to service worker and return promise */
  function swMessage(msg) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, (resp) => resolve(resp || {}));
    });
  }

  /** Compute a local deal score when make/model/year/mileage are available */
  function localDealScore(listing, valuation) {
    if (!valuation || !valuation.estimated_value || !listing.price) return null;
    const diff = valuation.estimated_value - listing.price;
    const pct = (diff / valuation.estimated_value) * 100;
    // Map percentage savings to 0-100 score
    // 20%+ below market → 100, at market → 50, 20%+ above → 0
    const score = Math.round(Math.min(100, Math.max(0, 50 + pct * 2.5)));
    return score;
  }

  /* ------------------------------------------------------------------ */
  /*  Badge (feed / search result cards)                                 */
  /* ------------------------------------------------------------------ */

  function createBadge(listing, valuation) {
    const score = localDealScore(listing, valuation);
    const tier = valuation ? tierFromScore(score) : 'unknown';

    const badge = el('div', `csl-overlay csl-badge csl-badge--${tier}`);
    badge.innerHTML = `
      <span class="csl-badge-icon">${tierEmoji(tier)}</span>
      <span class="csl-badge-text">${tierLabel(tier)}</span>
      ${valuation ? `<span class="csl-badge-price">${fmt(valuation.estimated_value)}</span>` : ''}
      ${valuation ? `
        <div class="csl-badge-tooltip csl-overlay">
          <div class="csl-badge-tooltip-row"><span>Market Value</span><span>${fmt(valuation.estimated_value)}</span></div>
          <div class="csl-badge-tooltip-row"><span>Range</span><span>${fmt(valuation.low_value)} – ${fmt(valuation.high_value)}</span></div>
          <div class="csl-badge-tooltip-row"><span>Asking</span><span>${fmt(listing.price)}</span></div>
          ${score != null ? `<div class="csl-badge-tooltip-row"><span>Score</span><span>${score}/100</span></div>` : ''}
        </div>` : ''}
    `;
    return badge;
  }

  /* ------------------------------------------------------------------ */
  /*  Loading Badge (shown while fetching valuation)                     */
  /* ------------------------------------------------------------------ */

  function createLoadingBadge() {
    const badge = el('div', 'csl-overlay csl-badge csl-badge--unknown');
    badge.innerHTML = `<span class="csl-spinner"></span><span class="csl-badge-text">Analyzing…</span>`;
    return badge;
  }

  /* ------------------------------------------------------------------ */
  /*  Detail Panel (individual listing pages)                            */
  /* ------------------------------------------------------------------ */

  function createDetailPanel(listing, valuation) {
    const score = localDealScore(listing, valuation);
    const tier = valuation ? tierFromScore(score) : 'unknown';
    const savings = valuation && listing.price ? valuation.estimated_value - listing.price : null;
    const savingsPositive = savings != null && savings >= 0;

    const panel = el('div', 'csl-overlay csl-panel');
    panel.id = 'csl-detail-panel';

    panel.innerHTML = buildPanelHeader();

    if (!valuation) {
      panel.innerHTML += buildLoginPrompt();
    } else {
      panel.innerHTML += buildPanelBody(listing, valuation, score, tier, savings, savingsPositive);
    }

    return panel;
  }

  function buildPanelHeader() {
    return `
      <div class="csl-panel-header" data-csl-toggle>
        <div class="csl-panel-title">🚗 Car Sales Lister</div>
        <button class="csl-panel-close" data-csl-close>&times;</button>
      </div>`;
  }

  function buildLoginPrompt() {
    return `
      <div class="csl-panel-body">
        <div class="csl-login-prompt">
          <p>Log in to the Car Sales Lister extension to see deal analysis, market values, and add to your watchlist.</p>
          <button class="csl-btn csl-btn--primary" data-csl-open-popup>🔑 Open Extension</button>
        </div>
      </div>`;
  }

  /* ------------------------------------------------------------------ */
  /*  Enhanced feature helpers                                           */
  /* ------------------------------------------------------------------ */

  /** Generate KBB search URL for the vehicle */
  function generateKBBUrl(listing) {
    const make = (listing.make || '').toLowerCase().replace(/\s+/g, '-');
    const model = (listing.model || '').toLowerCase().replace(/\s+/g, '-');
    const year = listing.year || '';
    if (make && model && year) {
      return `https://www.kbb.com/${make}/${model}/${year}/`;
    }
    // Fallback to search
    const q = [listing.year, listing.make, listing.model].filter(Boolean).join('+');
    return `https://www.kbb.com/cars-for-sale/all/?keyword=${encodeURIComponent(q)}`;
  }

  /** Generate Edmunds URL */
  function generateEdmundsUrl(listing) {
    const make = (listing.make || '').toLowerCase().replace(/\s+/g, '-');
    const model = (listing.model || '').toLowerCase().replace(/\s+/g, '-');
    const year = listing.year || '';
    if (make && model && year) {
      return `https://www.edmunds.com/${make}/${model}/${year}/review/`;
    }
    const q = [listing.year, listing.make, listing.model].filter(Boolean).join(' ');
    return `https://www.edmunds.com/search/?keyword=${encodeURIComponent(q)}`;
  }

  /** Calculate fair offer price based on market data and deal score */
  function calculateFairOffer(listing, valuation, score) {
    if (!valuation || !valuation.estimated_value || !listing.price) return null;
    const market = valuation.estimated_value;
    const asking = listing.price;
    // If already a great deal, offer close to asking
    if (score >= 80) return Math.round(asking * 0.97);
    // If good deal, offer slightly below asking
    if (score >= 60) return Math.round(asking * 0.94);
    // If fair, aim for 90% of market
    if (score >= 40) return Math.round(Math.min(asking * 0.90, market * 0.92));
    // Overpriced: aim for market value or below
    return Math.round(Math.min(market * 0.90, asking * 0.82));
  }

  /** Estimate annual ownership costs based on vehicle category */
  function estimateOwnershipCosts(listing) {
    const make = (listing.make || '').toLowerCase();
    const year = listing.year || 2015;
    const age = new Date().getFullYear() - year;
    const price = listing.price || 15000;

    // Luxury / European tends to cost more
    const luxury = ['bmw','mercedes','audi','porsche','lexus','infiniti','acura',
      'genesis','maserati','land rover','jaguar','volvo','alfa romeo'].includes(make);
    const electric = ['tesla','rivian','lucid','polestar'].includes(make);

    const insurance = luxury ? 1800 : electric ? 1400 : 1200;
    const fuel = electric ? 600 : (luxury ? 2600 : 2000);
    const maintenance = luxury ? (800 + age * 120) : (500 + age * 80);
    const depreciation = Math.round(price * (age < 3 ? 0.15 : age < 7 ? 0.10 : 0.06));

    return { insurance, fuel, maintenance, depreciation, total: insurance + fuel + maintenance + depreciation };
  }

  /** Build clipboard text for the listing */
  function buildClipboardText(listing, valuation, score) {
    const lines = [];
    const ymm = [listing.year, listing.make, listing.model].filter(Boolean).join(' ');
    lines.push(`🚗 ${ymm || listing.title}`);
    if (listing.price) lines.push(`Asking: ${fmt(listing.price)}`);
    if (valuation) {
      lines.push(`Market Value: ${fmt(valuation.estimated_value)}`);
      lines.push(`Range: ${fmt(valuation.low_value)} – ${fmt(valuation.high_value)}`);
    }
    if (score != null) lines.push(`Deal Score: ${score}/100 (${tierLabel(tierFromScore(score))})`);
    if (listing.mileage) lines.push(`Mileage: ${listing.mileage.toLocaleString()} mi`);
    if (listing.condition) lines.push(`Condition: ${listing.condition}`);
    if (listing.vin) lines.push(`VIN: ${listing.vin}`);
    if (listing.url || listing.platform_url) lines.push(`Link: ${listing.url || listing.platform_url}`);
    lines.push(`\nAnalyzed by Car Sales Lister`);
    return lines.join('\n');
  }

  function buildPanelBody(listing, valuation, score, tier, savings, savingsPositive) {
    const yearMakeModel = [listing.year, listing.make, listing.model].filter(Boolean).join(' ');
    const metaParts = [listing.seller_location || listing.location, listing.mileage ? listing.mileage.toLocaleString() + ' mi' : null].filter(Boolean);
    const fairOffer = calculateFairOffer(listing, valuation, score);
    const kbbUrl = generateKBBUrl(listing);
    const edmundsUrl = generateEdmundsUrl(listing);
    const costs = estimateOwnershipCosts(listing);

    return `
      <div class="csl-panel-body">
        <div class="csl-vehicle-name">${yearMakeModel || listing.title}</div>
        ${metaParts.length ? `<div class="csl-vehicle-meta">📍 ${metaParts.join(' · ')}</div>` : ''}

        <div class="csl-price-row">
          <span class="csl-price-label">Asking Price</span>
          <span class="csl-price-value csl-price-asking">${fmt(listing.price)}</span>
        </div>
        <div class="csl-price-row">
          <span class="csl-price-label">Market Value</span>
          <span class="csl-price-value csl-price-market">
            <a href="${kbbUrl}" target="_blank" class="csl-link csl-link--inline" title="View on KBB">${fmt(valuation.estimated_value)}</a>
          </span>
        </div>
        <div class="csl-price-row">
          <span class="csl-price-label">Range</span>
          <span class="csl-price-range">${fmt(valuation.low_value)} – ${fmt(valuation.high_value)}</span>
        </div>

        <hr class="csl-divider">

        ${savings != null ? `
          <div class="csl-savings csl-savings--${savingsPositive ? 'positive' : 'negative'}">
            ${savingsPositive ? '💰' : '📈'} ${savingsPositive ? 'Save' : 'Over market by'} ${fmt(Math.abs(savings))}
          </div>` : ''}

        <div class="csl-score-section">
          <div class="csl-score-bar-track">
            <div class="csl-score-bar-fill csl-score-bar-fill--${tier}" style="width:${score || 0}%"></div>
          </div>
          <div class="csl-score-label">
            <span>${score != null ? score + '/100' : '—'}</span>
            <span class="csl-score-tag csl-score-tag--${tier}">${tierLabel(tier)}</span>
          </div>
        </div>

        <!-- Quick Action Links -->
        <div class="csl-quick-actions">
          <a href="${kbbUrl}" target="_blank" class="csl-action-link" title="View KBB Report">
            <span class="csl-action-icon">📊</span> KBB Report
          </a>
          <a href="${edmundsUrl}" target="_blank" class="csl-action-link" title="View Edmunds Review">
            <span class="csl-action-icon">📝</span> Edmunds
          </a>
          ${listing.vin ? `
            <a href="https://www.vehiclehistory.com/vin-report/${listing.vin}" target="_blank" class="csl-action-link" title="Free VIN Report">
              <span class="csl-action-icon">🔍</span> VIN Check
            </a>
            <a href="https://www.nhtsa.gov/recalls?vin=${listing.vin}" target="_blank" class="csl-action-link" title="Check NHTSA Recalls">
              <span class="csl-action-icon">⚠️</span> Recalls
            </a>
          ` : ''}
          <button class="csl-action-link" data-csl-copy title="Copy listing details to clipboard">
            <span class="csl-action-icon">📋</span> Copy
          </button>
        </div>

        <!-- Fair Offer Suggestion -->
        ${fairOffer ? `
        <div class="csl-expandable" data-csl-section="offer">
          <div class="csl-expandable-header">
            <span>💡 Negotiation Helper</span>
            <span class="csl-chevron">›</span>
          </div>
          <div class="csl-expandable-content">
            <div class="csl-offer-box">
              <div class="csl-offer-label">Suggested Offer</div>
              <div class="csl-offer-value">${fmt(fairOffer)}</div>
            </div>
            <p class="csl-hint">Based on market value, condition, and current deal quality. Start here and negotiate.</p>
            ${listing.price && fairOffer < listing.price ? `
              <div class="csl-offer-savings">That's ${fmt(listing.price - fairOffer)} below asking (${Math.round((1 - fairOffer / listing.price) * 100)}% discount)</div>
            ` : ''}
          </div>
        </div>` : ''}

        <!-- Cost of Ownership -->
        <div class="csl-expandable" data-csl-section="costs">
          <div class="csl-expandable-header">
            <span>💰 Est. Annual Costs</span>
            <span class="csl-chevron">›</span>
          </div>
          <div class="csl-expandable-content">
            <div class="csl-cost-row"><span>Insurance</span><span>~${fmt(costs.insurance)}/yr</span></div>
            <div class="csl-cost-row"><span>Fuel / Charging</span><span>~${fmt(costs.fuel)}/yr</span></div>
            <div class="csl-cost-row"><span>Maintenance</span><span>~${fmt(costs.maintenance)}/yr</span></div>
            <div class="csl-cost-row"><span>Depreciation</span><span>~${fmt(costs.depreciation)}/yr</span></div>
            <div class="csl-cost-row csl-cost-total"><span>Total</span><span>~${fmt(costs.total)}/yr</span></div>
            <p class="csl-hint">Estimates based on vehicle category and age. Actual costs vary by location and usage.</p>
          </div>
        </div>

        <!-- VIN-specific section -->
        ${listing.vin ? `
        <div class="csl-expandable" data-csl-section="vin">
          <div class="csl-expandable-header">
            <span>🔑 Vehicle History</span>
            <span class="csl-chevron">›</span>
          </div>
          <div class="csl-expandable-content">
            <div class="csl-vin-display">VIN: <code>${listing.vin}</code></div>
            <div class="csl-vin-links">
              <a href="https://www.vehiclehistory.com/vin-report/${listing.vin}" target="_blank" class="csl-link">Free History Report</a>
              <a href="https://www.nhtsa.gov/recalls?vin=${listing.vin}" target="_blank" class="csl-link">NHTSA Recalls</a>
              <a href="https://vincheck.info/check/vin-check.php?vin=${listing.vin}" target="_blank" class="csl-link">Theft/Salvage Check</a>
            </div>
          </div>
        </div>` : ''}

        <div class="csl-actions">
          <button class="csl-btn csl-btn--primary" data-csl-watchlist>＋ Watchlist</button>
          <button class="csl-btn csl-btn--secondary" data-csl-dashboard>📊 Dashboard</button>
        </div>
      </div>`;
  }

  /* ------------------------------------------------------------------ */
  /*  Panel event wiring                                                 */
  /* ------------------------------------------------------------------ */

  function attachPanelListeners(panel, listing, valuation, score) {
    // Toggle collapse
    const header = panel.querySelector('[data-csl-toggle]');
    if (header) header.addEventListener('click', () => panel.classList.toggle('csl-panel--collapsed'));

    // Close button
    const closeBtn = panel.querySelector('[data-csl-close]');
    if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); panel.remove(); });

    // Expandable sections
    panel.querySelectorAll('.csl-expandable-header').forEach(hdr => {
      hdr.addEventListener('click', (e) => {
        e.stopPropagation();
        const section = hdr.closest('.csl-expandable');
        section.classList.toggle('csl-expandable--open');
      });
    });

    // Copy details to clipboard
    const copyBtn = panel.querySelector('[data-csl-copy]');
    if (copyBtn) {
      copyBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const text = buildClipboardText(listing, valuation, score);
        try {
          await navigator.clipboard.writeText(text);
          const icon = copyBtn.querySelector('.csl-action-icon');
          const origHTML = copyBtn.innerHTML;
          copyBtn.innerHTML = '<span class="csl-action-icon">✓</span> Copied!';
          copyBtn.classList.add('csl-action-link--success');
          setTimeout(() => {
            copyBtn.innerHTML = origHTML;
            copyBtn.classList.remove('csl-action-link--success');
          }, 2000);
        } catch (_) {
          // Fallback for non-secure contexts
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
          copyBtn.innerHTML = '<span class="csl-action-icon">✓</span> Copied!';
          setTimeout(() => { copyBtn.innerHTML = '<span class="csl-action-icon">📋</span> Copy'; }, 2000);
        }
      });
    }

    // Add to Watchlist
    const watchBtn = panel.querySelector('[data-csl-watchlist]');
    if (watchBtn) {
      watchBtn.addEventListener('click', async () => {
        watchBtn.disabled = true;
        watchBtn.innerHTML = '<span class="csl-spinner"></span>';
        const resp = await swMessage({
          type: 'ADD_TO_WATCHLIST',
          data: {
            name: [listing.year, listing.make, listing.model].filter(Boolean).join(' ') || listing.title,
            criteria: {
              make: listing.make || null,
              model: listing.model || null,
              min_year: listing.year || null,
              max_year: listing.year || null,
              max_price: listing.price ? Math.round(listing.price * 1.1) : null,
            },
          },
        });
        if (resp.success) {
          watchBtn.classList.add('csl-btn--added');
          watchBtn.innerHTML = '✓ Added';
        } else {
          watchBtn.innerHTML = '✗ Failed';
          setTimeout(() => { watchBtn.innerHTML = '＋ Watchlist'; watchBtn.disabled = false; }, 2000);
        }
      });
    }

    // Open dashboard
    const dashBtn = panel.querySelector('[data-csl-dashboard]');
    if (dashBtn) {
      dashBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
      });
    }

    // Open popup (login prompt)
    const popupBtn = panel.querySelector('[data-csl-open-popup]');
    if (popupBtn) {
      popupBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  High-level helpers used by scout scripts                           */
  /* ------------------------------------------------------------------ */

  /**
   * Request a valuation from the service worker.
   * Returns { success, data: KbbValuation } or { success: false }.
   */
  async function requestValuation(listing) {
    if (!listing.make || !listing.model || !listing.year) return { success: false };
    return swMessage({
      type: 'GET_VALUATION',
      data: {
        make: listing.make,
        model: listing.model,
        year: listing.year,
        mileage: listing.mileage || 50000,
        condition: listing.condition || 'good',
        vin: listing.vin || null,
      },
    });
  }

  /**
   * Inject a deal badge on a listing card element.
   * Ensures the card has position:relative for absolute badge positioning.
   */
  async function injectBadge(cardEl, listing) {
    // Avoid double-injection
    if (cardEl.querySelector('.csl-badge')) return;

    // Ensure parent is positioned
    const pos = getComputedStyle(cardEl).position;
    if (pos === 'static') cardEl.style.position = 'relative';

    // Check auth first
    const authResp = await swMessage({ type: 'GET_AUTH_STATUS' });
    if (!authResp.isAuthenticated) {
      const badge = el('div', 'csl-overlay csl-badge csl-badge--login');
      badge.innerHTML = '<span class="csl-badge-icon">🚗</span><span class="csl-badge-text">Log in for deals</span>';
      badge.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); chrome.runtime.sendMessage({ type: 'OPEN_POPUP' }); });
      cardEl.appendChild(badge);
      return;
    }

    // Show loading state
    const loadBadge = createLoadingBadge();
    cardEl.appendChild(loadBadge);

    const valResp = await requestValuation(listing);
    loadBadge.remove();

    const valuation = valResp.success ? valResp.data : null;
    const badge = createBadge(listing, valuation);
    cardEl.appendChild(badge);
  }

  /**
   * Inject the detail analysis panel on an individual listing page.
   */
  async function injectDetailPanel(listing) {
    // Remove existing panel
    const existing = document.getElementById('csl-detail-panel');
    if (existing) existing.remove();

    const authResp = await swMessage({ type: 'GET_AUTH_STATUS' });
    if (!authResp.isAuthenticated) {
      const panel = createDetailPanel(listing, null);
      document.body.appendChild(panel);
      attachPanelListeners(panel, listing, null, null);
      return;
    }

    // Show loading panel
    const loadPanel = el('div', 'csl-overlay csl-panel');
    loadPanel.id = 'csl-detail-panel';
    loadPanel.innerHTML = buildPanelHeader() + `
      <div class="csl-panel-body" style="text-align:center;padding:24px;">
        <div class="csl-spinner" style="width:24px;height:24px;border-width:3px;"></div>
        <div style="margin-top:8px;font-size:12px;color:#94a3b8;">Analyzing listing…</div>
      </div>`;
    document.body.appendChild(loadPanel);

    const valResp = await requestValuation(listing);
    loadPanel.remove();

    const valuation = valResp.success ? valResp.data : null;
    const score = localDealScore(listing, valuation);
    const panel = createDetailPanel(listing, valuation);
    document.body.appendChild(panel);
    attachPanelListeners(panel, listing, valuation, score);
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  window.CarSalesOverlay = {
    injectBadge,
    injectDetailPanel,
    requestValuation,
    createBadge,
    createDetailPanel,
    localDealScore,
    tierFromScore,
  };

  console.log('[Car Sales Lister] Overlay UI module loaded');
})();
