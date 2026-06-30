import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Busted Board",
  description: "The terms and conditions governing your use of Busted Board.",
};

const LAST_UPDATED = "June 29, 2026";

const CONTACT_FORM_URL =
  "https://docs.google.com/forms/d/101tTiA5tvVENwvAxU-JJBDu89NIY4KJdN1TRArPEa2w/viewform";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back
          </Link>
          <h1 className="mt-4 text-3xl font-semibold text-foreground">Terms of Service</h1>
          <p className="mt-1 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </header>

        <p className="text-sm text-muted-foreground leading-relaxed">
          These Terms of Service (&ldquo;Terms&rdquo;) govern your use of Busted Board
          (&ldquo;the Service&rdquo;), operated by Sam Deiter (&ldquo;we&rdquo;, &ldquo;us&rdquo;,
          or &ldquo;our&rdquo;). By accessing or using the Service you agree to be bound by these
          Terms. If you do not agree, do not use the Service.
        </p>

        <Section title="1. Description of the Service">
          <p>
            Busted Board is a movie and TV recommendation web app. It uses your streaming service
            subscriptions, viewing history, and ratings to surface personalised content
            suggestions. Recommendations are generated with the help of third-party AI services;
            see our{" "}
            <Link href="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </Link>{" "}
            for details on what data is processed. The Service is provided free of charge and is
            supported by advertising.
          </p>
        </Section>

        <Section title="2. Eligibility">
          <p>
            You must be at least 13 years old to use the Service. By using the Service, you
            represent that you meet this requirement. If you are under 18, you represent that
            your parent or legal guardian has reviewed and agreed to these Terms on your behalf.
          </p>
        </Section>

        <Section title="3. Accounts">
          <p>
            You sign in using a Google account. You are responsible for maintaining the
            security of your Google credentials and for all activity that occurs under your
            account. Notify us immediately via our{" "}
            <a href={CONTACT_FORM_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
              contact form
            </a>{" "}
            if you suspect unauthorised access.
          </p>
          <p>
            We reserve the right to suspend or terminate accounts that violate these Terms or
            that we reasonably believe pose a risk to the Service or other users.
          </p>
        </Section>

        <Section title="4. Acceptable use">
          <p>You agree not to:</p>
          <ul className="mt-2 space-y-1.5 list-disc list-inside text-sm">
            <li>Use the Service for any unlawful purpose or in violation of any applicable law.</li>
            <li>
              Attempt to gain unauthorised access to any part of the Service or its underlying
              infrastructure.
            </li>
            <li>
              Scrape, crawl, or systematically extract data from the Service without our written
              permission.
            </li>
            <li>
              Introduce malware, viruses, or other harmful code into the Service.
            </li>
            <li>
              Impersonate any person or entity, or misrepresent your affiliation with any person
              or entity.
            </li>
            <li>
              Interfere with or disrupt the integrity or performance of the Service or its
              servers.
            </li>
          </ul>
        </Section>

        <Section title="5. Third-party services and content">
          <p>
            The Service relies on third-party services including:
          </p>
          <ul className="mt-2 space-y-1.5 list-disc list-inside text-sm">
            <li>
              <strong>TMDB (The Movie Database)</strong> — movie and TV metadata. Busted Board
              uses the TMDB API but is not endorsed or certified by TMDB.
            </li>
            <li>
              <strong>Google Sign-In</strong> — authentication. Subject to Google&rsquo;s Terms
              of Service.
            </li>
            <li>
              <strong>Google Gemini</strong> — AI analysis of your ratings to generate and rank
              recommendations. Subject to Google&rsquo;s terms.
            </li>
            <li>
              <strong>Ad networks</strong> — advertising (contextual or personalised depending
              on your consent choice). Subject to each network&rsquo;s own terms.
            </li>
          </ul>
          <p className="mt-3">
            We are not responsible for the content, accuracy, or availability of any third-party
            service. Links to third-party sites are provided for convenience only; their inclusion
            does not imply endorsement.
          </p>
        </Section>

        <Section title="6. Intellectual property">
          <p>
            The source code for Busted Board is open source and licensed under the MIT License
            (see the{" "}
            <a
              href="https://github.com/SamDeiter/busted-board/blob/master/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              LICENSE file
            </a>
            ). The Busted Board name, logo, and any original non-code creative assets remain
            the property of Sam Deiter and may not be used without permission.
          </p>
          <p>
            Movie metadata, posters, and descriptions sourced from TMDB remain the property of
            their respective rights holders. Use of this data is governed by TMDB&rsquo;s terms
            of use.
          </p>
        </Section>

        <Section title="7. Disclaimers">
          <p>
            THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT
            WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
            WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
            NON-INFRINGEMENT. We do not warrant that:
          </p>
          <ul className="mt-2 space-y-1.5 list-disc list-inside text-sm">
            <li>The Service will be available at all times or free of errors.</li>
            <li>Recommendations will match your tastes or be free of inaccuracies.</li>
            <li>Movie metadata sourced from TMDB will be complete or up to date.</li>
          </ul>
        </Section>

        <Section title="8. Limitation of liability">
          <p>
            TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL SAM DEITER BE
            LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES
            (INCLUDING LOSS OF DATA, LOSS OF PROFITS, OR INTERRUPTION OF SERVICE) ARISING OUT
            OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY
            OF SUCH DAMAGES.
          </p>
          <p className="mt-3">
            OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATED TO THE SERVICE
            SHALL NOT EXCEED $100 USD.
          </p>
        </Section>

        <Section title="9. Indemnification">
          <p>
            You agree to indemnify and hold harmless Sam Deiter from and against any claims,
            damages, losses, and expenses (including reasonable legal fees) arising out of your
            use of the Service, your violation of these Terms, or your violation of any
            third-party rights.
          </p>
        </Section>

        <Section title="10. Governing law">
          <p>
            These Terms are governed by the laws of the State of Delaware, United States,
            without regard to its conflict-of-law provisions. Any dispute arising under or
            relating to these Terms shall be resolved exclusively in the state or federal courts
            located in Delaware.
          </p>
        </Section>

        <Section title="11. Changes to these Terms">
          <p>
            We may update these Terms from time to time. When we do, we will update the
            &ldquo;Last updated&rdquo; date at the top of this page. Your continued use of the
            Service after changes are posted constitutes acceptance of the revised Terms. We
            encourage you to review this page periodically.
          </p>
        </Section>

        <Section title="12. Contact">
          <p>
            Questions about these Terms? Use our{" "}
            <a href={CONTACT_FORM_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
              contact form
            </a>
            .
          </p>
        </Section>

        <footer className="border-t border-border pt-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
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
