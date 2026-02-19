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

  // Listen for SCAN_NOW from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SCAN_NOW') {
      console.log('[CSL-CL] Manual scan triggered from popup');
      document.querySelectorAll('[data-car-sales-scanned]').forEach(el => {
        delete el.dataset.carSalesScanned;
      });
      document.querySelectorAll('.csl-overlay').forEach(el => el.remove());
      scanPage();
      sendResponse({ success: true });
    }
    return false;
  });

  // Start
  console.log('[CSL-CL] Craigslist scout active');
  scanPage();

  // Observe for dynamic content
  const observer = new MutationObserver(() => {
    clearTimeout(observer._debounce);
    observer._debounce = setTimeout(scanPage, 1000);
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
