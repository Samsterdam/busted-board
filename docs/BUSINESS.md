# Busted Board — Business Feasibility Analysis

**Last updated: 2026-06-22. Verified claims sourced from 28 primary/secondary sources via 111-agent deep research pass. Claims marked `[3-0]` were unanimously confirmed; `[2-1]` passed with one dissent; `[est]` are estimates not confirmed in this research run.**

---

## 1. Business Formation

### Recommendation: Home-state LLC first, defer Delaware

| Entity | Year 1 Cost | Ongoing/yr | When to Use |
| -------- | ------------ | ----------- | ------------- |
| Sole proprietor | $0 | $0 | Pre-revenue only. No liability shield, hard to open business bank account. |
| **Home-state LLC** | **$130–200** | **$25–50** | **Recommended now.** Cheapest path with liability protection + business bank account. |
| Delaware LLC | ~$440–540 | $350–450 | Only if out-of-state investors are in the picture. Adds registered agent ($50–150/yr) + $300/yr franchise tax for no benefit at this stage. |
| Delaware C-Corp | ~$500–700 | $400–500 | Only if actively seeking venture capital. Premature otherwise. |

**Line items for home-state LLC:**
- State filing fee: ~$130–200 one-time `[est]`
- EIN from IRS: **$0** (online, 5 minutes)
- Annual report/renewal: $25–50/yr `[est]`
- Business bank account: $0–$15/mo (Mercury or Relay are free for LLCs)
- **Total year 1: ~$130–200**

---

## 2. Infrastructure Costs by Scale Tier

### Critical: Vercel Hobby is not legal for commercial use

Vercel's TOS defines commercial use as "any deployment used for the purpose of financial gain." Busted Board has Stripe subscriptions → **Vercel Pro ($20/mo) is required from day one.** `[3-0]`

> **2026-06-22 update:** Launch is free-first (beta) with Stripe deferred. During beta with no payment processing, the Hobby plan is used and the $20/mo Vercel line is $0. Pro becomes mandatory the moment Stripe goes live. All tier tables below show the steady-state cost once monetization is enabled.

### Tier 1: 100 MAU (Launch)

| Service | Plan | Monthly Cost |
| --------- | ------ | ------------- |
| Vercel | Pro (required; Hobby during beta) | $20.00 |
| Neon PostgreSQL | Free (0.5 GB, 100 CU-hr/mo) | $0 |
| Upstash Redis | PAYG (~500K cmds/mo) | ~$1.00 |
| Gemini 2.5 Flash-Lite *(current — switched session 31)* | ~1,000 calls × 4K tok avg | ~$0.05 |
| TMDB API | Free tier | $0 |
| **Total infra** | | **~$21/mo** *(~$1/mo during beta without Vercel Pro)* |

### Tier 2: 1,000 MAU

| Service | Plan | Monthly Cost |
| --------- | ------ | ------------- |
| Vercel | Pro | $20.00 |
| Neon | Launch ($0.106/CU-hr + $0.35/GB-mo) | ~$5 |
| Upstash Redis | ~1M commands/mo | ~$2 |
| Gemini 2.5 Flash-Lite *(current — switched session 31)* | ~9,000 calls/mo | ~$0.50–1 |
| TMDB API | Free | $0 |
| **Total infra** | | **~$28/mo** |

### Tier 3: 10,000 MAU

| Service | Plan | Monthly Cost |
| --------- | ------ | ------------- |
| Vercel | Pro (may hit overage) | ~$20–40 |
| Neon | Launch | ~$15–20 |
| Upstash Redis | ~10M commands/mo | ~$20 |
| Gemini 2.5 Flash-Lite *(current — switched session 31)* | ~90K calls/mo | ~$5–8 |
| TMDB API | Free | $0 |
| **Total infra** | | **~$60–90/mo** |

### Gemini call volume assumptions

**Two production surfaces call Gemini:**

1. **Feed ranking (`rankRecommendations`)** — dominant. Called once per page-1 feed load when the 12-hour DB cache is cold. Effectively 1 call/user/day for daily-active users. `buildMoreFeed` (pages 2+) skips Gemini entirely.
2. **Taste profile generation (`generateTasteProfile`)** — user-initiated, 5-min cooldown. Negligible at any scale (once per user at setup).
3. **Growth draft chat** — admin-only, negligible.

