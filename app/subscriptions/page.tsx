import type { Metadata } from "next";
import Link from "next/link";
import { academyClubDiscountTiers } from "@/lib/data";

export const metadata: Metadata = {
  title: "KitKleen Memberships",
  description:
    "Explore planned KitKleen membership options for players, clubs and academies.",
};

const memberships = [
  {
    id: "player-care",
    name: "Player Care",
    audience: "For individual players",
    description:
      "Designed for players who regularly use their cricket gear and want a convenient way to plan repeat cleaning.",
    focus: [
      "Routine gear-care planning",
      "Easier repeat-service enquiries",
      "Care recommendations based on usage",
    ],
    cta: "Register your interest",
  },
  {
    id: "pro-player",
    name: "Pro Player",
    audience: "For players with a complete kit",
    description:
      "Designed for players who want a more considered care routine for their full kit throughout the season.",
    focus: [
      "Complete-kit care planning",
      "Coordinated cleaning for multiple gear items",
      "Personalised service recommendations",
    ],
    cta: "Register your interest",
  },
  {
    id: "club-academy",
    name: "Club & Academy",
    audience: "For academies, clubs and teams",
    description:
      "Designed for organisations coordinating gear care for multiple players and equipment sets.",
    focus: [
      "Team and academy requirements",
      "Multiple-kit service enquiries",
      "Discussion of suitable recurring care arrangements",
    ],
    cta: "Discuss a club plan",
  },
];

const planningSteps = [
  {
    number: "01",
    title: "Tell us about your gear",
    description:
      "Select the membership you’re interested in and describe your gear-care needs.",
  },
  {
    number: "02",
    title: "Choose your care routine",
    description:
      "KitKleen will use your requirements to understand suitable service options and frequency.",
  },
  {
    number: "03",
    title: "Prepare for launch",
    description:
      "Register your interest so the team can follow up when membership plans are finalised.",
  },
];

function membershipInterestLink(membership: string) {
  const subject = encodeURIComponent(`Membership interest: ${membership}`);
  const body = encodeURIComponent(
    `Hello KitKleen,\n\nI am interested in the ${membership} membership option. Please let me know when plans are finalised.\n\nThis is an expression of interest only, not a confirmed subscription or service booking.`
  );

  return `mailto:info@kitkleen.in?subject=${subject}&body=${body}`;
}

export default function Subscriptions() {
  return (
    <main>
      <section className="page-hero membership-hero">
        <div className="shell">
          <div className="crumb">KitKleen / Subscriptions</div>
          <div className="eyebrow">KitKleen memberships</div>
          <h1>
            Care on a schedule.
            <br />
            <em>Stay match-ready.</em>
          </h1>
          <p>
            Your gear deserves consistent care throughout the season. Explore
            membership options designed around your playing routine, the
            equipment you use and how often you need it cleaned.
          </p>
          <p className="membership-status">
            Membership plans are being finalised and are not yet available for
            purchase.
          </p>
          <div className="actions membership-hero-actions">
            <a className="btn btn-primary" href="#membership-options">
              Register your interest
            </a>
            <Link className="btn btn-secondary" href="/services#individual-gear">
              Explore gear care
            </Link>
          </div>
          <p className="membership-enquiry-note">
            Interest links open an email draft with your selected option. Your
            interest is not registered until you send it.
          </p>
        </div>
      </section>

      <section className="section section-white" id="membership-options">
        <div className="shell">
          <div className="membership-section-heading">
            <div className="eyebrow">Planned membership options</div>
            <h2>
              Find a routine that fits <em>your game.</em>
            </h2>
            <p>
              These are areas being considered, not guaranteed benefits of an
              available subscription.
            </p>
          </div>
          <div className="membership-card-grid">
            {memberships.map((membership) => (
              <article className="membership-card" key={membership.id}>
                <div className="membership-card-top">
                  <span className="membership-planned">Planned membership</span>
                  <span className="membership-index">
                    {membership.id === "player-care"
                      ? "01"
                      : membership.id === "pro-player"
                        ? "02"
                        : "03"}
                  </span>
                </div>
                <h3>{membership.name}</h3>
                <strong className="membership-audience">
                  {membership.audience}
                </strong>
                <p>{membership.description}</p>
                <div className="membership-focus">
                  <span>Potential focus</span>
                  <ul>
                    {membership.focus.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <a
                  className="btn btn-secondary"
                  href={membershipInterestLink(membership.name)}
                >
                  {membership.cta}
                </a>
              </article>
            ))}
          </div>
          <p className="membership-enquiry-note">
            The interest email identifies your selected option in its subject.
            No OTP is collected or verified through this email link; a verified
            membership enquiry flow is not available yet.
          </p>
        </div>
      </section>

      <section className="section section-light">
        <div className="shell">
          <div className="membership-section-heading">
            <div className="eyebrow">Membership planning</div>
            <h2>
              From your needs to a <em>care routine.</em>
            </h2>
          </div>
          <div className="membership-steps">
            {planningSteps.map((step) => (
              <article className="membership-step" key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-white">
        <div className="shell membership-comparison">
          <div>
            <div className="eyebrow">Choose what suits you</div>
            <h2>
              One-time care or <em>planned membership?</em>
            </h2>
          </div>
          <div className="membership-comparison-grid">
            <article>
              <span>01 / ONE-TIME GEAR CARE</span>
              <h3>One-time gear care</h3>
              <p>
                For players who need a cleaning service when their gear needs
                attention.
              </p>
              <Link className="text-link" href="/services#individual-gear">
                Explore services →
              </Link>
            </article>
            <article>
              <span>02 / PLANNED MEMBERSHIPS</span>
              <h3>Planned memberships</h3>
              <p>
                For players, clubs and academies interested in a more regular
                gear-care arrangement.
              </p>
              <a className="text-link" href="#membership-options">
                View membership options →
              </a>
            </article>
          </div>
          <p className="membership-finalising-note">
            Membership pricing, billing frequency, included services and
            benefits are still being finalised. A membership is not required to
            use individual cleaning services.
          </p>
        </div>
      </section>

      <section className="section section-light">
        <div className="shell membership-discount">
          <div>
            <div className="eyebrow">Separate from memberships</div>
            <h2>Club and academy care</h2>
            <p>
              Academies and clubs may be eligible for repeat-order discounts on
              qualifying orders. The applicable rate depends on the order size
              and eligibility. These order discounts are separate from planned
              memberships.
            </p>
            <Link className="text-link" href="/offers#academy-club">
              View full offer conditions →
            </Link>
          </div>
          <ul>
            {academyClubDiscountTiers.map((tier) => (
              <li key={tier.discount}>
                <strong>{tier.discount}</strong> for orders of{" "}
                {tier.eligibility.toLowerCase()}.
              </li>
            ))}
            <li>
              Available on every qualifying academy/club order above ₹299,
              subject to eligibility.
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
