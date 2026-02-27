# Flip Score Engine — Development Guide

## Business Context

This app is being evolved from a general car deal-finder into a **professional car flipper's intelligence tool**, targeting the San Francisco Bay Area market. The owner's primary metric is **profit per day** — not raw profit margin. A $500 flip closed in 3 days ($167/day) beats a $3,000 flip that takes 30 days ($100/day).

**Constraints:**
- Flip capital: ≤ $10,000 per car
- Target buy price: $3,000 – $7,000 range (older, higher-mileage vehicles)
- API budget: < $20/month
- Location: San Francisco, CA (Bay Area labor rate: ~$165–$200/hr)
- Legal note: California allows up to 5 private-party vehicle sales/year before a dealer license is required

---

## Core Metric: The Flip Score

Replace the current "Deal Score" (consumer-oriented) with a **Flip Score** oriented around velocity and net profit.

```
Net Flip Profit = Retail Value − Ask Price − Estimated Recon Cost − Holding Cost
Flip Score      = Net Flip Profit ÷ Estimated Days to Sell
```

The Flip Score outputs a **$ per day** figure. Higher is better. This single number is the primary ranking signal shown in the overlay.

---

## Feature Roadmap

### Feature 1 — Repair Cost Estimator (OpenRouter, no new API cost)

**What:** Parse the listing description with Gemini Flash to identify any mentioned mechanical or cosmetic issues, then estimate repair costs using SF Bay Area labor rates.

**Where to build:** `backend/src/services/ai.service.ts` → new method `estimateRepairCosts()`

**Prompt structure:**
```
You are an auto repair cost estimator for San Francisco, CA.
Labor rate: $175/hour average.
Given this listing description, identify all mentioned issues and estimate repair costs.
Return JSON: { issues: [{ description, estimated_cost_low, estimated_cost_high, severity }], total_low, total_high }
Description: {listing.description}
```

**New type fields needed** in `backend/src/types/valuation.types.ts`:
```typescript
repair_estimate?: {
  issues: { description: string; cost_low: number; cost_high: number; severity: 'minor' | 'moderate' | 'major' }[];
  total_low: number;
  total_high: number;
}
```

**Backend route:** Add to the existing `POST /api/valuations/analyze` in `backend/src/routes/valuation.routes.ts` so repair data returns alongside the AI analysis.

**UI:** Add a collapsible "🔧 Repair Estimate" section in `extension/src/content/overlay-ui.js` → `buildPanelBody()`, following the same expandable pattern as "Est. Annual Costs". Show individual line items and a total range.

---

### Feature 2 — Resellability Score + Days-to-Sell (internal comps engine, free)

**What:** Estimate how quickly a specific make/model/year/price will sell in the SF market using listings already stored in Supabase. When a listing disappears from the scrape, treat it as a proxy "sold" signal.

**Database change:** Add a `sold_at` timestamp column and `days_on_market` integer to the `listings` table in Supabase.

**New service:** `backend/src/services/comps.service.ts`

Key method: `getResellabilityScore(make, model, year, price, mileage)`
- Query Supabase for recently sold comparable listings (same make/model ± 2 years, similar mileage band, within SF region)
- Calculate median days-on-market for those comps
- Return: `{ median_days_to_sell, comp_count, price_percentile, resellability_score (1–10) }`

**New backend route:** `GET /api/valuations/resellability` — accepts make, model, year, price, mileage as query params.

**UI:** Display in the overlay panel:
- "📈 Resellability: 8/10 — similar cars sell in ~6 days in SF"
- Feed `median_days_to_sell` into the Flip Score formula

---

### Feature 3 — Factorness Badges (OpenRouter, no new API cost)

**What:** Show 2–4 quick-scan badges on each listing for facts that matter to flippers — things that make a car easier to sell or explain its pricing.

**Where to build:** Add a `getVehicleFactors()` method to `backend/src/services/ai.service.ts`

**Prompt structure:**
```
Return a JSON array of up to 4 badges for a {year} {make} {model}.
Each badge: { icon, label, type: "positive"|"negative"|"neutral" }
Focus on: 0-60 time, MPG, reliability reputation, known issues, resale demand, cool factor.
Examples: { icon:"⚡", label:"0-60 in 5.4s", type:"positive" }, { icon:"⛽", label:"32 MPG", type:"positive" }
```

**UI:** Render badges as pill chips below the vehicle name in `buildPanelBody()`. Green for positive, red for negative, gray for neutral.

---

