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

    // Calculate flip $/day for the badge text
    let flipLabel = tierLabel(tier);
    let flipEmoji = tierEmoji(tier);
    if (valuation && valuation.estimated_value && listing.price) {
      const profit = valuation.estimated_value - listing.price;
      const daysToSell = 14; // conservative default for badge
      const holdingCost = 12 * daysToSell;
      const netProfit = profit - holdingCost;
      const perDay = Math.round(netProfit / daysToSell);
      if (perDay > 0) {
        flipLabel = `~${fmt(perDay)}/day`;
        flipEmoji = perDay >= 100 ? '🔥' : perDay >= 50 ? '👍' : '💰';
      } else {
        flipLabel = `${fmt(perDay)}/day`;
        flipEmoji = '⚠️';
      }
    }

    const badge = el('div', `csl-overlay csl-badge csl-badge--${tier}`);
    badge.innerHTML = `
      <span class="csl-badge-icon">${flipEmoji}</span>
      <span class="csl-badge-text">${flipLabel}</span>
      ${valuation ? `<span class="csl-badge-price">${fmt(valuation.estimated_value)}</span>` : ''}
      ${valuation ? `
        <div class="csl-badge-tooltip csl-overlay">
          <div class="csl-badge-tooltip-row"><span>Market Value</span><span>${fmt(valuation.estimated_value)}</span></div>
          <div class="csl-badge-tooltip-row"><span>Range</span><span>${fmt(valuation.low_value)} – ${fmt(valuation.high_value)}</span></div>
          <div class="csl-badge-tooltip-row"><span>Asking</span><span>${fmt(listing.price)}</span></div>
          ${score != null ? `<div class="csl-badge-tooltip-row"><span>Flip Score</span><span>${score}/100</span></div>` : ''}
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

  function createDetailPanel(listing, valuation, extras) {
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
      panel.innerHTML += buildPanelBody(listing, valuation, score, tier, savings, savingsPositive, extras);
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

  /** Generate Edmunds URL — link to the canonical vehicle overview page.
   *  Avoids /review/ (WAF-blocked) and /appraisal/ (404 for most vehicles). */
  function generateEdmundsUrl(listing) {
    const make = (listing.make || '').toLowerCase().replace(/\s+/g, '-');
    const model = (listing.model || '').toLowerCase().replace(/\s+/g, '-');
    const year = listing.year || '';
    if (make && model && year) {
      // The base /{make}/{model}/{year}/ page is the canonical Edmunds URL
      // that Google indexes — reliably accessible in real browsers.
      return `https://www.edmunds.com/${make}/${model}/${year}/`;
    }
    const q = [listing.year, listing.make, listing.model].filter(Boolean).join(' ');
    return `https://www.edmunds.com/appraisal/?keyword=${encodeURIComponent(q)}`;
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

  /**
   * Estimate annual ownership costs using real-world data by make/segment.
   * Sources: AAA annual driving cost studies, EPA fuel economy data,
   * RepairPal maintenance cost data, NHTSA/IIHS insurance data.
   */
  function estimateOwnershipCosts(listing, gasPricePerGallon, mpgCombined) {
    const make = (listing.make || '').toLowerCase();
    const model = (listing.model || '').toLowerCase();
    const year = listing.year || 2015;
    const age = new Date().getFullYear() - year;
    const price = listing.price || 15000;

    // --- Vehicle segment classification ---
    const isLuxury = ['bmw','mercedes','mercedes-benz','audi','porsche','lexus','infiniti',
      'acura','genesis','maserati','land rover','jaguar','volvo','alfa romeo',
      'cadillac','lincoln','bentley','rolls-royce','ferrari','lamborghini','aston martin'].includes(make);
    const isElectric = ['tesla','rivian','lucid','polestar'].includes(make) ||
      model.includes('electric') || model.includes('ev') || model.includes('bolt') ||
      model.includes('leaf') || model.includes('ioniq') || model.includes('mach-e');
    const isTruck = model.includes('f-150') || model.includes('silverado') || model.includes('sierra') ||
      model.includes('ram') || model.includes('tundra') || model.includes('tacoma') ||
      model.includes('frontier') || model.includes('colorado') || model.includes('ranger') ||
      model.includes('gladiator') || model.includes('titan');
    const isSUV = model.includes('suv') || model.includes('rav4') || model.includes('cr-v') ||
      model.includes('explorer') || model.includes('highlander') || model.includes('4runner') ||
      model.includes('tahoe') || model.includes('yukon') || model.includes('pilot') ||
      model.includes('pathfinder') || model.includes('wrangler') || model.includes('cherokee') ||
      model.includes('equinox') || model.includes('rogue') || model.includes('tucson') ||
      model.includes('santa fe') || model.includes('outback') || model.includes('forester') ||
      model.includes('cx-') || model.includes('tiguan') || model.includes('atlas');

    // --- INSURANCE (based on AAA 2024 data + vehicle value/age) ---
    // AAA avg: sedan $1,771, SUV $1,908, truck $1,750, EV $1,632, luxury $2,200+
    // Older/cheaper cars cost less to insure (lower comp/collision)
    let baseInsurance;
    if (isElectric) baseInsurance = 1630;
    else if (isLuxury) baseInsurance = 2200;
    else if (isTruck) baseInsurance = 1750;
    else if (isSUV) baseInsurance = 1910;
    else baseInsurance = 1770;
    // Adjust for vehicle value — cheaper cars cost less to insure
    const valueRatio = Math.min(price / 30000, 1.5);
    const insurance = Math.round(baseInsurance * (0.6 + 0.4 * valueRatio));

    // --- FUEL / CHARGING (based on EPA combined MPG by segment) ---
    // Assumes 12,000 mi/yr, gas at ~$3.80/gal (national avg 2024-2025)
    // Electricity at ~$0.16/kWh, EVs avg 3.5 mi/kWh
    const annualMiles = 12000;
    const gasPrice = gasPricePerGallon || 4.99;
    let fuel;
    if (isElectric) {
      // ~3.5 mi/kWh, $0.16/kWh → ~$549/yr
      fuel = Math.round((annualMiles / 3.5) * 0.16);
    } else {
      // Estimated combined MPG by make/segment
      const mpgByMake = {
        'toyota': 30, 'honda': 31, 'mazda': 29, 'hyundai': 30, 'kia': 29,
        'subaru': 27, 'nissan': 28, 'volkswagen': 28, 'mitsubishi': 27,
        'ford': 24, 'chevrolet': 24, 'gmc': 20, 'dodge': 22, 'ram': 18,
        'jeep': 21, 'chrysler': 24, 'buick': 26,
        'bmw': 25, 'mercedes-benz': 24, 'mercedes': 24, 'audi': 25,
        'lexus': 26, 'acura': 26, 'infiniti': 23, 'volvo': 26,
        'genesis': 25, 'cadillac': 22, 'lincoln': 22, 'land rover': 19,
        'jaguar': 23, 'porsche': 22, 'maserati': 18, 'alfa romeo': 24,
        'mini': 30, 'fiat': 31,
      };
      let mpg = mpgCombined || mpgByMake[make] || 25;
      // Trucks and large SUVs get worse MPG
      if (isTruck) mpg = Math.min(mpg, 20);
      else if (isSUV) mpg = Math.min(mpg, 25);
      // Older cars tend to get slightly worse MPG
      if (age > 10) mpg *= 0.92;
      else if (age > 5) mpg *= 0.96;
      fuel = Math.round((annualMiles / mpg) * gasPrice);
    }

    // --- MAINTENANCE (based on RepairPal data + age factor) ---
    // RepairPal annual avg by make (2024 data):
    const maintenanceByMake = {
      'toyota': 441, 'honda': 428, 'mazda': 462, 'hyundai': 468, 'kia': 474,
      'subaru': 617, 'nissan': 500, 'volkswagen': 676, 'mitsubishi': 535,
      'ford': 775, 'chevrolet': 649, 'gmc': 745, 'dodge': 634, 'ram': 691,
      'jeep': 634, 'chrysler': 591, 'buick': 608,
      'bmw': 968, 'mercedes-benz': 908, 'mercedes': 908, 'audi': 987,
      'lexus': 551, 'acura': 501, 'infiniti': 638, 'volvo': 769,
      'genesis': 580, 'cadillac': 783, 'lincoln': 879, 'land rover': 1174,
      'jaguar': 1123, 'porsche': 1192, 'maserati': 1400, 'alfa romeo': 1072,
      'mini': 846, 'fiat': 638, 'tesla': 410, 'rivian': 450, 'lucid': 500,
    };
    let baseMaint = maintenanceByMake[make] || 600;
    // Maintenance costs increase with age — roughly 5-8% per year after 5 years
    if (age > 5) {
      const extraYears = age - 5;
      const ageMultiplier = isLuxury ? 0.08 : 0.05;
      baseMaint *= (1 + extraYears * ageMultiplier);
    }
    // Cap maintenance at reasonable levels
    const maintenance = Math.round(Math.min(baseMaint, isLuxury ? 3500 : 2500));

    // --- DEPRECIATION (based on current value, not purchase price) ---
    // Use the asking price as proxy for current value
    // Newer cars depreciate faster; old cars barely depreciate
    let depRate;
    if (age <= 1) depRate = 0.20;
    else if (age <= 3) depRate = 0.15;
    else if (age <= 5) depRate = 0.12;
    else if (age <= 10) depRate = 0.08;
    else if (age <= 15) depRate = 0.04;
    else depRate = 0.02; // Very old cars barely lose value
    const depreciation = Math.round(price * depRate);

    const total = insurance + fuel + maintenance + depreciation;
    return { insurance, fuel, maintenance, depreciation, total, gasPrice };
  }

  /** Build factorness badge pills HTML */
  function buildFactorBadges(factors) {
    if (!factors || !factors.length) return '';
    const pills = factors.map(f => {
      const colorClass = f.type === 'positive' ? 'csl-factor--positive'
        : f.type === 'negative' ? 'csl-factor--negative'
        : 'csl-factor--neutral';
      return `<span class="csl-factor-pill ${colorClass}">${f.icon} ${f.label}</span>`;
    }).join('');
    return `<div class="csl-factor-badges">${pills}</div>`;
  }

  /** Build collapsible repair estimate section */
  function buildRepairEstimateSection(repairEstimate) {
    if (!repairEstimate || !repairEstimate.issues || repairEstimate.issues.length === 0) return '';
    const issueRows = repairEstimate.issues.map(i => {
      const sevClass = i.severity === 'major' ? 'csl-severity--major'
        : i.severity === 'moderate' ? 'csl-severity--moderate'
        : 'csl-severity--minor';
      return `<div class="csl-cost-row">
        <span><span class="csl-severity-dot ${sevClass}"></span>${i.description}</span>
        <span>${fmt(i.cost_low)} – ${fmt(i.cost_high)}</span>
      </div>`;
    }).join('');

    return `
      <div class="csl-expandable" data-csl-section="repair">
        <div class="csl-expandable-header">
          <span>🔧 Repair Estimate</span>
          <span class="csl-chevron">›</span>
        </div>
        <div class="csl-expandable-content">
          ${issueRows}
          <div class="csl-cost-row csl-cost-total">
            <span>Total Estimate</span>
            <span>${fmt(repairEstimate.total_low)} – ${fmt(repairEstimate.total_high)}</span>
          </div>
        </div>
      </div>`;
  }

  /** Build the Flip Analysis section showing profit calculation */
  function buildFlipAnalysis(listing, valuation, repairEstimate, resellability) {
    if (!valuation || !valuation.estimated_value || !listing.price) return '';

    const retailValue = valuation.estimated_value;
    const askPrice = listing.price;
    const reconLow = repairEstimate ? repairEstimate.total_low : 0;
    const reconHigh = repairEstimate ? repairEstimate.total_high : 0;
    const daysToSell = resellability ? resellability.median_days_to_sell : 14;
    const holdingCostPerDay = 12; // $10-$15/day avg
    const holdingCost = Math.round(holdingCostPerDay * daysToSell);

    const netProfitLow = retailValue - askPrice - reconHigh - holdingCost;
    const netProfitHigh = retailValue - askPrice - reconLow - holdingCost;
    const flipScoreLow = daysToSell > 0 ? Math.round(netProfitLow / daysToSell) : 0;
    const flipScoreHigh = daysToSell > 0 ? Math.round(netProfitHigh / daysToSell) : 0;

    const profitPositive = netProfitHigh > 0;

    return `
      <div class="csl-flip-analysis">
        <div class="csl-flip-title">💰 Flip Analysis</div>
        <div class="csl-flip-divider"></div>
        <div class="csl-flip-row"><span>Est. Retail Value:</span><span>${fmt(retailValue)}</span></div>
        <div class="csl-flip-row"><span>Asking Price:</span><span>-${fmt(askPrice)}</span></div>
        ${reconHigh > 0 ? `<div class="csl-flip-row"><span>Est. Recon:</span><span>-${fmt(reconLow)}–${fmt(reconHigh)}</span></div>` : ''}
        <div class="csl-flip-row"><span>Holding (${daysToSell} days):</span><span>-${fmt(holdingCost)}</span></div>
        <div class="csl-flip-divider"></div>
        <div class="csl-flip-row csl-flip-row--${profitPositive ? 'profit' : 'loss'}">
          <span>Est. Net Profit:</span>
          <span>${fmt(netProfitLow)}–${fmt(netProfitHigh)}</span>
        </div>
        <div class="csl-flip-row"><span>Days to Sell:</span><span>~${daysToSell} days</span></div>
        <div class="csl-flip-row csl-flip-score">
          <span>Flip Score:</span>
          <span>${fmt(flipScoreLow)}–${fmt(flipScoreHigh)} /day</span>
        </div>
      </div>`;
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

  function buildPanelBody(listing, valuation, score, tier, savings, savingsPositive, extras) {
    const yearMakeModel = [listing.year, listing.make, listing.model].filter(Boolean).join(' ');
    const metaParts = [listing.seller_location || listing.location, listing.mileage ? listing.mileage.toLocaleString() + ' mi' : null].filter(Boolean);
    const fairOffer = calculateFairOffer(listing, valuation, score);
    const kbbUrl = generateKBBUrl(listing);
    const edmundsUrl = generateEdmundsUrl(listing);
    const costs = estimateOwnershipCosts(listing, ex.gasPricePerGallon, ex.mpgCombined);
    const ex = extras || {};

    return `
      <div class="csl-panel-body">
        <div class="csl-vehicle-name">${yearMakeModel || listing.title}</div>
        ${buildFactorBadges(ex.vehicleFactors)}
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
            <div class="csl-cost-footnote" style="font-size:10px;color:#94a3b8;margin-top:-4px;padding-left:12px;">(~$${costs.gasPrice.toFixed(2)}/gal CA avg)</div>
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

        ${buildRepairEstimateSection(ex.repairEstimate)}

        ${ex.resellability ? `
        <div class="csl-resellability">
          📈 Resellability: ${ex.resellability.resellability_score}/10 — similar cars sell in ~${ex.resellability.median_days_to_sell} days in SF
          ${ex.resellability.comp_count > 0 ? `<span class="csl-comp-count">(${ex.resellability.comp_count} comps)</span>` : ''}
          ${ex.resellability.source === 'ai_estimate' ? '<span class="csl-ai-tag">AI Est.</span>' : ''}
        </div>` : ''}

        ${buildFlipAnalysis(listing, valuation, ex.repairEstimate, ex.resellability)}

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

    // Fetch valuation, gas price, and fuel economy in parallel
    const [valResp, gasPriceResp, fuelEconResp] = await Promise.all([
      requestValuation(listing),
      swMessage({ type: 'GET_GAS_PRICE' }),
      (listing.make && listing.model && listing.year)
        ? swMessage({ type: 'GET_FUEL_ECONOMY', data: { make: listing.make, model: listing.model, year: listing.year } })
        : Promise.resolve({ success: false }),
    ]);
    loadPanel.remove();

    const valuation = valResp.success ? valResp.data : null;
    const score = localDealScore(listing, valuation);

    // Build extras with live gas price and MPG
    const extras = {};
    if (gasPriceResp.success && gasPriceResp.data) {
      extras.gasPricePerGallon = gasPriceResp.data.price_per_gallon;
    }
    if (fuelEconResp.success && fuelEconResp.data) {
      extras.mpgCombined = fuelEconResp.data.mpg_combined;
    }

    const panel = createDetailPanel(listing, valuation, extras);
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
