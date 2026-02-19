/**
 * Facebook Marketplace Content Script
 * Extracts car listing data from Facebook Marketplace pages
 */

(function() {
  'use strict';

  const SELECTORS = {
    // Facebook Marketplace listing selectors (subject to change)
    listingCards: '[data-testid="marketplace_feed_item"], [role="article"]',
    listingTitle: 'span[dir="auto"]',
    listingPrice: 'span[dir="auto"]',
    listingLocation: 'span[dir="auto"]',
    listingImage: 'img',
    detailPage: {
      title: 'h1, [data-testid="marketplace_pdp_title"]',
      price: '[data-testid="marketplace_pdp_price"], span[dir="auto"]',
      description: '[data-testid="marketplace_pdp_description"]',
      sellerName: '[data-testid="marketplace_pdp_seller_name"]',
      location: '[data-testid="marketplace_pdp_location"]',
      attributes: '[data-testid="marketplace_pdp_attribute"]',
    },
  };

  // Car-related keywords to filter automotive listings
  const CAR_KEYWORDS = [
    'car', 'truck', 'suv', 'sedan', 'coupe', 'van', 'vehicle',
    'toyota', 'honda', 'ford', 'chevrolet', 'chevy', 'bmw', 'mercedes',
    'audi', 'nissan', 'hyundai', 'kia', 'subaru', 'volkswagen', 'vw',
    'mazda', 'jeep', 'ram', 'dodge', 'tesla', 'lexus', 'acura',
    'infiniti', 'volvo', 'porsche', 'buick', 'cadillac', 'chrysler',
    'gmc', 'lincoln', 'mitsubishi',
  ];

  // Make-model mapping for extraction from titles
  const MAKES = {
    toyota: ['camry','corolla','rav4','tacoma','highlander','4runner','tundra','prius','supra','sienna','avalon'],
    honda: ['civic','accord','cr-v','pilot','odyssey','hr-v','ridgeline','passport','fit','insight'],
    ford: ['f-150','f150','mustang','explorer','escape','bronco','ranger','edge','expedition','fusion','focus','maverick'],
    chevrolet: ['silverado','equinox','malibu','tahoe','traverse','camaro','colorado','suburban','blazer','trax'],
    chevy: ['silverado','equinox','malibu','tahoe','traverse','camaro','colorado','suburban','blazer','trax'],
    bmw: ['3 series','5 series','x3','x5','x1','m3','m5','330i','530i','x7'],
    'mercedes-benz': ['c-class','e-class','glc','gle','a-class','s-class','gla','cla'],
    mercedes: ['c-class','e-class','glc','gle','a-class','s-class','gla','cla','c300','e350'],
    audi: ['a4','a6','q5','q7','a3','q3','a5','e-tron'],
    nissan: ['altima','rogue','sentra','pathfinder','frontier','murano','maxima','kicks','versa'],
    hyundai: ['elantra','tucson','santa fe','sonata','kona','palisade','venue','ioniq'],
    kia: ['forte','sportage','telluride','sorento','seltos','soul','k5','carnival'],
    subaru: ['outback','forester','crosstrek','impreza','wrx','ascent','legacy'],
    volkswagen: ['jetta','tiguan','atlas','golf','passat','taos','id.4'],
    vw: ['jetta','tiguan','atlas','golf','passat','taos','id.4'],
    mazda: ['mazda3','mazda6','cx-5','cx-30','cx-50','cx-9','mx-5','miata'],
    jeep: ['wrangler','grand cherokee','cherokee','compass','gladiator','renegade'],
    ram: ['1500','2500','3500'],
    dodge: ['charger','challenger','durango','hornet'],
    tesla: ['model 3','model y','model s','model x','cybertruck'],
    lexus: ['rx','es','nx','is','gx','lx','ux'],
    acura: ['mdx','rdx','tlx','integra'],
    volvo: ['xc90','xc60','xc40','s60','s90','v60'],
    porsche: ['cayenne','macan','911','taycan','panamera'],
    buick: ['encore','envision','enclave'],
    cadillac: ['escalade','xt5','xt4','ct5','ct4'],
    gmc: ['sierra','terrain','acadia','yukon','canyon'],
    lincoln: ['navigator','aviator','corsair','nautilus'],
    chrysler: ['pacifica','300'],
    mitsubishi: ['outlander','eclipse cross','mirage'],
  };

  /** Try to extract make and model from a title string */
  function extractMakeModel(title) {
    if (!title) return { make: null, model: null };
    const lower = title.toLowerCase();
    for (const [make, models] of Object.entries(MAKES)) {
      if (lower.includes(make)) {
        for (const model of models) {
          if (lower.includes(model)) {
            // Normalize make name
            const normalizedMake = make === 'chevy' ? 'chevrolet' : make === 'vw' ? 'volkswagen' : make;
            return { make: normalizedMake, model };
          }
        }
        const normalizedMake = make === 'chevy' ? 'chevrolet' : make === 'vw' ? 'volkswagen' : make;
        return { make: normalizedMake, model: null };
      }
    }
    return { make: null, model: null };
  }

  function isCarListing(title) {
    if (!title) return false;
    const lower = title.toLowerCase();
    // Check for year pattern (4 digits near start) - common in car listings
    if (/\b(19|20)\d{2}\b/.test(title)) return true;
    return CAR_KEYWORDS.some(keyword => lower.includes(keyword));
  }

  function extractPriceFromText(text) {
    if (!text) return null;
    const match = text.match(/\$[\d,]+/);
    if (match) return parseInt(match[0].replace(/[$,]/g, ''), 10);
    return null;
  }

  function extractYearFromText(text) {
    if (!text) return null;
    const match = text.match(/\b(19|20)\d{2}\b/);
    return match ? parseInt(match[0], 10) : null;
  }

  function extractListingFromCard(card) {
    try {
      const texts = Array.from(card.querySelectorAll('span[dir="auto"]')).map(el => el.textContent?.trim()).filter(Boolean);
      const img = card.querySelector('img');
      const link = card.closest('a')?.href || card.querySelector('a')?.href;

      if (!texts.length) return null;

      const title = texts[0] || '';
      if (!isCarListing(title)) return null;

      const price = texts.find(t => /^\$/.test(t));
      const location = texts.find(t => t.includes(',') && !t.includes('$') && t !== title);
      const { make, model } = extractMakeModel(title);

      return {
        platform: 'facebook',
        title,
        price: extractPriceFromText(price),
        year: extractYearFromText(title),
        make,
        model,
        seller_location: location || null,
        images: img?.src ? [img.src] : [],
        url: link || window.location.href,
        platform_id: link ? link.split('/item/')[1]?.split('/')[0] || null : null,
        scraped_at: new Date().toISOString(),
      };
    } catch (err) {
      console.error('[Car Sales Scout] Error extracting listing:', err);
      return null;
    }
  }

  function extractDetailPageListing() {
    try {
      const title = document.querySelector(SELECTORS.detailPage.title)?.textContent?.trim();
      const priceEl = document.querySelector(SELECTORS.detailPage.price);
      const descEl = document.querySelector(SELECTORS.detailPage.description);
      const sellerEl = document.querySelector(SELECTORS.detailPage.sellerName);
      const locationEl = document.querySelector(SELECTORS.detailPage.location);

      if (!title || !isCarListing(title)) return null;

      const { make, model } = extractMakeModel(title);
      const description = descEl?.textContent?.trim() || null;

      return {
        platform: 'facebook',
        title,
        price: extractPriceFromText(priceEl?.textContent),
        description,
        year: extractYearFromText(title),
        make,
        model,
        seller_name: sellerEl?.textContent?.trim() || null,
        seller_location: locationEl?.textContent?.trim() || null,
        url: window.location.href,
        platform_id: window.location.href.split('/item/')[1]?.split('/')[0] || null,
        scraped_at: new Date().toISOString(),
      };
    } catch (err) {
      console.error('[Car Sales Scout] Error extracting detail page:', err);
      return null;
    }
  }

  async function submitListing(listing) {
    if (!listing || !listing.title) return;
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'LISTING_FOUND',
        listing,
      });
      if (response?.success) {
        console.log('[Car Sales Scout] Listing submitted:', listing.title);
      }
    } catch (err) {
      console.error('[Car Sales Scout] Submit error:', err);
    }
  }

  // Scan page for car listings
  function scanPage() {
    // Detail page
    if (window.location.href.includes('/item/')) {
      const listing = extractDetailPageListing();
      if (listing) {
        submitListing(listing);
        // Inject deal analysis panel
        if (window.CarSalesOverlay) {
          window.CarSalesOverlay.injectDetailPanel(listing);
        }
      }
      return;
    }

    // Feed/search page
    const cards = document.querySelectorAll(SELECTORS.listingCards);
    cards.forEach(card => {
      if (card.dataset.carSalesScanned) return;
      card.dataset.carSalesScanned = 'true';

      const listing = extractListingFromCard(card);
      if (listing) {
        submitListing(listing);
        // Inject deal badge on the card
        if (window.CarSalesOverlay) {
          window.CarSalesOverlay.injectBadge(card, listing);
        }
      }
    });
  }

  // Observe DOM for dynamically loaded listings
  const observer = new MutationObserver(() => {
    clearTimeout(observer._debounce);
    observer._debounce = setTimeout(scanPage, 1000);
  });

  // Start
  console.log('[Car Sales Scout] Facebook Marketplace scout active');
  scanPage();
  observer.observe(document.body, { childList: true, subtree: true });
})();
