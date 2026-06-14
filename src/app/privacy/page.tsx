import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Busted Board",
  description: "How Busted Board collects, uses, and protects your information.",
};

const LAST_UPDATED = "June 14, 2026";

// TODO: replace with your actual contact email before going live
const CONTACT_EMAIL = "your-email@example.com";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back
          </Link>
          <h1 className="mt-4 text-3xl font-semibold text-foreground">Privacy Policy</h1>
          <p className="mt-1 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </header>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Busted Board (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates the website at{" "}
          <span className="text-foreground">busted-board.vercel.app</span>. This Privacy Policy
          explains what information we collect, how we use it, and your rights. By using Busted
          Board you agree to the practices described here.
        </p>

        <Section title="1. Information we collect">
          <Subsection title="Account information">
            <p>
              When you sign in with Google, we receive your name, email address, profile picture
              URL, and a Google account identifier. We store these in our database to identify
              your account and display your name within the app.
            </p>
          </Subsection>

          <Subsection title="App data you create">
            <p>
              We store the ratings, watchlist entries, dismissals, and quiz responses you submit.
              This data is private to your account and is used solely to personalise your
              recommendations.
            </p>
          </Subsection>

          <Subsection title="Cookies and similar technologies">
            <p>We use the following cookies:</p>
            <ul className="mt-2 space-y-2 list-disc list-inside text-sm">
              <li>
                <strong>Session cookie</strong> — a signed JWT set by NextAuth that keeps you
                logged in. Strictly necessary; no consent required.
              </li>
              <li>
                <strong>Consent cookie (<code>bb-consent</code>)</strong> — stores your
                advertising-consent choice (accepted / declined). Strictly necessary; no consent
                required.
              </li>
              <li>
                <strong>Ad-network cookies</strong> — set by third-party ad providers (see
                &ldquo;Third parties&rdquo; below) <em>only</em> after you click &ldquo;Accept&rdquo;
                on the consent banner. If you decline, no ad-network cookies are loaded.
              </li>
            </ul>
          </Subsection>
        </Section>

        <Section title="2. How we use your information">
          <ul className="space-y-2 list-disc list-inside text-sm">
            <li>To provide and personalise the recommendation feed.</li>
            <li>To associate your ratings, watchlist, and dismissals with your account.</li>
            <li>
              To show advertising that supports the site — contextual ads if you decline
              personalisation; interest-based ads if you accept.
            </li>
            <li>To diagnose errors and maintain the service.</li>
          </ul>
          <p className="mt-3 text-sm">
            We do not use your data for automated decision-making that produces legal or
            similarly significant effects.
          </p>
        </Section>

        <Section title="3. Third parties">
          <Subsection title="Google">
            <p>
              We use Google Sign-In (OAuth 2.0). Google&rsquo;s handling of your data during
              sign-in is governed by the{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Google Privacy Policy
              </a>
              . If Google advertising is active and you have given consent, Google&rsquo;s
              ad-serving cookies may also be set.
            </p>
          </Subsection>

          <Subsection title="TMDB (The Movie Database)">
            <p>
              Movie and TV metadata is fetched from the TMDB API. No personal data is sent to
              TMDB. TMDB data is provided under the TMDB terms of use.
            </p>
          </Subsection>

          <Subsection title="Ad networks (consent-gated)">
            <p>
              When you accept personalised advertising, scripts from one or more of the
              following ad networks may be loaded: Google AdSense / Ad Manager, Prebid.js
              (open-source header-bidding), Amazon Transparent Ad Marketplace, Media.net,
              Taboola, Outbrain, Ezoic, Mediavine, Raptive, Monumetric, Carbon Ads, and
              BuySellAds. Each network&rsquo;s own privacy policy governs how they process
              data. If you decline consent, none of these scripts are loaded.
            </p>
          </Subsection>

          <p className="text-sm mt-2 font-medium">
            We do not sell your personal data to any third party.
          </p>
        </Section>

        <Section title="4. Data retention">
          <p>
            We retain your account information and app data for as long as your account is
            active. You may request deletion at any time by emailing us (see &ldquo;Contact&rdquo;
            below) or, once a self-service delete option is available, through the Settings page.
            We will delete your data within 30 days of a verified request.
          </p>
        </Section>

        <Section title="5. Your rights — EU/EEA (GDPR)">
          <p>
            If you are located in the European Economic Area, you have the following rights
            under the General Data Protection Regulation:
          </p>
          <ul className="mt-2 space-y-1.5 list-disc list-inside text-sm">
            <li><strong>Access</strong> — request a copy of the data we hold about you.</li>
            <li><strong>Rectification</strong> — ask us to correct inaccurate data.</li>
            <li><strong>Erasure</strong> — ask us to delete your data (&ldquo;right to be forgotten&rdquo;).</li>
            <li><strong>Portability</strong> — receive your data in a machine-readable format.</li>
            <li><strong>Objection</strong> — object to processing based on legitimate interests.</li>
            <li>
              <strong>Withdraw consent</strong> — you can change your advertising consent at any
              time by declining in the consent banner (refresh the page to see it again after
              clearing the <code>bb-consent</code> cookie).
            </li>
            <li>
              <strong>Lodge a complaint</strong> — you have the right to complain to your local
              supervisory authority.
            </li>
          </ul>
          <p className="mt-3 text-sm">
            Our legal bases for processing are: contract performance (providing the service you
            signed up for); consent (personalised advertising); and legitimate interests
            (service security and stability).
          </p>
        </Section>

        <Section title="6. Your rights — California (CCPA)">
          <p>
            If you are a California resident, the California Consumer Privacy Act gives you the
            right to:
          </p>
          <ul className="mt-2 space-y-1.5 list-disc list-inside text-sm">
            <li>Know what personal information we collect and how it is used.</li>
            <li>Request deletion of your personal information.</li>
            <li>
              Opt out of the &ldquo;sale&rdquo; of personal information — we do not sell your
              personal information.
            </li>
            <li>Non-discrimination for exercising your CCPA rights.</li>
          </ul>
          <p className="mt-3 text-sm">
            To exercise any of these rights, contact us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-foreground">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="7. Children's privacy">
          <p>
            Busted Board is not directed at children under 13. We do not knowingly collect
            personal information from children under 13. If you believe we have inadvertently
            collected such information, please contact us and we will delete it promptly.
          </p>
        </Section>

        <Section title="8. Changes to this policy">
          <p>
            We may update this Privacy Policy from time to time. When we do, we will update the
            &ldquo;Last updated&rdquo; date at the top of this page. Continued use of Busted Board
            after changes are posted constitutes acceptance of the revised policy.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>
            For privacy-related questions or to exercise your rights, email us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-foreground">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <footer className="border-t border-border pt-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
          <Link href="/" className="hover:text-foreground transition-colors">
            Back to Busted Board
          </Link>
        </footer>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h3 className="font-medium text-foreground">{title}</h3>
      <div className="text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}