### Feature 4 — Real MPG via fueleconomy.gov (free API)

**What:** Replace the hardcoded `mpgByMake` table in `overlay-ui.js` with real EPA data by make/model/year.

**API:** `https://www.fueleconomy.gov/ws/rest/vehicle/menu/options?year={year}&make={make}&model={model}` (no key required)

**Where to build:** New service `backend/src/services/fuel-economy.service.ts`

**Cache strategy:** Store results in Supabase `fuel_economy_cache` table (keyed by year+make+model, TTL 30 days) to avoid repeated calls.

**Config:** No new env vars needed — public API.

**Usage:** Feed real MPG into both the fuel cost calculation in `estimateOwnershipCosts()` (overlay-ui.js) and into the Factorness badge prompt.

---

### Feature 5 — NHTSA Recalls + Complaints (free API)

**What:** Show open recall count and complaint volume for the specific make/model/year as red flags and negotiation leverage.

**APIs (both free, no key):**
- Recalls: `https://api.nhtsa.gov/recalls/recallsByVehicle?make={make}&model={model}&modelYear={year}`
- Complaints: `https://api.nhtsa.gov/complaints/complaintsByVehicle?make={make}&model={model}&modelYear={year}`

**New service:** `backend/src/services/nhtsa.service.ts`

**New backend route:** `GET /api/valuations/nhtsa` — returns recall count and top complaint categories.

**Config:** Add to `backend/src/config/config.ts`:
```typescript
NHTSA_API_URL: 'https://api.nhtsa.gov',
```

**UI:** Inject into the existing "red flags" section of the panel. If recall count > 0, add a prominent ⚠️ badge near the top of the panel.

---

### Feature 6 — Flip Score Display + Profit Calculator

**What:** A dedicated "💰 Flip Analysis" section in the overlay panel that shows the complete flipper's math.

**UI section layout:**
```
💰 Flip Analysis
─────────────────────────────
Est. Retail Value:     $7,200
Asking Price:         -$5,500
Est. Recon:           -$400–$800
Holding (14 days):    -$150
─────────────────────────────
Est. Net Profit:      $650–$1,050
Days to Sell:         ~8 days
Flip Score:           $81–$131 /day
```

**Holding cost formula:** Assume $10–$15/day for insurance + incidentals while holding.

**Where to build:** New function `buildFlipAnalysis(listing, valuation, repairEstimate, resellability)` in `overlay-ui.js`, called from `buildPanelBody()`.

---

## API Integration Summary

| Integration | Cost | New Files | Status |
|---|---|---|---|
| fueleconomy.gov | Free | `fuel-economy.service.ts` | Not started |
| NHTSA Recalls/Complaints | Free | `nhtsa.service.ts` | Not started |
| OpenRouter — Repair Estimator | $0 extra | Update `ai.service.ts` | Not started |
| OpenRouter — Factorness Badges | $0 extra | Update `ai.service.ts` | Not started |
| Internal Comps Engine | Free | `comps.service.ts` | Not started |
| VinAudit Market Value | ~$0.05/call | `vinaudit.service.ts` | Phase 2 |

---

## File Map (files this work touches)

| File | Change |
|---|---|
| `backend/src/services/ai.service.ts` | Add `estimateRepairCosts()`, `getVehicleFactors()` methods |
| `backend/src/services/comps.service.ts` | **New** — resellability + days-to-sell engine |
| `backend/src/services/fuel-economy.service.ts` | **New** — fueleconomy.gov integration |
| `backend/src/services/nhtsa.service.ts` | **New** — recalls and complaints |
| `backend/src/routes/valuation.routes.ts` | Add `/resellability` and `/nhtsa` routes |
| `backend/src/types/valuation.types.ts` | Add `repair_estimate`, `vehicle_factors`, `resellability` types |
| `backend/src/config/config.ts` | Add `NHTSA_API_URL` |
| `extension/src/content/overlay-ui.js` | Add Factorness badges, Repair Estimate section, Flip Analysis section |

---

## Build & Deploy Reference

- **Backend runtime:** Node.js, TypeScript — build with `npm run build` in `/backend`
- **Extension:** Plain JS (no build step) — reload at `chrome://extensions` after changes
- **Hosting:** Render (backend auto-deploys on push to main)
- **Database:** Supabase (project: `car-sales-lister`, ID: `ouhffpbplfozczimquhh`)
- **AI:** OpenRouter via OpenAI SDK — model configured as `google/gemini-flash-1.5` in `config.ts`