**Per-call token cost:** ~30 candidates × ~100 tokens + taste profile + prompt overhead ≈ **4K tokens/call** (3.5K input + ~500 output).

**DAU/MAU assumption: 30%.** Call volumes use 30% DAU/MAU. The 12-hour feed cache means each daily user generates at most 1 Gemini call/day. Upper-bound scenario (100% DAU/MAU, every user visits every 12 hours exactly): multiply by 3.3×.

| MAU | DAU (30%) | Calls/day | Calls/month |
| ----- | ----------- | ----------- | ------------- |
| 100 | 30 | ~33 | ~1,000 |
| 1,000 | 300 | ~330 | ~9,000 |
| 10,000 | 3,000 | ~3,300 | ~90,000 |

### Gemini API quota tiers

**Gemini 2.5 Flash free tier** has three relevant limits (verify current values at [ai.google.dev/gemini-api/docs/rate-limits](https://ai.google.dev/gemini-api/docs/rate-limits)):

| Limit | Free | Paid |
| ------- | ------ | ------ |
| RPM | 15 | 2,000 |
| TPM | 1M | 4M |
| RPD | ~500–1,500 | none |

**RPD is the first constraint to hit**, not RPM — at normal traffic distribution, burst RPM stays comfortably under 15 until ~5K+ MAU.

| MAU | Calls/day | Free RPD OK? | Free RPM OK? |
| ----- | ----------- | ------------- | ------------- |
| 100 | ~33 | ✓ | ✓ |
| 500 | ~165 | ✓ (borderline if RPD=500) | ✓ |
| 1,000 | ~330 | **Watch closely** | ✓ |
| 2,000 | ~660 | ✗ | ✓ |
| 10,000 | ~3,300 | ✗ | **Needs paid** |

~~**Action: move to a paid Google AI Studio API key before any marketing push**~~ **Done ✓ (2026-06-22, session 33)** — Paid 1 tier activated, $25 credit loaded. Paid tier eliminates RPD, raises RPM to 2,000, and costs nothing extra — you pay only per-token. At 1K MAU that is ~$0.50–1/month on Flash-Lite.

### Vendor pricing — confirmed sources

- **Neon Free:** 0.5 GB, 100 CU-hr/mo (doubled from 50 in Oct 2025). `[3-0]` [Source](https://neon.com/docs/introduction/plans)
- **Neon Launch:** $0.106/CU-hr, $0.35/GB-mo, no monthly minimum. `[3-0]`
- **Upstash Redis PAYG:** $0.20/100K commands; first 1 GB storage free; 200 GB bandwidth free. `[3-0]` [Source](https://upstash.com/docs/redis/overall/pricing)
- **Gemini 2.5 Flash-Lite:** $0.10/1M input tokens, $0.40/1M output tokens (standard tier). Batch/Flex: $0.05/$0.20. `[3-0]` [Source](https://ai.google.dev/gemini-api/docs/pricing)
- **Gemini 2.5 Flash (standard, replaced by Flash-Lite in session 31):** $0.30/1M input, $2.50/1M output — output rate **includes thinking tokens**, so a reasoning-chain call costs 2–4× the headline rate. Our calls do not use thinking mode, so effective output cost is lower; exact non-thinking rate: verify at source. `[2-1]`

---

## 3. Stripe Transaction Economics

Stripe standard rate `[est — industry standard, not confirmed in this research run]`: 2.9% + $0.30 per transaction.

The $0.30 flat fee is disproportionately large at low price points:

| Plan | Gross/Subscriber | Stripe Fee | Net/Subscriber | Stripe Take-Rate |
| ------ | ----------------- | ----------- | --------------- | ----------------- |
| Monthly ($3/mo) | $3.00 | $0.387 | **$2.61** | 13% |
| Annual ($25/yr) | $25.00 | $1.025 | **$23.98** | 4.1% |

**The annual plan is 3× more efficient through Stripe. Push it hard.**

---

## 4. Conversion & Retention Benchmarks

### Free-to-paid conversion

| Percentile | Rate | Source |
| ------------ | ------ | -------- |
| Bottom 25% | < 2.5% | ChartMogul Jan 2026, n=200 `[3-0]` |
| 50th percentile ("good") | 3–5% | ChartMogul Jan 2026 `[3-0]` |
| 75th percentile ("great") | 8–12% | ChartMogul Jan 2026 |

**Critical caveat:** ChartMogul's sample is predominantly **B2B** SaaS. B2C entertainment (Busted Board's actual category) realistically converts at **1–3%** due to abundant free alternatives and discretionary spend. The 3% planning assumption is the **optimistic ceiling for B2C, not the median.** Model 1–2% as base case.

[Source: ChartMogul SaaS Conversion Report](https://chartmogul.com/reports/saas-conversion-report/)

### Year-1 Retention by Plan Type

| Plan | Year-1 Retention | Monthly Churn Implied |
| ------ | ----------------- | ---------------------- |
| Monthly | 17% | ~14%/mo |
| Annual | 44.1% | ~56% annual churn |

Source: RevenueCat 2025 State of Subscription Apps `[3-0]` [Source](https://www.revenuecat.com/state-of-subscription-apps-2025/)

> Annual plans retain **2.6× more subscribers** after year 1. An 83% annual churn on monthly plans means most subscribers leave before covering your CAC.

### LTV by Plan

**Monthly subscriber LTV:**
- Avg months before churn: 1 / 0.14 ≈ 7.1 months
- LTV = 7.1 × $2.61 = **~$18.50**

**Annual subscriber LTV** (geometric series, 44.1% annual renewal):
- LTV = $23.98 / (1 − 0.441) = **~$42.89**

Annual LTV is **2.3× higher** than monthly. This is the most important number in the model.

---

## 5. Full P&L by Scale Tier

**Assumptions:** 3% conversion (optimistic/B2B) and 1% (B2C reality); all monthly subscribers; Amazon Associates excluded (see section 7).

| Scenario | Gross Revenue | Stripe Fees | Net Revenue | Infra Costs | **Net Monthly** |
| ---------- | -------------- | ------------ | ------------ | ------------ | ---------------- |
| 100 MAU, 3 paid (3%) | $9 | −$1.16 | $7.84 | −$21 | **−$13.16 (loss)** |
| 100 MAU, 1 paid (1%) | $3 | −$0.39 | $2.61 | −$21 | **−$18.39 (loss)** |
| 1,000 MAU, 30 paid (3%) | $90 | −$11.61 | $78.39 | −$27 | **+$51.39 (+68% margin)** |
| 1,000 MAU, 10 paid (1%) | $30 | −$3.87 | $26.13 | −$27 | **−$0.87 (near break-even)** |
| 10,000 MAU, 300 paid (3%) | $900 | −$116.10 | $783.90 | −$70 | **+$713.90 (+91% margin)** |
| 10,000 MAU, 100 paid (1%) | $300 | −$38.70 | $261.30 | −$70 | **+$191.30 (+73% margin)** |

**10,000 MAU annualized:**
- 3% conversion: **~$8,567/yr**
- 1% conversion: **~$2,296/yr**

> **Ad revenue not included above** — see Section 8 for display advertising estimates. At 10K MAU, AdSense alone adds ~$194/mo; Mediavine Journey adds ~$1,455–$3,880/mo on top of these figures.

---

## 6. Break-Even Analysis

**Minimum fixed cost: $20/mo (Vercel Pro)**

Monthly subscribers at net $2.61:
- Break-even = $20 / $2.61 = **8 paying subscribers**

MAU required to reach 8 subscribers:
- At 3% conversion: **~267 MAU** (achievable from a single Reddit post)
- At 1% conversion: **~800 MAU** (1–2 months of SEO traction)

Annual subscribers at net $23.98/yr ($2.00/mo amortized):
- Break-even = **10 annual subscribers ever**
- At 3% conversion: ~333 MAU total to have covered all infra costs

**The break-even bar is extremely low. 8 paying monthly subscribers covers all infrastructure costs.**

---

## 7. Amazon Associates — Don't Model It Yet

The deep research pass could not verify Prime Video affiliate commission rates. What is publicly known:
- Amazon's **digital category pays 0% commission** on streaming purchases and rentals (cut to 0% in 2020)
- **Prime membership bounties pay ~$3–5 per new Prime sign-up** — but only for users who aren't already Prime members. Target audience (cord-cutters with Prime) almost entirely excludes this conversion
- Physical product referrals pay 1–4.5% — not applicable

**Conservative model: $0–5/mo affiliate revenue at 1,000 MAU.** Treat as upside until you have 3 months of real clickthrough → purchase data in the Associates dashboard. The $2/yr average commission per active user used in early planning is unverified and should not be load-bearing.

---

## 8. Site Advertising Revenue

Showing ads to free users (hidden from paid subscribers) is a standard freemium lever. At low MAU it adds pennies; by 10K MAU it becomes a material revenue line that can match or exceed subscription income at realistic conversion rates.

### Ad Network Landscape (as of Q1 2026)

The network landscape shifted significantly in late 2025 and early 2026:

| Network | Minimum Requirement | RPM Range (entertainment, US/Tier 1 traffic) | Verdict |
| --------- | -------------------- | -------------------------------------------- | --------- |
| **Google AdSense** | None formal; practical approval requires established audience | $1–$5 | Entry point — viable from day 1 `[3-0]` |
| **Mediavine Journey** | 1,000 sessions/mo (cut from 10,000 in Oct 2025) | $15–$40+ | Step-up option once ~500+ MAU `[3-0]` |
| **Raptive** | 25,000 pageviews/mo + 50% Tier 1 traffic (cut from 100,000 in Oct 2025) | $13–$15 baseline; $47+ in favorable/Q4 conditions | Target at ~3,000–5,000 MAU `[3-0]` |
| **Ezoic** | 250,000 monthly users (raised Feb 2026) | $5–$15 | **Not viable at this scale** `[2-1]` |

> Ezoic's February 2026 policy change effectively removed it from the small-publisher market. Mediavine Journey and Raptive both lowered their bars — the realistic progression is AdSense → Mediavine Journey → Raptive as traffic grows.

### Pageview Assumption

Letterboxd, the closest publicly comparable product, averages **10.88 pages/visit** (SimilarWeb, corroborated by SEMrush at 11.64). `[2-1]` Using a conservative **1 visit/month per MAU** yields ~10 pageviews/MAU/month as a floor — engaged users likely visit 2–4× per month, which would multiply these estimates proportionally.

### Ad Revenue by Scale Tier (free users only, AdSense baseline)

Assumes: 97% of MAU are free users (3% conversion); 10 pageviews/free user/month.

| Tier | Free User Pageviews/mo | Network | RPM Used | Monthly Ad Revenue |
| ------ | ------------------------ | --------- | ---------- | -------------------- |
| 100 MAU | ~970 | AdSense (only option — sessions too low for Journey) | $2 conservative | **~$2/mo** |
| 1,000 MAU | ~9,700 | AdSense | $2 | **~$19/mo** |
| 1,000 MAU | ~9,700 | Mediavine Journey (if approved) | $15–$40 | **~$146–$388/mo** `[est]` |
| 10,000 MAU | ~97,000 | AdSense (floor) | $2 | **~$194/mo** |
| 10,000 MAU | ~97,000 | Mediavine Journey | $15–$40 | **~$1,455–$3,880/mo** `[est]` |
| 10,000 MAU | ~97,000 | Raptive (once eligible) | $13–$47 | **~$1,261–$4,559/mo** `[est]` |

**Conservative planning rule:** Model AdSense-only ($2 RPM) until Mediavine Journey is approved and generating real data. Mediavine Journey is the material upside unlock — at 10K MAU it outperforms subscription revenue at 1% conversion by 7–20×.

### Revised Net Monthly at 10,000 MAU (additive to Section 5)

| Scenario | Subscription Net | Ad Revenue (AdSense floor) | Ad Revenue (MV Journey mid) | Combined Net |
| ---------- | ----------------- | -------------------------- | ---------------------------- | -------------- |
| 10K MAU, 1% paid, AdSense | +$191 | +$194 | — | **~+$385/mo** |
| 10K MAU, 1% paid, MV Journey | +$191 | — | +$2,668 | **~+$2,859/mo** |
| 10K MAU, 3% paid, AdSense | +$714 | +$194 | — | **~+$908/mo** |
| 10K MAU, 3% paid, MV Journey | +$714 | — | +$2,668 | **~+$3,382/mo** |

### Freemium Tension

Ads on the free tier reduce urgency to convert. The lift in ad revenue must be weighed against potential suppression of conversion rates — no confirmed research on the magnitude of this effect for movie/TV tracking products. Treat the full Mediavine upside as theoretical until 90+ days of real conversion data exists alongside ads. `[est]`

### Key RPM Caveats

- All RPM figures are for **US/Tier 1 traffic**; non-US traffic commands 3–5× less.
- Authenticated, app-like browsing (quick lookups vs. long content reads) may compress RPM below content-site benchmarks.
- Q4 RPMs run 1.5–2× Q1 — use Q1 as the annual planning baseline.
- Ad blockers among tech-savvy cord-cutter audiences could suppress realized RPM by 20–40%. `[est]`
- Raptive's $47+ RPM figure reflects one publisher's Q4 2025 conditions; the Publift-cited baseline of $13–$15 is the more conservative and likely more representative floor.

---

## 9. Competitive Benchmarks

| Product | Pricing | Model | Notes |
| --------- | --------- | ------- | ------- |
| **Letterboxd** | $19/yr Pro, $49/yr Patron | Freemium + web subscriptions | `[3-0 verified]` Via Paddle; web + iOS + Google Play |
| **Trakt** | $60/yr VIP | Freemium | `[3-0 verified]` **Doubled from $30/yr in Feb 2025.** User exodus is live. |
| **JustWatch** | Free (ad-supported) | Ad revenue | Anchors user price-sensitivity near $0 for feature-comparable use |

**Trakt's 100% price increase is a live acquisition opportunity.** Users displaced from $30/yr → $60/yr are actively seeking alternatives. Busted Board at $25/yr is a credible offer. The r/trakt post should go out while this migration is still happening.

**Letterboxd's $19/yr anchors the "reasonable for a passion-project app" price expectation.** $25/yr is above it but defensible if cross-platform AI recommendations are meaningfully differentiated.

---

## 10. User Acquisition — Organic Only Until 10K MAU

### CAC ceiling (LTV-derived)
Rule of thumb: CAC should be < ⅓ of LTV.
- Monthly subscriber max viable CAC: **~$6**
- Annual subscriber max viable CAC: **~$14**

### Typical paid CAC estimates `[est — not verified]`

| Channel | Cost per Free Signup | Cost per Paid Sub (3% conv) | Viable? | Status |
| --------- | --------------------- | --------------------------- | --------- | -------- |
| Reddit organic | $0 | $0 | **Yes — do this first** | **In progress** — BustedBoardBot karma-building started 2026-06-22; 3 helpful-only comments posted in r/trakt. Sam's personal intro post ready to go once bot has ~10 karma. |
| SEO/content | $0 direct | $0 direct | **Yes — compounds over time** | Not started — custom domain needed first |
| Product Hunt | $0 direct | $0 direct | Yes — week 2 after domain live | Not started |
| Reddit Ads | $5–15 | $167–500 | No | — |
| Google Ads | $7–50 | $233–1,667 | No | — |
| Meta/TikTok | similar | similar | No | — |

**Don't spend money on ads until you've validated conversion from organic channels and are self-sustaining at 10K+ MAU.** At 10K MAU with 3% conversion (~$714/mo net), you could allocate $200/mo to Reddit Ads or SEO tools and still profit.

---

## 11. Known Gaps & Unverified Assumptions

| Item | Status | Impact |
| ------ | -------- | -------- |
| 3% B2C conversion | Optimistic ceiling, not median — 1% is realistic base case | **High** |
| Amazon Associates revenue | Unverified; likely near $0 | Medium — upside only |
| Vercel Pro overages at 10K MAU | Not confirmed; $20/mo is a floor | Low |
| Annual vs monthly plan mix | P&L above assumes 100% monthly — any annual mix improves all numbers | Skews pessimistic |
| RevenueCat retention (17%/44%) | Mobile app data — web SaaS may retain better | Moderate upside |
| Business formation state fees | Estimated; verify against your actual state's Secretary of State website | Low |
| Ad RPM for authenticated/app-like browsing | Letterboxd RPM data not confirmed; app-like sessions may compress RPM 20–50% vs content-site benchmarks | Medium |
| Mediavine Journey revenue share & lock-in terms | Terms not confirmed in research; may differ materially from the full Mediavine program | Medium |
| Conversion suppression from showing ads to free users | No confirmed data; treat Mediavine upside as theoretical until 90+ days of paired conversion+ad data exists | Medium |

---

## Summary

Break-even requires only **8 paying subscribers** (~267 MAU at 3% conversion). Infrastructure is near-free through 1,000 MAU (~$27/mo). The real business emerges at 1,000+ MAU: at 3% conversion you're profitable at +$51/mo; at 10,000 MAU, ~+$714/mo ($8,567/yr net).

**Immediate priorities:**
1. **Reddit outreach underway** — BustedBoardBot karma-building started 2026-06-22 (3 helpful-only comments in r/trakt). Sam's personal intro post ready; post once bot has ~10 karma. r/trakt is prime: Trakt doubled to $60/yr and users are leaving.
2. Push annual plan ($25/yr) over monthly ($3/mo) — 2.3× better LTV, 2.6× better retention, 3× lower Stripe cut
3. Form home-state LLC (~$130–200) before collecting any revenue
4. ~~Switch Gemini to Flash-Lite~~ **Done ✓** (session 31) — saves ~$13–28/mo at 10K MAU vs Flash
5. ~~Get paid Google AI Studio key~~ **Done ✓** (session 33) — Paid 1 tier active, $25 credit, RPD limit removed
6. Don't model Amazon Associates revenue until you have 90 days of real clickthrough data

---

## Sources

| Source | Type | Used For |
| -------- | ------ | --------- |
| [Vercel Plans](https://vercel.com/docs/plans/hobby) | Primary | Hobby commercial restriction |
| [Neon Pricing](https://neon.com/docs/introduction/plans) | Primary | DB plan tiers and compute pricing |
| [Upstash Redis Pricing](https://upstash.com/docs/redis/overall/pricing) | Primary | Redis command pricing |
| [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing) | Primary | Flash vs Flash-Lite costs |
| [ChartMogul SaaS Conversion Report Jan 2026](https://chartmogul.com/reports/saas-conversion-report/) | Primary | Free-to-paid conversion benchmarks |
| [RevenueCat State of Subscription Apps 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/) | Primary | Annual vs monthly retention data |
| [Letterboxd Pro](https://letterboxd.com/about/pro/) | Primary | Competitor pricing |
| [Trakt price increase](https://alternativeto.net/news/2025/2/trakt-tv-has-set-stricter-limits-for-free-users-and-raised-vip-subscription-prices-by-100-/) | Secondary | Competitor pricing change |
| [Paddle / Letterboxd case study](https://www.paddle.com/customers/letterboxd) | Secondary | Letterboxd monetization model |
| [Raptive — Opening the door to more creators](https://raptive.com/blog/opening-the-door-to-more-creators-who-meet-raptive-quality-standards/) | Primary | Raptive 25K pageview minimum (Oct 2025) |
| [Search Engine Journal — Raptive drops requirement 75%](https://searchenginejournal.com/raptive-drops-traffic-requirement-by-75-to-25000-views/558780/) | Secondary | Raptive threshold reduction corroboration |
| [Ezoic 250K minimum announcement (PR Newswire, Feb 2026)](https://www.prnewswire.com/news-releases/ezoic-raises-bar-to-250k-js-integration-for-full-revenue-platform-surges-in-popularity-with-web-builders-302692672.html) | Primary | Ezoic exits small-publisher market |
| [Google AdSense eligibility](https://support.google.com/adsense/answer/9724) | Primary | AdSense has no formal traffic minimum |
| [This Week in Blogging — ad network entry requirements](https://thisweekinblogging.com/ad-network-entry-requirements/) | Secondary | Mediavine Journey 1K session minimum (Oct 2025) |
| [Blogger Prosperity — AdSense vs Mediavine vs Ezoic vs Raptive](https://bloggerprosperity.com/adsense-vs-mediavine-vs-ezoic-vs-raptive/) | Secondary | RPM range benchmarks by network tier |
| [SimilarWeb — Letterboxd vs Trakt](https://www.similarweb.com/website/letterboxd.com/vs/trakt.tv/) | Secondary | Letterboxd 10.88 pages/visit benchmark |
