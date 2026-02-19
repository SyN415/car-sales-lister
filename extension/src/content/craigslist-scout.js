/**
 * Craigslist Content Script
 * Extracts car listing data from Craigslist pages
 */

(function() {
  'use strict';

  const SELECTORS = {
    // Search results page
    resultRows: '.result-row, .cl-search-result, li.cl-static-search-result',
    resultTitle: '.result-title, .titlestring, a.posting-title .label',
    resultPrice: '.result-price, .priceinfo',
    resultMeta: '.result-meta, .meta',
    resultImage: 'img',
    resultLink: 'a.result-title, a.titlestring, a.posting-title',

    // Detail page
    detailTitle: '#titletextonly, .postingtitletext',
    detailPrice: '.price, .postingtitletext .price',
    detailBody: '#postingbody',
    detailAttrs: '.attrgroup',
    detailLocation: '.postingtitletext small',
    detailImages: '#thumbs a, .gallery img, .swipe img',
  };

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

  function extractMileageFromText(text) {
    if (!text) return null;
    const match = text.match(/(\d[\d,]*)\s*(?:miles?|mi\b|k\s*miles?)/i);
    if (match) {
      let val = parseInt(match[1].replace(/,/g, ''), 10);
      if (/k\s*miles?/i.test(match[0])) val *= 1000;
      return val;
    }
    return null;
  }

  function extractConditionFromText(text) {
    if (!text) return null;
    const lower = text.toLowerCase();
    if (lower.includes('excellent')) return 'excellent';
    if (lower.includes('good')) return 'good';
    if (lower.includes('fair')) return 'fair';
    if (lower.includes('poor') || lower.includes('rough')) return 'poor';
    if (lower.includes('salvage')) return 'salvage';
    return null;
  }

  function extractVinFromText(text) {
    if (!text) return null;
    // VIN is 17 chars, alphanumeric excluding I, O, Q
    const match = text.match(/\b[A-HJ-NPR-Z0-9]{17}\b/i);
    return match ? match[0].toUpperCase() : null;
  }

  function extractListingFromResult(row) {
    try {
      const titleEl = row.querySelector(SELECTORS.resultTitle);
      const priceEl = row.querySelector(SELECTORS.resultPrice);
      const linkEl = row.querySelector(SELECTORS.resultLink) || row.querySelector('a');
      const imgEl = row.querySelector(SELECTORS.resultImage);

      const title = titleEl?.textContent?.trim();
      if (!title) return null;

      const url = linkEl?.href || null;
      const { make, model } = extractMakeModel(title);

      return {
        platform: 'craigslist',
        title,
        price: extractPriceFromText(priceEl?.textContent),
        year: extractYearFromText(title),
        make,
        model,
        images: imgEl?.src ? [imgEl.src] : [],
        url,
        platform_id: url ? url.split('/').filter(Boolean).pop()?.replace('.html', '') : null,
        scraped_at: new Date().toISOString(),
      };
    } catch (err) {
      console.error('[Car Sales Scout] Error extracting result:', err);
      return null;
    }
  }

  function extractDetailPageListing() {
    try {
      const titleEl = document.querySelector(SELECTORS.detailTitle);
      const priceEl = document.querySelector(SELECTORS.detailPrice);
      const bodyEl = document.querySelector(SELECTORS.detailBody);
      const locationEl = document.querySelector(SELECTORS.detailLocation);

      const title = titleEl?.textContent?.trim();
      if (!title) return null;

      const description = bodyEl?.textContent?.trim() || null;

      // Extract attributes from attribute groups
      const attrGroups = document.querySelectorAll(SELECTORS.detailAttrs);
      const attrs = {};
      attrGroups.forEach(group => {
        const spans = group.querySelectorAll('span');
        spans.forEach(span => {
          const text = span.textContent?.trim();
          if (!text) return;
          const parts = text.split(':');
          if (parts.length === 2) {
            attrs[parts[0].trim().toLowerCase()] = parts[1].trim();
          }
        });
      });

      // Extract images
      const imageEls = document.querySelectorAll(SELECTORS.detailImages);
      const images = Array.from(imageEls)
        .map(el => el.href || el.src)
        .filter(Boolean)
        .map(url => url.replace(/\/50x50c\//, '/600x450/'));

      const { make, model } = extractMakeModel(title);

      return {
        platform: 'craigslist',
        title,
        price: extractPriceFromText(priceEl?.textContent),
        description,
        year: extractYearFromText(title) || (attrs.year ? parseInt(attrs.year) : null),
        make,
        model,
        mileage: extractMileageFromText(description) || (attrs.odometer ? parseInt(attrs.odometer.replace(/,/g, '')) : null),
        condition: extractConditionFromText(attrs.condition || description),
        vin: attrs.vin || extractVinFromText(description),
        transmission: attrs.transmission || null,
        fuel_type: attrs['fuel'] || attrs['fuel type'] || null,
        drive_type: attrs['drive'] || null,
        color: attrs['paint color'] || attrs.color || null,
        body_type: attrs['type'] || attrs['body type'] || null,
        seller_location: locationEl?.textContent?.trim()?.replace(/[()]/g, '') || null,
        images,
        url: window.location.href,
        platform_id: window.location.href.split('/').filter(Boolean).pop()?.replace('.html', '') || null,
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

  function scanPage() {
    // Detail page - check if URL looks like a posting
    if (/\/\d+\.html$/.test(window.location.pathname)) {
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

    // Search results page
    const isCarsSection = window.location.href.includes('/cta/') ||
      window.location.href.includes('/cto/') ||
      window.location.href.includes('/search/cta') ||
      window.location.href.includes('/search/cto') ||
      window.location.href.includes('auto');

    if (!isCarsSection) return;

    const rows = document.querySelectorAll(SELECTORS.resultRows);
    rows.forEach(row => {
      if (row.dataset.carSalesScanned) return;
      row.dataset.carSalesScanned = 'true';

      const listing = extractListingFromResult(row);
      if (listing) {
        submitListing(listing);
        // Inject deal badge on the row
        if (window.CarSalesOverlay) {
          window.CarSalesOverlay.injectBadge(row, listing);
        }
      }
    });
  }

  // Start
  console.log('[Car Sales Scout] Craigslist scout active');
  scanPage();

  // Observe for dynamic content
  const observer = new MutationObserver(() => {
    clearTimeout(observer._debounce);
    observer._debounce = setTimeout(scanPage, 1000);
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
