# International Expansion Strategy

*Researched June 14, 2026. Sources cited inline. Check Vercel Analytics and Google Search Console (Step 0) before finalizing expansion priority — organic international traffic already in the system may determine the order.*

---

## Pre-Expansion Gate

### Domestic PMF Checkpoint
Before committing engineering capacity to international expansion, verify current US metrics. Don't commit to Phase 1 until these are clearly trending — specific thresholds TBD with Sam based on current state. International expansion before domestic PMF dilutes engineering focus without a stable foundation to learn from.

### Trakt Migration Window — Still Open
The window is open, and arguably wider than at the February 2025 price hike:

- **Feb 2025:** Free tier limits cut to 2 lists × 100 items, VIP doubled $30 → $60/yr
- **May–Jun 2025:** All legacy/grandfathered $15/yr and $30/yr plans forced to $60/yr — up to 300% increase. Co-founder had explicitly promised legacy pricing would be honored. ([Neowin](https://www.neowin.net/news/trakt-vip-receives-up-to-300-price-hike-going-back-on-promise-to-honor-legacy-subs/))
- **Nov 2025:** "Project LITE" redesign launched to massive backlash; forum threads titled "new design = reason for VIP cancellation"
- **2026:** Another round of limit tightening; fresh complaint wave

Trakt has 14M registered users but only ~811K monthly active ([PCWorld, Feb 2025](https://www.pcworld.com/article/2607062/trakt-helps-you-keep-track-of-your-streaming-shows)). Each Trakt own-goal is an activation event for that dormant 13M.

**Important nuance:** Displaced Trakt power users went primarily to **Simkl** (free, unlimited tracking, Plex/Kodi/Emby integrations) — not busted-board. The acquisition message must differentiate from Simkl (which lacks AI recs and subscription-filtered discovery) not just from Trakt.

---

## Competitive Landscape

### Positioning Matrix

| Competitor | Ad Independence | Cross-Platform Breadth | AI Recs | Social | Platform Integrations | Price | Int'l Coverage | Non-English Content | API | B2B |
|---|---|---|---|---|---|---|---|---|---|---|
| **Busted-Board** | Strong | Medium | Strong | Weak | None | Strong ($3/mo, $25/yr) | Medium | Medium | None | None |
| **Trakt** | Medium | Medium (tracking only, no recs) | Weak | Medium | **Strong** (Plex/Kodi/Emby/Jellyfin/Infuse) | Weak ($60/yr) | Medium | Weak | Strong | None |
| **JustWatch** | **Weak** (sponsored recs, studio ad business) | **Strong** (3,900+ providers, 140 markets) | Weak | None | Medium (LG TV active; Samsung/Fire TV abandoned) | Strong (free) | **Strong** | Medium | Medium | Weak |
| **Letterboxd** | Strong | None (no streaming filter) | None | **Strong** | None | Medium ($20–50/yr) | Strong (17M users, 200+ countries) | Strong | Weak | None |
| **Simkl** | Strong | Medium | Weak | Weak | Strong (Plex/Kodi/Emby/Jellyfin/Crunchyroll/VLC) | **Strong (free)** | Medium | Medium | Medium | None |
| **Taste.io** | Strong | Weak (recs only) | Medium (collaborative filtering) | None | None | Strong ($1/mo) | Weak | Weak | None | None |
| **Serializd** | Strong | None (TV tracking only) | None | Medium | None | Strong (free) | Weak | Weak | None | None |
| **MUBI** | Strong | None (own catalog only) | Medium (human curation) | Weak | None | Weak ($14.99/mo) | Strong | **Strong** | None | None |
| **FilmAffinity** | Medium | Weak | Weak | Medium | None | Strong (free, ad-supported) | Weak (ES/LatAm) | Strong | None | None |
| **AlloCiné** | Weak | Weak | None | Weak (forums closed 2020) | None | Strong (free) | Weak (FR/ES) | Medium | None | None |

*Rating key — Strong: competitive advantage. Medium: present but limited. Weak: nominal. None: absent.*

**Busted-board's durable edge:** AI recommendations filtered to your actual subscriptions + editorial independence (no studio money, no sponsored recommendations). No competitor combines these two cleanly at any price.

**Busted-board's structural vulnerabilities:**
- Zero platform integrations (Plex/Kodi/Emby) — Trakt and Simkl's main user lock-in
- No public API — can't be embedded in third-party media centers
- No social layer — Letterboxd owns this segment entirely

### Platform Integration Gap

Trakt's stickiness comes from its scrobbling ecosystem. Many users won't leave regardless of price because they can't keep scrobbling from their home media server. Feasibility for busted-board:

- **Kodi addon:** Python 3, repo-URL distribution, beginner-friendly. Highest value / lowest barrier. This alone reaches the home-server audience.
- **Jellyfin/Emby plugins:** Community ecosystem, open-source. Accessible.
- **Plex plugin:** Dead — deprecated 2018. External API/webhook integration only.
- **Roku self-serve API:** Launched November 2025. Not yet widely integrated by Trakt/JustWatch/Letterboxd. Roku is the leading smart TV OS in the US by install base. First-mover opportunity. ([Roku newsroom](https://newsroom.roku.com/news/2025/11/roku-launches-self-serve-api-suite-for-connected-tv/))

**Netflix reality:** Netflix blocked Apple TV integration in Feb 2025 and called it "a mistake." ([TUAW](https://www.tuaw.com/2025/02/19/netflix-clarifies-apple-tv-app-integration-was-a-mistake)) No cross-platform aggregation with Netflix is possible — category-wide constraint.

### B2B / Professional Tier — Unoccupied

No competitor serves film critics, festival programmers, entertainment journalists, or film schools with purpose-built tooling. These users live on Letterboxd's consumer product. A Pro tier with list collaboration, notes, export, and API access at €8–12/mo would fill this gap, particularly in Europe where film criticism culture is strongest.

### Letterboxd Ownership Uncertainty

Tiny is shopping Letterboxd as of April 2026 (Ankler talks failed, Versant interest reported). Any ownership transition creates product uncertainty and community anxiety — a predictable activation window for alternatives. ([Semafor](https://www.semafor.com/article/04/26/2026/whats-next-for-letterboxd), [TechCrunch](https://techcrunch.com/2026/04/27/letterboxd-sale-film-social-media-semafor-versant-ankler/))

### Dormant Trakt User Population

14M registered vs. 811K monthly active = ~13M lapsed users. Many signed up before streaming-service filtering existed as a category, before AI recommendations existed. Message: "the thing you gave up on Trakt for now exists." This is more targeted than competing for active Trakt VIP subscribers.

---

## SEO Opportunity

JustWatch receives 105M monthly visits with 58.9% from organic Google search; 44M backlinks; 95,790 referring domains. ([SEMrush](https://www.semrush.com/website/justwatch.com/overview/)) They are the dominant force on virtually every European-language streaming discovery query. Competing on broad terms requires years of content investment.

**JustWatch's SEO weakness:** Their recommendations are commercially influenced (sponsored recommendations is a core revenue pillar). "AI-personalized, unsponsored recommendations" is meaningfully different and defensible.

**Viable SEO path:**
- Programmatic long-tail + fresh editorial content (daily "what's new on [service] in [country]" pages)
- AI recommendation pages indexed for intent queries ("best thriller on Netflix for fans of X")
- Localized subdirectory structure: `busted-board.com/de/`, `/fr/` — subdirectory preferred over subdomains (authority consolidation, faster rankings on young domain) ([Semrush](https://www.semrush.com/blog/should-i-use-a-subdomain-or-subfolder-for-international-seo/))

SEO is a 12–18 month supplemental channel build, not a launch channel. **Adoro Cinema (Brazil) achieves 20M monthly visits with 90% organic traffic** — validating that content-first SEO is viable in this category for a smaller player. ([Similarweb](https://www.similarweb.com/website/adorocinema.com/))

---

## Expansion Roadmap

### Sequencing Rationale

**Recommended order: UK → South Korea → Brazil → Germany → India/Indonesia → South Africa → Japan**

| Market | Why this position | Key prerequisite |
|---|---|---|
| **UK** | Zero localization. 3.3 subs/household. English-speaking. BFI London timing. | Add BBC iPlayer/ITVX platform IDs to `platforms.ts` |
| **South Korea** | 2.1 streaming subs per *person* (highest globally). Stripe already supports KakaoPay/NAVER Pay. BIFF timing. | Verify Watchmode Korean service coverage |
| **Brazil** | Letterboxd's largest non-English market. Single language (pt-BR). PIX via Stripe works. | Verify Watchmode Globoplay coverage |
| **Germany** | 3.3 subs/household, 27% "forgotten subscription" rate. GDPR done once = all EU. Berlinale timing. | German localization + GDPR CMP + IP legal review |
| **India/Indonesia** | Massive TAM. Valid multi-platform use case. | PPP pricing redesign + freemium gate expansion + UPI verification |
| **South Africa** | English, higher income, Netflix+Showmax multi-platform, Paystack handles ZAR. | Paystack integration |
| **Japan** | $7.2B sector but 1.2 subs/household, rental culture mismatch, UAI 92/100. | Product change (TVOD surfacing required) |

---

### Phase 1: UK (Q3 2026)

**Value prop:** 3.3 paid subscriptions per household + free BBC iPlayer/ITVX/All 4/My5 on top. 78% of UK households subscribe to at least one SVOD, 45% hold three or more. ([Bango](https://bango.com/europeans-now-spend-almost-e700-on-subscriptions-every-year/)) The "I don't know what to watch across all my services" problem is acute. This is busted-board's core use case.

**Streaming services to add** (get TMDB provider IDs via `GET /watch/providers/movie?region=GB`):
- BBC iPlayer (free public)
- ITVX / ITV Hub (free; rebranded from ITV Hub in 2022)
- All 4 / Channel 4 (free)
- My5 / Channel 5 (free)
- BritBox (paid, £5.99/mo)
- Sky Go / Now TV (paid)

**Engineering work for UK launch (minimal):**
- Add TMDB provider IDs to `src/lib/platforms.ts`
- Parameterize `language` in `src/lib/tmdb.ts` (replace hardcoded `"en-US"` in `discoverMovies`, `discoverShows`, `searchMulti`)
- Add region detection or region selection to user onboarding
- **The TMDB discovery path already handles UK content correctly** — this is a config change + one-line fix per function, not a new integration. The watch provider lookup already uses region correctly.

**Streaming data pipeline:** Verify Watchmode coverage of BBC iPlayer, ITVX, All 4 via `GET /sources/` endpoint before launch. Free public broadcasters may not be in Watchmode; TMDB watch providers is the fallback for paid services. Manual platform listing may be needed for free services.

**Regulatory:**
- **ICO registration: mandatory, £40/year** for micro-business (<10 staff, <£632k turnover). Non-registration is the most common UK compliance failure. ([ICO](https://ico.org.uk/for-organisations/data-protection-fee/register/)) Do this immediately.
- UK GDPR: Privacy Policy + data subject rights process required.
- VAT: 20%. Display VAT-inclusive prices to UK consumers.

**User acquisition:**
- r/TrueFilm, Letterboxd UK community, Trakt migrant communities (Reddit, AlternativeTo)
- Positioning: "57% cheaper than Trakt ($25/yr vs. $60/yr), with AI recommendations Trakt doesn't have"
- BFI London Film Festival (October) — timing anchor. Launch September, amplify at BFI.
- Mark Kermode / BBC Radio 6 audience is a natural demographic fit.

**Affiliate:** Amazon UK Associates (4–8% commission). BritBox affiliate program. Apple TV+ via Apple Performance Partners (7%).

**Pricing:** £2.50/mo or £20/yr. Display VAT-inclusive: £3.00/mo or £24/yr.

**Customer support:** English-only email acceptable.

**Cost estimate:**
- Engineering: ~10–20 hrs
- Legal: £40 ICO + ~$200 privacy review
- One-time total: ~$500
- Annual ongoing: £40 ICO

**Revenue projection (Y1):** 200–500 paid subscribers → $5,000–12,500/yr

---

### Phase 2: South Korea (Q4 2026 — target BIFF)

**Value prop:** Strongest multi-platform market in Asia. **2.1 streaming subscriptions per person** (not household). Netflix 35%, TVING 34%, Wavve 18%, Coupang Play 9%, Disney+ 5%. ([AJU Press](https://www.ajupress.com/view/20251215105634916), [Statista](https://www.statista.com/outlook/amo/media/tv-video/ott-video/south-korea)) Users genuinely stack multiple services. $4.6B OTT market, 88% penetration.

**Streaming services to add:**
- Wavve (KBS/MBC/SBS content)
- TVING (CJ ENM + Netflix partnership)
- Watcha (independent, film-forward)
- Coupang Play (bundled with Coupang Wow)
- Viki / Rakuten Viki (K-drama)

**Critical prerequisite:** Verify Watchmode or Streaming Availability API covers Wavve, TVING, Coupang Play before committing to this market. Call `GET /sources/?regions=KR` on Watchmode. If these aren't covered, the core streaming-filter feature is broken from day one. This is a go/no-go gate.

**TMDB metadata:** Supports `ko-KR`. HIGH quality for popular K-dramas and Korean films. Gaps exist for older/niche titles.

**Localization:** Korean UI translation needed. Hangul fonts handled by UTF-8. `language=ko-KR` parameter in TMDB calls is the same fix as UK (parameterize, don't hardcode).

**Payment:** Stripe supports KakaoPay (24M Korean users), NAVER Pay, Samsung Pay — no new PSP needed. ([Stripe Korea guide](https://stripe.com/resources/more/payments-in-south-korea)) Create KRW Stripe Price objects. PPP pricing: **₩3,500/mo (~$2.60) or ₩30,000/yr** — undercuts Trakt ($60/yr ≈ ₩82,000) and Letterboxd ($19.99/yr ≈ ₩27,000) while matching purchasing power. Neither competitor offers regional pricing — this is a genuine competitive differentiator.

**Regulatory:**
- PIPA: Foreign operators must designate a **domestic representative in South Korea** — real compliance cost. Budget ~$2,000–5,000/yr via a local agent service. ([ComplyDog/Baker McKenzie](https://complydog.com/blog/south-korea-pipa-privacy-information-protection-act-saas))
- 72-hour breach notification to PIPC.

**User acquisition:**
- X/Twitter Korean film community (very active — K-drama Twitter is globally known)
- KakaoTalk open chat channels
- Naver Café film/drama communities
- Positioning: "track Netflix + TVING + Wavve + Coupang Play in one place"

**Film festival:** BIFF Busan — **October 6–15, 2026.** 100K+ Facebook followers. ([BIFF](https://www.biff.kr/eng/)) Create "where to stream BIFF 2026 competition films" feature as the launch hook. This is the most concrete marketing calendar anchor in Asia.

**Freemium gate:** Standard 50-item limit is acceptable for South Korea (higher willingness to pay than India/SE Asia).

**Cost estimate:**
- Engineering: ~40–60 hrs (Korean localization + KRW Stripe pricing + platform IDs)
- Translation: $500–1,500 (professional Korean review)
- Legal: $2,000–5,000/yr (PIPA rep)
- Annual ongoing: $2,000–5,000 (PIPA) + translation maintenance

**Revenue projection (Y1):** 300–800 paid subscribers → $7,000–18,000/yr

---

### Phase 3: Brazil (Q1 2027)

**Value prop:** Brazil is Letterboxd's **largest non-English-speaking market** — 4.2% of global users, 5.8% of desktop traffic. ([Letterboxd journal](https://letterboxd.com/journal/how-i-letterboxd-erika-amaral/)) JustWatch operates in Brazil but is thin on local streaming coverage. 27.7M SVoD subscribers in a $3.5B market growing at 22% CAGR through 2030. ([IMARC](https://www.imarcgroup.com/brazil-video-streaming-market)) Netflix 30%, Prime 14%, Globoplay 10%.

**Streaming services to add:**
- Globoplay (TV Globo — dominant; massive telenovela library; R$22.90/mo no-ads)
- Telecine (cinema-focused; R$37.90/mo)
- Star+ (Disney+, Hulu, Star content; R$43.90/mo)
- Looke (Brazilian films)

**Streaming data pipeline:** Verify Watchmode or Streaming Availability API covers Globoplay and Telecine — Brazilian-only services with no US presence. Go/no-go gate.

**TMDB metadata:** Strong `pt-BR` quality — active Brazilian contributor community. Brazilian telenovelas and films are well-represented. `language=pt-BR` returns Brazilian Portuguese metadata.

**Localization:** Brazilian Portuguese (pt-BR) — NOT European Portuguese (pt-PT). They differ enough in vocabulary, idiom, and tone to require separate localization. Use a professional Brazilian Portuguese translator for review, not just machine translation. As a side effect, pt-BR covers Angola and Mozambique (Lusophone Africa) at no additional engineering cost, with ~10–15% vocabulary friction.

**LGPD (Lei Geral de Proteção de Dados):** Applies to foreign apps collecting Brazilian user data from the first interaction. ([LGPD Brazil](https://lgpd-brazil.info/))
- Startup/small business can **waive DPO requirement** under ANPD Resolution 2 (Jan 2022) — provide a communication channel instead
- 15-day data deletion response window
- Privacy policy in Portuguese required
- Lighter than GDPR in practice: vaguer breach notification, lower penalties
- Penalties: 2% of Brazil revenue or R$50M per infraction

**Payment:**
- **PIX: 93% adult adoption**, 64B transactions in 2024 (+53% YoY). Stripe supports via EBANX partnership. Growing 2.5x faster than credit cards. ([Stripe PIX guide](https://stripe.com/resources/more/pix-replacing-cards-cash-brazil), [Finextra](https://www.finextra.com/newsarticle/46431/stripe-businesses-can-now-accept-pix-in-brazil))
- Boleto Bancário: Stripe Brazil supports; 20%+ of transactions; 2 business day settlement. ([Stripe Boleto](https://stripe.com/payment-method/boleto))
- Credit card: 51.6% population coverage
- PPP pricing: 40–60% reduction from US prices recommended. $3/mo ≈ R$15–17 is at the high end. Consider **R$9.90/mo or R$79/yr** (roughly $1.95/mo equivalent). For reference: Globoplay no-ads is R$22.90/mo; Spotify Brazil is ~R$22/mo. ([Statista](https://www.statista.com/statistics/1081334/netflix-subscription-cost-latin-america/))
- BRL/USD volatility: BRL depreciated 21.5% in 2024, recovered 14% in 2025. Offer annual BRL pricing to lock in revenue.

**X/Twitter:** 21M+ Brazilian users but **has been intermittently blocked in Brazil** — do not rely on as primary channel. ([Reuters Institute](https://reutersinstitute.politics.ox.ac.uk/news/x-has-been-blocked-brazil-does-it-matter-journalism))

**User acquisition:**
- TikTok (primary — Brazil averages 95+ min/day; 4 in 5 users say it influences streaming choices) ([TikTok Newsroom](https://newsroom.tiktok.com/sundance-2026-how-tiktok-is-fueling-film-fandom?lang=en))
- WhatsApp groups (dominant messaging; film fan groups are large)
- r/cinefilos, r/seriados, r/brasil, Letterboxd Brazilian community
- YouTube: Pipoca & Nanquim (229K subs, 683K monthly views)
- Globoplay has a CPA affiliate program (via Indoleads) — potential cross-promotion

**Amazon affiliate note:** Amazon.com.br Associates is limited to Kindle/Android apps only — not useful for streaming link affiliate revenue. ([Geniuslink](https://geniuslink.com/blog/amazon-associates-brazil/)) Use Globoplay's affiliate program instead.

**Film festivals:**
- Mostra São Paulo: October (417 films, 150K attendees) — ideal launch timing ([Mostra](https://48.mostra.org/en/informacoes-gerais))
- Festival do Rio: October/November
- Prêmio Grande Otelo (Brazilian cinema awards): July–August

**Customer support:** Portuguese-language FAQ required. Billing issues in BRL need some Portuguese support capability.

**Cost estimate:**
- Engineering: ~50–80 hrs (pt-BR localization, BRL Stripe pricing + PIX/Boleto config, platform IDs)
- Translation: $1,000–2,000 (professional pt-BR)
- LGPD: ~$500 (lawyer consultation)
- Annual ongoing: translation maintenance

**Revenue projection (Y1):** 400–800 paid subscribers → $3,000–8,000/yr (conservative given PPP pricing)

---

### Phase 4: Germany (Q2 2027)

**Value prop:** Germany averages **3.3 streaming subscriptions per subscriber** and has the **highest "forgotten subscription" rate in Europe at 27%** — Germans are paying for services they don't watch. ([Bango](https://bango.com/the-state-of-subscriptions-in-europe-2024/)) They skew toward annual plans (sticky subscribers, less likely to cancel after price hikes). ARD Mediathek and ZDF Mediathek (free public) add layers on top of paid subscriptions, making aggregation more valuable. Completing GDPR compliance for Germany covers all EU markets.

**Streaming services to add:**
- ARD Mediathek (free public)
- ZDF Mediathek (free public)
- RTL+ (paid/freemium)
- Joyn (free AVOD)
- WOW / Sky Deutschland (paid)
- MagentaTV (Deutsche Telekom, paid)
- Max (launched Germany 2025)

**Legal groundwork before Germany launch:**
- **German copyright/Abmahnung culture:** Consult a German IP lawyer on TMDB poster art usage before launch. Studios provide images to TMDB for distribution, but German courts have broad interpretations. Budget ~$200–500 for a quick legal opinion. ([EVZ Germany](https://www.evz.de/en/topics/internet-shopping/online-streaming/))
- **GDPR CMP:** Consent management platform required in practice (Cookiebot, CookieYes, or Usercentrics; €0–20/mo). ([CookieYes](https://www.cookieyes.com/blog/gdpr-for-saas/))
- **No DPA registration required** for a small foreign SaaS under GDPR — the pre-GDPR registration requirement no longer exists.
- **EU VAT / Non-Union OSS:** As a non-EU company, **must register for EU VAT from the first euro of B2C EU sales**. File quarterly returns via Non-Union OSS. Use Stripe Tax or budget ~€500–1,500/yr for a tax agent. Germany VAT rate: 19%. Display VAT-inclusive prices. ([Dodo Payments](https://dodopayments.com/blogs/eu-vat-saas-guide-2026))
- **DSA (Digital Services Act):** Micro/small enterprises (<10 staff, <€2M turnover) are exempt from substantial obligations. ([Ropes & Gray](https://www.ropesgray.com/en/insights/viewpoints/102j0f0/reminder-eu-digital-services-act-applies-beyond-very-large-online-service-prov/))

**User acquisition:**
- r/Filmkritik, German film Twitter/Bluesky, Berlinale community
- Berlinale (February) — largest publicly-attended film festival worldwide. Open to general public. Launch German beta in January, amplify at Berlinale.

**Pricing:** €2.75/mo or €23/yr. Display VAT-inclusive: €3.27/mo or €27.37/yr including 19% VAT. Emphasize annual plan for German audience.

**TMDB metadata:** `de-DE` quality is good for mainstream content; gaps exist for arthouse/foreign film. Acceptable for launch.

**Cost estimate:**
- Engineering: ~60–100 hrs (German localization, EUR Stripe pricing, platform IDs, GDPR CMP setup)
- Translation: $1,500–3,000 (professional German)
- Legal: $200–500 (IP opinion) + €500–1,500/yr (tax agent) + €0–20/mo (CMP)
- Annual ongoing: ~€1,500 (tax agent + CMP)

**Revenue projection (Y1):** 300–600 paid subscribers → $5,000–12,000/yr

---

### Phase 5: India / Indonesia (2027–2028)

**India value prop:** Valid. 601M OTT users, 148M paid, **2.5 subscriptions per paying household**. JioHotstar dominant but telecom packs bundle multiple services (JioHotstar + Prime + SonyLIV + ZEE5 in premium packs). Cross-platform discovery is a real use case. ([IBEF](https://www.ibef.org/news/india-has-601-million-over-the-top-ott-users-and-148-million-active-paid-subscriptions-reveals-ormax-s-research-report))

**Critical prerequisite for India:** Verify Stripe UPI support — reports are conflicting. Razorpay is the safe fallback for UPI (2% domestic transaction rate). Without UPI, a significant portion of the Indian market is excluded.

**India freemium gate:** India and Southeast Asia have globally the **lowest freemium conversion rates** (median revenue per install: $0.06). ([Adapty 2026](https://adapty.io/blog/trial-conversion-rates-for-in-app-subscriptions/)) Expand the free tier to 150–200 items before asking for payment. PPP pricing: **₹99/mo (~$1.20)** or ₹799/yr. Intro pricing of ₹49/mo for first 3 months is standard practice in India.

**India regulatory:** DPDPA 2023 — no mandatory data localization yet; Draft Rules for "Significant Data Fiduciaries" still being finalized and not applicable at startup scale. Monitor.

**Indonesia:** Fastest-growing OTT market researched. K-drama = 35% of Southeast Asian viewing hours. ([Variety](https://variety.com/2025/tv/news/korean-dramas-southeast-asia-streaming-netflix-lead-1236475194/)) Early entry before incumbent discovery tools localize is viable. Bahasa Indonesia localization required for mass market.

---

### Phase 6: South Africa (2028+)

**Beachhead:** English language, higher income, Netflix 6.3M subscribers, Showmax (now Canal+/MultiChoice post-Sep 2025 acquisition) with 44% YoY growth after Feb 2025 relaunch. Multi-platform behavior exists. ([FourWeekMBA](https://fourweekmba.com/netflix-subscribers-by-country/), [Bandwidth Blog](https://bandwidthblog.co.za/2025/06/13/showmax-subscriber-growth/))

**Key corrections to common assumptions:**
- **IrokoTV shut down 2023/2024** — not a current streaming service. ([The Bulrushes](https://thebulrushes.com/2023/11/02/iroko-tv-once-considered-the-african-netflix-has-closed-down-reasons-not-yet-known-/))
- **Canal+ acquired MultiChoice (Showmax) September 2025** — major competitive consolidation.
- **KAVA:** New Nollywood streaming platform launched August 2025 (Inkblot Studios / Filmhouse). New entrant to monitor.
- **FilmFlux:** A dedicated Nollywood discovery app exists — local competitor. ([FilmFlux](https://filmflux.app/))

**Vercel infrastructure gap:** Only one Vercel compute node in Sub-Saharan Africa — Cape Town (cpt1). Nigeria and Kenya users default to Washington DC servers. South Africa users benefit from the Cape Town node. ([Vercel changelog](https://vercel.com/changelog/cape-town-south-africa-is-now-available-on-the-edge-network))

**Nigeria context:** 169,000 Netflix subscribers in a 200M+ population country — extremely low penetration. ([Medium](https://medium.com/@FromLagosto/the-myth-of-nigerias-market-size-netflix-s-169-000-subscribers-expose-the-reality-of-low-2da3ab98277c)) Credit card penetration: 1.63%. Discovery tooling comes after streaming access is normalized. 2029+ market.

**Payment:** Paystack (Stripe subsidiary) supports M-Pesa in Kenya, and covers Nigeria, Ghana, South Africa, Côte d'Ivoire. M-Pesa: 96% Kenya household adoption. ([Paystack M-Pesa docs](https://support2.paystack.com/hc/en-us/articles/9741649633052-Pay-with-M-PESA))

**Francophone Africa note:** European French ≠ West African French — vocabulary, dialect, pronunciation all differ meaningfully. ([Strommeninc](https://strommeninc.com/whats-the-difference-between-african-french-and-european-french/)) NOT an automatic free win from the Germany/France localization.

---

### Phase 7: Japan (2029+)

Japan has a $7.2B premium video sector but the product-market fit is weak for busted-board's current form:
- ~1.2 streaming subscriptions per household (vs. South Korea's 2.1 per person)
- Strong rental/purchase culture (U-NEXT, Rakuten TV) — busted-board needs to surface TVOD availability (rental/purchase), not just subscriptions. This is a material product change.
- Japan's Uncertainty Avoidance Index of 92/100 — foreign SaaS faces extreme trust barriers; 12–18 months of visible commitment before mainstream adoption. ([Nihonium](https://nihonium.io/japanese-business-trust-insights/))
- Dense UI redesign required, Japanese customer support required, APPI cross-border data transfer consent required.
- Entry cost: 2–3× South Korea in Year 1, with weaker payback probability.

Defer until product PMF is proven in Korea and India.

---

## Mobile-First Gap Assessment

| Market | Mobile-first risk | Action |
|---|---|---|
| UK/Europe/South Korea | Low — desktop + mobile balanced | None before launch |
| India | High — mobile-dominant internet access | Build PWA before Phase 5 |
| Indonesia/Philippines | High — 40+ min/day TikTok; mobile-first | PWA required |
| Nigeria | High — 64% mobile penetration; 94.4% of connections are 3G/4G/5G broadband | PWA required before Nigeria entry |
| Kenya | High — 94.7% broadband mobile | Same as Nigeria |

**Recommendation:** Build a Progressive Web App (home screen installability, offline capability, reduced data usage) before Phase 5 (India/Indonesia). PWA market growing at 18.98% CAGR. ([Straits Research](https://straitsresearch.com/report/progressive-web-apps-market))

---

## Infrastructure Assessment

### Database Geo-Distribution
**Check Neon PostgreSQL documentation for node locations.** If US-East only, every database query for a South Korean or South African user involves a transatlantic round-trip on every page load. Check Neon's docs for read replica / geo-distribution options before committing to Asia.

### Vercel Edge Coverage
- **South Korea/India/SE Asia:** Vercel has Tokyo and Singapore nodes — acceptable latency.
- **Sub-Saharan Africa (except South Africa):** Default to Washington DC. Nigeria and Kenya users will experience high latency for any server-rendered content.
- TMDB image CDN (`image.tmdb.org`) serves globally. Consider lazy loading and low-res poster options for slow African connections.

---

## API & Data Infrastructure

### Confirmed Technical State (from codebase review, June 2026)

**US-only hardcoded:** `CATALOG_SYNC_REGION = "US"` in `src/lib/config/catalog.ts`. Both MOTN and Watchmode are called with US-region parameters. The entire pre-populated catalog is US content only.

**Language hardcoded:** `discoverMovies`, `discoverShows`, `searchMulti` in `src/lib/tmdb.ts` all use `language: "en-US"`. Parameterizing this is a one-line fix per function that enables localized TMDB metadata globally.

**Good news:** `getWatchProviders(tmdbId, type, region)` correctly passes region. `buildFeed` already uses `watch_region`. Adding international platform IDs to `src/lib/platforms.ts` and setting the correct region is sufficient — the TMDB discovery path already serves international streaming data correctly today.

**Gemini prompts** are English-language and English-culture-centric (`src/lib/gemini.ts`). Gemini 2.5 Flash is multilingual and handles non-English titles reasonably well. The main gap: `why_youll_like_this` explanations always return in English regardless of user locale. Pass user locale to the prompt for localized explanations.

### Streaming Data Pipeline by Region

| Region | Gap | Action |
|---|---|---|
| **UK** | BBC iPlayer, ITVX, All 4 may not be in Watchmode | Call `GET /sources/?regions=GB`; use TMDB as fallback for paid services |
| **Germany** | ARD Mediathek, ZDF Mediathek, Joyn likely not in Watchmode | Same verification; manual curation may be needed for free services |
| **France** | Canal+/MyCanal, France.tv | Call `GET /sources/?regions=FR` |
| **South Korea** | Wavve, TVING, Watcha, Coupang Play — **critical** | **Go/no-go gate:** Test Watchmode AND Streaming Availability API (RapidAPI) before committing |
| **Brazil** | Globoplay, Telecine, Looke | Same verification; go/no-go gate |
| **India** | JioHotstar, SonyLIV, ZEE5 | Verify before India launch |

**JustWatch structural advantage:** JustWatch receives direct JSON/XML catalog feeds from streaming services, updated ~every 6 hours. ([JustWatch streaming service docs](https://apis.justwatch.com/docs/streaming_service/)) Busted-board's data comes via Watchmode/MOTN. JustWatch offers a partner data feed program (data-partner@justwatch.com) — worth evaluating as an international data licensing option.

### TMDB Language Support
TMDB supports 39 languages via `language=xx-XX` parameter. Quality:
- **Strong:** `ko-KR`, `ja-JP`, `de-DE`, `fr-FR` (major popular content)
- **Good:** `pt-BR` (mainstream Brazilian content; active contributor community)
- **Moderate:** `hi-IN` (Bollywood mainstream; indie/niche gaps)
- **Weak:** `id-ID` (Indonesian content)

---

## Regulatory Summary

| Region | Law | Key requirements | Compliance effort | Estimated cost |
|---|---|---|---|---|
| **UK** | UK GDPR | ICO registration (£40/yr); Privacy Policy; data subject rights | Low | £40/yr + ~$200 legal review |
| **EU** | EU GDPR + Non-Union OSS VAT | CMP (€0–20/mo); Privacy Policy; No DPA registration; VAT from first euro | Medium | ~$500 setup + €500–1,500/yr tax agent |
| **Brazil** | LGPD | Privacy Policy in Portuguese; 15-day data deletion; startup can waive DPO | Low–Medium | ~$500 lawyer consultation |
| **South Korea** | PIPA | Domestic representative required (~$2–5K/yr); 72-hr breach notification | Medium | $2,000–5,000/yr representative |
| **India** | DPDPA 2023 | Consent, privacy policy; no localization yet | Low | Monitor-only for now |
| **Indonesia/Thailand** | PDP Law 2022 / PDPA 2022 | Consent, recipient country protection equivalence | Low | Monitor |
| **Japan** | APPI | Opt-in consent; contract with foreign data recipient | High | $5,000+ |

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Watchmode doesn't cover Wavve/TVING (Korea) or Globoplay (Brazil) → core feature broken at launch | **Critical** | Verify API before committing to market. Go/no-go gate. |
| Trakt migration window closes before Phase 1 ships | High | Move fast on UK — window is open but not indefinite |
| Value prop weak in single-platform-dominant markets | High | Validated per market: South Korea/India valid; Japan weak |
| AI recommendation cold-start in new markets → weak first-week experience → churn | High | Test recommendation quality with Korean/Portuguese content before launch |
| Non-Union EU VAT not registered from first EU paying customer | High | Register immediately when Germany launch begins |
| JustWatch's 105M monthly visits + sponsored recs dominates SEO | Medium | Don't compete on broad SEO terms; position on AI independence + subscription filtering |
| Letterboxd acquisition → new well-funded competitor | Medium | Watch closing timeline; Versant money would accelerate product investment |
| Simkl (free, Plex/Kodi integrations) captures Trakt refugees instead of busted-board | Medium | Differentiate on AI recs + streaming filter (Simkl has no AI recommendation layer) |
| IrokoTV was a planned African streaming partner — shut down 2023 | Low | Remove from Africa plan; use Showmax/KAVA instead |
| BRL/USD volatility hurts Brazil subscriber LTV | Low | Offer annual BRL pricing to lock in revenue |
| Viaplay instability disrupts Nordic streaming data | Low | TMDB provider data as fallback |

---

## Success Metrics

| Phase | Market | 3-month users | 6-month paid | Y1 revenue target | Paid conversion | Churn benchmark |
|---|---|---|---|---|---|---|
| 1 | UK | 300–500 | 50–150 | $2,500–5,000 | 15–20% | <5%/mo |
| 2 | South Korea | 200–400 | 80–200 | $5,000–12,000 | 20–30% | <5%/mo |
| 3 | Brazil | 400–800 | 60–150 | $3,000–8,000 | 10–15% | <8%/mo |
| 4 | Germany | 300–600 | 80–200 | $5,000–12,000 | 20–25% | <5%/mo |
| 5 | India | 1,000–3,000 | 50–150 | $3,000–8,000 | 3–8% | <10%/mo |

*These are order-of-magnitude estimates for go/no-go decisions, not commitments.*

---

## ROI Summary

| Market | Engineering (hrs) | Translation | Legal/compliance | Marketing | Total one-time | Annual ongoing | Y1 revenue est. | Payback |
|---|---|---|---|---|---|---|---|---|
| **UK** | 10–20 | $0 | $240 (ICO) | $500 | ~$1,000 | £40/yr | $2,500–5,000 | <1 year |
| **South Korea** | 40–60 | $1,000 | $2,000–5,000 | $1,000 | ~$6,000 | $2,000–5,000/yr (PIPA rep) | $5,000–12,000 | 1–2 years |
| **Brazil** | 50–80 | $1,500 | $500 | $1,000 | ~$5,000 | ~$500/yr (translation maintenance) | $3,000–8,000 | 1–2 years |
| **Germany** | 60–100 | $2,000 | $3,000 | $1,500 | ~$8,000 | ~€1,500/yr (tax agent + CMP) | $5,000–12,000 | 1–2 years |

*Engineering hours shown as effort, not dollar cost.*

---

*Last updated: June 14, 2026. All web-sourced claims carry inline citations. Verify before using in any external communication: streaming service status (OCS → Ciné+ OCS July 2024, Salto shutdown March 2023, Viaplay retrenched to Nordics), Watchmode international API coverage via live `/sources/` endpoint, Letterboxd Pro/Patron pricing at letterboxd.com, and Stripe payment method availability per country at Stripe's official documentation.*
