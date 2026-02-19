/**
 * Facebook Marketplace Content Script
 * Extracts car listing data from Facebook Marketplace pages.
 *
 * Designed to handle Facebook's SPA architecture:
 * - Detects URL changes via polling (FB uses History API)
 * - Uses resilient, text-based DOM extraction (no fragile data-testid)
 * - Comprehensive debug logging prefixed [CSL-FB]
 * - Listens for SCAN_NOW messages from popup
 */

(function () {
  'use strict';

  const TAG = '[CSL-FB]';
  const DEBUG = true; // flip to false to silence verbose logs

  function log(...args) { if (DEBUG) console.log(TAG, ...args); }
  function warn(...args) { console.warn(TAG, ...args); }

  /* ================================================================ */
  /*  Car detection helpers                                           */
  /* ================================================================ */

  const CAR_KEYWORDS = [
    'car','truck','suv','sedan','coupe','van','vehicle','convertible',
    'hatchback','wagon','minivan','pickup','4x4','4wd','awd',
    'toyota','honda','ford','chevrolet','chevy','bmw','mercedes',
    'audi','nissan','hyundai','kia','subaru','volkswagen','vw',
    'mazda','jeep','ram','dodge','tesla','lexus','acura',
    'infiniti','volvo','porsche','buick','cadillac','chrysler',
    'gmc','lincoln','mitsubishi','genesis','rivian','lucid',
    'land rover','range rover','jaguar','alfa romeo','fiat',
    'mini','polestar','maserati','bentley','aston martin',
    'lamborghini','ferrari','mclaren','lotus',
  ];

  const MAKES = {
    toyota: ['camry','corolla','rav4','tacoma','highlander','4runner','tundra','prius','supra','sienna','avalon','venza','gr86','yaris','sequoia','land cruiser'],
    honda: ['civic','accord','cr-v','pilot','odyssey','hr-v','ridgeline','passport','fit','insight','element','s2000','prelude'],
    ford: ['f-150','f150','f-250','f250','f-350','f350','mustang','explorer','escape','bronco','ranger','edge','expedition','fusion','focus','maverick','lightning','gt'],
    chevrolet: ['silverado','equinox','malibu','tahoe','traverse','camaro','colorado','suburban','blazer','trax','corvette','impala','cruze','bolt','spark'],
    chevy: ['silverado','equinox','malibu','tahoe','traverse','camaro','colorado','suburban','blazer','trax','corvette','impala','cruze','bolt','spark'],
    bmw: ['3 series','5 series','7 series','x3','x5','x1','x7','m3','m4','m5','330i','530i','340i','m2','z4','i4','ix'],
    'mercedes-benz': ['c-class','e-class','s-class','glc','gle','gla','cla','a-class','g-class','amg','glb','gls','eqe','eqs'],
    mercedes: ['c-class','e-class','s-class','glc','gle','gla','cla','a-class','g-class','amg','glb','gls','c300','e350','c250','e400'],
    audi: ['a4','a6','a3','a5','a7','a8','q5','q7','q3','q8','e-tron','rs3','rs5','rs6','rs7','s4','s5','tt','r8'],
    nissan: ['altima','rogue','sentra','pathfinder','frontier','murano','maxima','kicks','versa','titan','370z','350z','leaf','armada','juke','gt-r'],
    hyundai: ['elantra','tucson','santa fe','sonata','kona','palisade','venue','ioniq','ioniq 5','ioniq 6','veloster','genesis','accent'],
    kia: ['forte','sportage','telluride','sorento','seltos','soul','k5','carnival','stinger','optima','rio','niro','ev6'],
    subaru: ['outback','forester','crosstrek','impreza','wrx','sti','ascent','legacy','brz','baja'],
    volkswagen: ['jetta','tiguan','atlas','golf','passat','taos','id.4','gti','gli','arteon','beetle','cc','touareg'],
    vw: ['jetta','tiguan','atlas','golf','passat','taos','id.4','gti','gli','arteon','beetle','cc','touareg'],
    mazda: ['mazda3','mazda6','cx-5','cx-30','cx-50','cx-9','cx-90','mx-5','miata','rx-7','rx-8','cx-3'],
    jeep: ['wrangler','grand cherokee','cherokee','compass','gladiator','renegade','wagoneer','liberty','patriot'],
    ram: ['1500','2500','3500','promaster'],
    dodge: ['charger','challenger','durango','hornet','viper','dart','journey','grand caravan'],
    tesla: ['model 3','model y','model s','model x','cybertruck','roadster'],
    lexus: ['rx','es','nx','is','gx','lx','ux','ls','lc','rc','ct'],
    acura: ['mdx','rdx','tlx','integra','tsx','tl','rsx','nsx','ilx'],
    infiniti: ['q50','q60','qx50','qx60','qx80','g37','g35','fx35'],
    volvo: ['xc90','xc60','xc40','s60','s90','v60','v90','c40','c30'],
    porsche: ['cayenne','macan','911','taycan','panamera','boxster','cayman','carrera','718','gt3','gt4','turbo'],
    buick: ['encore','envision','enclave','regal','lacrosse','verano'],
    cadillac: ['escalade','xt5','xt4','ct5','ct4','xt6','lyriq','ats','cts','srx','deville'],
    gmc: ['sierra','terrain','acadia','yukon','canyon','denali','envoy','savana'],
    lincoln: ['navigator','aviator','corsair','nautilus','mkz','mkc','mkx','continental','town car'],
    chrysler: ['pacifica','300','voyager','town and country','sebring','pt cruiser'],
    mitsubishi: ['outlander','eclipse cross','mirage','outlander sport','lancer','galant','montero'],
    genesis: ['g70','g80','g90','gv70','gv80','gv60'],
    'land rover': ['range rover','discovery','defender','evoque','velar','sport','freelander'],
    jaguar: ['f-pace','e-pace','xe','xf','xj','f-type','i-pace'],
    'alfa romeo': ['giulia','stelvio','4c','tonale'],
    fiat: ['500','500x','500l','spider','124'],
    mini: ['cooper','countryman','clubman','paceman','hardtop','convertible'],
    rivian: ['r1t','r1s'],
    lucid: ['air','gravity'],
    maserati: ['ghibli','levante','quattroporte','mc20','grecale'],
    polestar: ['polestar 2','polestar 3'],
  };

  function extractMakeModel(text) {
    if (!text) return { make: null, model: null };
    const lower = text.toLowerCase();
    for (const [make, models] of Object.entries(MAKES)) {
      if (lower.includes(make)) {
        for (const model of models) {
          if (lower.includes(model)) {
            const norm = make === 'chevy' ? 'chevrolet' : make === 'vw' ? 'volkswagen' : make;
            return { make: norm, model };
          }
        }
        const norm = make === 'chevy' ? 'chevrolet' : make === 'vw' ? 'volkswagen' : make;
        return { make: norm, model: null };
      }
    }
    return { make: null, model: null };
  }

  function isCarListing(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    if (/\b(19|20)\d{2}\b/.test(text)) return true;
    return CAR_KEYWORDS.some(kw => lower.includes(kw));
  }

  function extractPrice(text) {
    if (!text) return null;
    const m = text.match(/\$[\d,]+/);
    return m ? parseInt(m[0].replace(/[$,]/g, ''), 10) : null;
  }

  function extractYear(text) {
    if (!text) return null;
    const m = text.match(/\b(19|20)\d{2}\b/);
    return m ? parseInt(m[0], 10) : null;
  }

  function extractMileage(text) {
    if (!text) return null;
    const m = text.match(/([\d,]+)\s*(?:k\s*)?(?:miles?|mi\b)/i);
    if (!m) return null;
    let val = parseInt(m[1].replace(/,/g, ''), 10);
    if (val < 1000 && /k/i.test(m[0])) val *= 1000;
    return val;
  }

  function extractCondition(text) {
    if (!text) return null;
    const lower = text.toLowerCase();
    const conditions = ['excellent','good','fair','poor','salvage','new','like new'];
    return conditions.find(c => lower.includes(c)) || null;
  }

  /* ================================================================ */
  /*  Marketplace URL helpers                                         */
  /* ================================================================ */

  function isMarketplacePage() {
    return window.location.pathname.includes('/marketplace');
  }

  function isDetailPage() {
    return /\/marketplace\/item\/\d+/i.test(window.location.pathname);
  }

  function isFeedPage() {
    return isMarketplacePage() && !isDetailPage();
  }

  /* ================================================================ */
  /*  DOM extraction — detail page (resilient approach)               */
  /* ================================================================ */

  function extractDetailPageListing() {
    log('Attempting detail page extraction…');

    // Strategy: Gather ALL visible text spans and look for car-related content
    // Facebook wraps almost everything in <span dir="auto"> or plain <span>

    const allText = document.body.innerText || '';
    log('Page text length:', allText.length);

    // 1. Try to find a title — look for large text or the first heading-like element
    let title = null;

    // Try <h1> first (sometimes Facebook uses it)
    const h1 = document.querySelector('h1');
    if (h1) {
      title = h1.textContent?.trim();
      log('Found <h1>:', title);
    }

    // If no <h1>, look for prominent spans with larger text or heading role
    if (!title) {
      const headings = document.querySelectorAll('[role="heading"], [aria-level]');
      for (const h of headings) {
        const t = h.textContent?.trim();
        if (t && t.length > 5 && t.length < 200) {
          title = t;
          log('Found role=heading:', title);
          break;
        }
      }
    }

    // Fallback: look for spans that contain a year pattern + make keyword
    if (!title || !isCarListing(title)) {
      const spans = document.querySelectorAll('span[dir="auto"], span');
      for (const span of spans) {
        const t = span.textContent?.trim();
        if (t && t.length > 8 && t.length < 200 && isCarListing(t) && extractYear(t)) {
          title = t;
          log('Found car title from spans:', title);
          break;
        }
      }
    }

    if (!title) {
      log('No title found on detail page');
      return null;
    }

    if (!isCarListing(title)) {
      log('Title is not a car listing:', title);
      return null;
    }

    // 2. Extract price — look for $ pattern in prominent spans
    let price = null;
    const spans = document.querySelectorAll('span[dir="auto"], span');
    for (const span of spans) {
      const t = span.textContent?.trim();
      if (t && /^\$[\d,]+$/.test(t)) {
        price = extractPrice(t);
        if (price && price >= 100) {  // ignore very small amounts
          log('Found price:', price);
          break;
        }
      }
    }

    // Fallback: search all text for first price
    if (!price) {
      price = extractPrice(allText);
      log('Fallback price from full text:', price);
    }

    // 3. Extract description
    let description = null;
    // Look for the longest text block on the page that might be a description
    const textBlocks = document.querySelectorAll('span[dir="auto"]');
    let longestDesc = '';
    for (const span of textBlocks) {
      const t = span.textContent?.trim();
      if (t && t.length > longestDesc.length && t.length > 50 && t !== title) {
        longestDesc = t;
      }
    }
    if (longestDesc) description = longestDesc;

    // 4. Extract structured details from description + allText
    const combined = [title, description, allText].filter(Boolean).join(' ');
    const { make, model } = extractMakeModel(title + ' ' + (description || ''));
    const year = extractYear(title) || extractYear(combined);
    const mileage = extractMileage(combined);
    const condition = extractCondition(combined);

    // 5. Find location — look for "Listed in" or city, state patterns
    let location = null;
    const locMatch = allText.match(/(?:Listed in|Location[:\s]*)\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Z]{2})/);
    if (locMatch) location = locMatch[1];
    if (!location) {
      // General city, state pattern
      const cityState = allText.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Z]{2})\s/);
      if (cityState) location = cityState[1];
    }

    const listing = {
      platform: 'facebook',
      title,
      price,
      description,
      year,
      make,
      model,
      mileage,
      condition,
      seller_location: location,
      url: window.location.href,
      platform_id: window.location.href.match(/\/item\/(\d+)/)?.[1] || null,
      scraped_at: new Date().toISOString(),
    };

    log('Extracted detail listing:', listing);
    return listing;
  }

  /* ================================================================ */
  /*  DOM extraction — feed / search cards (resilient approach)       */
  /* ================================================================ */

  /**
   * Find listing cards on the feed page.
   * Facebook renders marketplace items as clickable link-card combos.
   * Strategy: find all <a> tags linking to /marketplace/item/ and treat
   * their nearest card-like ancestor as the card element.
   */
  function findFeedCards() {
    const links = document.querySelectorAll('a[href*="/marketplace/item/"]');
    const cardSet = new Set();
    const cards = [];

    for (const link of links) {
      // Walk up to find a reasonable card container
      // We want the highest-level element that's still a single card, not the entire feed
      let card = link;
      for (let i = 0; i < 8; i++) {
        if (!card.parentElement) break;
        const parent = card.parentElement;
        // Stop if the parent contains many marketplace links (it's the feed container)
        const childLinks = parent.querySelectorAll('a[href*="/marketplace/item/"]');
        if (childLinks.length > 1) break;
        card = parent;
      }

      // Deduplicate by element reference
      if (!cardSet.has(card)) {
        cardSet.add(card);
        cards.push({ card, link: link.href });
      }
    }

    return cards;
  }

  function extractListingFromCard(cardEl, linkHref) {
    try {
      // Collect all text from the card
      const textNodes = Array.from(cardEl.querySelectorAll('span[dir="auto"], span'))
        .map(s => s.textContent?.trim())
        .filter(Boolean);

      if (!textNodes.length) {
        log('Card has no text spans');
        return null;
      }

      // Deduplicate preserving order
      const seen = new Set();
      const texts = textNodes.filter(t => { if (seen.has(t)) return false; seen.add(t); return true; });

      // Find the most likely title: first text with a year or car keyword
      let title = null;
      let priceText = null;
      let locationText = null;

      for (const t of texts) {
        if (!title && isCarListing(t)) {
          title = t;
          continue;
        }
        if (!priceText && /^\$[\d,]+$/.test(t)) {
          priceText = t;
          continue;
        }
        if (!locationText && /^[A-Z][a-z]+.*,\s*[A-Z]{2}$/.test(t)) {
          locationText = t;
          continue;
        }
      }

      // If no title yet, just use the first non-price text
      if (!title) {
        title = texts.find(t => !/^\$/.test(t) && t.length > 3);
      }

      if (!title || !isCarListing(title)) return null;

      const img = cardEl.querySelector('img');
      const { make, model } = extractMakeModel(title);

      const listing = {
        platform: 'facebook',
        title,
        price: extractPrice(priceText || texts.find(t => /\$/.test(t))),
        year: extractYear(title),
        make,
        model,
        seller_location: locationText || null,
        images: img?.src ? [img.src] : [],
        url: linkHref || window.location.href,
        platform_id: linkHref ? linkHref.match(/\/item\/(\d+)/)?.[1] || null : null,
        scraped_at: new Date().toISOString(),
      };

      return listing;
    } catch (err) {
      warn('Error extracting card listing:', err);
      return null;
    }
  }

  /* ================================================================ */
  /*  Submit listing to service worker                                */
  /* ================================================================ */

  async function submitListing(listing) {
    if (!listing?.title) return;
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'LISTING_FOUND',
        listing,
      });
      if (response?.success) log('Listing submitted:', listing.title);
    } catch (err) {
      warn('Submit error:', err);
    }
  }

  /* ================================================================ */
  /*  Page scanning                                                    */
  /* ================================================================ */

  let scanInProgress = false;
  let detailPageProcessedUrl = null; // prevents infinite rescan on detail pages

  async function scanPage() {
    if (!isMarketplacePage()) {
      log('Not a marketplace page, skipping scan');
      return;
    }

    if (scanInProgress) {
      log('Scan already in progress, skipping');
      return;
    }
    scanInProgress = true;

    try {
      if (isDetailPage()) {
        // Skip if we already processed this exact URL
        if (detailPageProcessedUrl === window.location.href) {
          log('Detail page already processed, skipping');
          return;
        }
        log('Scanning detail page:', window.location.href);
        const listing = extractDetailPageListing();
        if (listing) {
          detailPageProcessedUrl = window.location.href;
          submitListing(listing);
          if (window.CarSalesOverlay) {
            window.CarSalesOverlay.injectDetailPanel(listing);
          }
        } else {
          log('No listing extracted from detail page');
        }
      } else if (isFeedPage()) {
        log('Scanning feed page:', window.location.href);
        const cardEntries = findFeedCards();
        log('Found', cardEntries.length, 'potential listing cards');

        let count = 0;
        for (const { card, link } of cardEntries) {
          if (card.dataset.cslScanned) continue;
          card.dataset.cslScanned = 'true';

          const listing = extractListingFromCard(card, link);
          if (listing) {
            count++;
            submitListing(listing);
            if (window.CarSalesOverlay) {
              window.CarSalesOverlay.injectBadge(card, listing);
            }
          }
        }
        log('Extracted', count, 'car listings from feed');
      }
    } catch (err) {
      warn('Scan error:', err);
    } finally {
      scanInProgress = false;
    }
  }

  /* ================================================================ */
  /*  SPA navigation detection                                        */
  /* ================================================================ */

  let lastUrl = window.location.href;
  let urlCheckInterval = null;

  function startUrlWatcher() {
    if (urlCheckInterval) return;
    urlCheckInterval = setInterval(() => {
      const current = window.location.href;
      if (current !== lastUrl) {
        log('URL changed:', lastUrl, '→', current);
        lastUrl = current;
        detailPageProcessedUrl = null; // allow new detail page to be processed
        // Small delay to let Facebook render new content
        setTimeout(scanPage, 1500);
      }
    }, 1000);
    log('URL watcher started');
  }

  /* ================================================================ */
  /*  MutationObserver for dynamically loaded content                  */
  /* ================================================================ */

  let mutationTimer = null;
  const observer = new MutationObserver((mutations) => {
    if (!isMarketplacePage()) return;
    // Skip if a detail page has already been processed (prevents infinite loop
    // where injectDetailPanel DOM changes re-trigger the observer)
    if (isDetailPage() && detailPageProcessedUrl === window.location.href) return;
    // Ignore mutations that only touch our own overlay elements
    const onlyOurs = mutations.every(m =>
      [...m.addedNodes, ...m.removedNodes].every(n =>
        n.nodeType === 1 && (n.classList?.contains('csl-overlay') || n.closest?.('.csl-overlay'))
      )
    );
    if (onlyOurs) return;
    clearTimeout(mutationTimer);
    mutationTimer = setTimeout(scanPage, 2000);
  });

  /* ================================================================ */
  /*  Message listener (for Scan Now from popup)                      */
  /* ================================================================ */

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SCAN_NOW') {
      log('Manual scan triggered from popup');
      detailPageProcessedUrl = null; // allow rescan
      // Reset scanned flags so we rescan everything
      document.querySelectorAll('[data-csl-scanned]').forEach(el => {
        delete el.dataset.cslScanned;
      });
      // Remove existing overlays so they refresh
      document.querySelectorAll('.csl-overlay').forEach(el => el.remove());
      scanPage();
      sendResponse({ success: true });
    }
    return false; // synchronous response
  });

  /* ================================================================ */
  /*  Bootstrap                                                        */
  /* ================================================================ */

  log('Facebook scout loaded on:', window.location.href);

  if (isMarketplacePage()) {
    log('Marketplace detected, starting initial scan in 2s…');
    setTimeout(scanPage, 2000); // give FB time to render
  } else {
    log('Not on marketplace yet, watching for SPA navigation…');
  }

  startUrlWatcher();
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

})();
