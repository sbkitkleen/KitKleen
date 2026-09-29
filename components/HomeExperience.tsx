"use client";

import Link from "next/link";
import { useEffect } from "react";
import { packages } from "@/lib/data";
import { PackageCard } from "@/components/PackageCard";
import {
  FaArrowRight,
  FaBagShopping,
  FaBaseballBatBall,
  FaHands,
  FaHelmetSafety,
  FaShieldHalved,
  FaShoePrints,
} from "react-icons/fa6";

const steps = [
  [
    "01",
    "INSPECT",
    "We check materials, wear and areas that need extra attention.",
  ],
  [
    "02",
    "DEEP CLEAN",
    "Dirt and build-up are lifted with gear-conscious care.",
  ],
  [
    "03",
    "SANITISE",
    "A focused hygiene process helps gear feel fresher.",
  ],
  [
    "04",
    "CARE & RESTORE",
    "We finish with considered care for the next session.",
  ],
];

const benefits = [
  "Professional Cleaning",
  "Gear-Safe Treatment",
  "Odour Control",
  "Sanitisation",
  "Material-Conscious Care",
  "Convenient Service",
];

const audiences = [
  "INDIVIDUAL PLAYERS",
  "ACADEMIES",
  "CRICKET CLUBS",
  "TOURNAMENTS",
  "SPORTS ORGANISATIONS",
  "SPORTS FACILITIES",
];

const gearCategories = [
  {
    title: "CRICKET GEAR",
    description: "Pads and essential cricket gear care",
    icon: FaBaseballBatBall,
    image: "/gear-care/cricket-gear.jpg",
  },
  {
    title: "HELMETS",
    description: "Sports and bike helmet care",
    icon: FaHelmetSafety,
    image: "/gear-care/helmet.jpg",
  },
  {
    title: "GLOVES",
    description: "Sports and keeper glove care",
    icon: FaHands,
    image: "/gear-care/gloves.jpg",
  },
  {
    title: "PROTECTIVE GEAR",
    description: "Thigh, elbow, chest and shin guard care",
    icon: FaShieldHalved,
    image: "/gear-care/protective-gear.jpg",
  },
  {
    title: "FOOTWEAR",
    description: "Sports shoes and footwear care",
    icon: FaShoePrints,
    image: "/gear-care/footwear.jpg",
  },
  {
    title: "KIT BAGS",
    description: "Cleaning and care for sports kit bags",
    icon: FaBagShopping,
    image: "/gear-care/kit-bag.jpg",
  },
];

const careBenefits = [
  {
    icon: "↗",
    title: "BETTER PERFORMANCE",
    description:
      "Clean, fresh and properly cared-for gear helps you stay comfortable, focused and ready for the next session.",
  },
  {
    icon: "◈",
    title: "SAFER FOR YOU & FAMILY",
    description:
      "Regular cleaning and sanitisation help reduce sweat, dirt, odour and unwanted build-up on frequently used sports gear.",
  },
  {
    icon: "≈",
    title: "NO ITCHINESS & IRRITATION",
    description:
      "Removing accumulated sweat, dirt and residue helps keep gear cleaner and more comfortable to wear, reducing conditions that can contribute to discomfort.",
  },
  {
    icon: "⟲",
    title: "LONGER GEAR LIFE",
    description:
      "Material-conscious cleaning, drying and care help reduce unnecessary wear and support the condition and longer-term use of your gear.",
  },
];

const performanceSteps = [
  "CLEAN GEAR",
  "COMFORT",
  "CONFIDENCE",
  "READY TO PERFORM",
];

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="section-title home-section-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
      </div>
      {description && <p>{description}</p>}
    </div>
  );
}

export function HomeExperience() {
  useEffect(() => {
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-scroll-reveal]")
    );

    if (!("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("is-revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        }),
      {
        threshold: 0.12,
        rootMargin: "0px 0px -36px 0px",
      }
    );

    targets.forEach((target) =>
      target.classList.add("reveal-pending")
    );

    targets.forEach((target) => observer.observe(target));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* WHY PROPER GEAR CARE MATTERS */}
      <section className="care-matters-section">
        <div className="shell care-matters-layout">
          <div className="care-matters-copy" data-scroll-reveal>
            <div className="eyebrow">
              Why Proper Gear Care Matters
            </div>

            <h2>
              CLEAN GEAR. BETTER COMFORT.
              <br />
              <em>LONGER GEAR LIFE.</em>
            </h2>

            <p>
              Sports gear and kit bags are used frequently and can
              accumulate sweat, dirt/soil, moisture, odour and
              microbial contamination.
            </p>

            <p>
              Leaving gear in direct sunlight may dry the surface,
              while wet wipes may remove some visible dirt, but these
              are temporary measures and are not substitutes for
              proper cleaning and care.
            </p>

            <p>
              Regular, professional gear care helps maintain hygiene,
              cleanliness, odour control, comfort and the overall
              condition of your gear.
            </p>

            <p>
              <strong>KitKleen is designed around sports gear.</strong>{" "}
              From helmets and pads to gloves, footwear, kit bags and
              protective gear, our cleaning and care approach considers
              the materials, construction and everyday use of each
              piece — not just the dirt on the surface.
            </p>
          </div>

          <div className="care-benefit-grid">
            {careBenefits.map((benefit, index) => (
              <article
                className="care-benefit"
                data-scroll-reveal
                key={benefit.title}
                style={
                  {
                    "--reveal-delay": `${index * 75}ms`,
                  } as React.CSSProperties
                }
              >
                <div className="care-benefit-top">
                  <span
                    className="care-icon"
                    aria-hidden="true"
                  >
                    {benefit.icon}
                  </span>
                </div>

                <h3>{benefit.title}</h3>

                <p>{benefit.description}</p>

                <span
                  className="care-card-rule"
                  aria-hidden="true"
                />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PERFORMANCE / PREPARATION */}
      <section className="ozone-section">
  <div className="shell ozone-layout" data-scroll-reveal>

    <div className="ozone-copy">
      <div className="eyebrow">Powered by Controlled Ozone Technology</div>

      <h2>
        CLEAN GEAR. FRESHER FEEL.
        <br />
        <em>READY FOR THE NEXT MATCH.</em>
      </h2>

      <p>
        KitKleen combines professional cleaning with controlled ozone
        treatment as part of its sanitisation process. Ozone treatment
        helps address persistent odour and microbial contamination on
        suitable sports gear, including areas that can be difficult to
        reach through surface cleaning alone.
      </p>

      <div className="ozone-process">
        <div className="ozone-process-step">
          <span className="ozone-process-icon">◌</span>
          <strong>Physical Cleaning</strong>
        </div>

        <span className="ozone-process-arrow">→</span>

        <div className="ozone-process-step">
          <span className="ozone-process-icon">≈</span>
          <strong>Drying</strong>
        </div>

        <span className="ozone-process-arrow">→</span>

        <div className="ozone-process-step">
          <span className="ozone-process-icon">O₃</span>
          <strong>Controlled Ozone Treatment</strong>
        </div>

        <span className="ozone-process-arrow">→</span>

        <div className="ozone-process-step">
          <span className="ozone-process-icon">↘</span>
          <strong>Controlled Ozone Removal</strong>
        </div>

        <span className="ozone-process-arrow">→</span>

        <div className="ozone-process-step">
          <span className="ozone-process-icon">✓</span>
          <strong>Final Care &amp; Quality Check</strong>
        </div>
      </div>

      <div className="ozone-benefit-grid">

        <article className="ozone-benefit">
          <div className="ozone-benefit-icon">O₃</div>
          <div>
            <h3>REACHES HARD-TO-REACH AREAS</h3>
            <p>
              Controlled ozone treatment can reach spaces around and within
              suitable gear surfaces that may be difficult to clean through
              wiping alone.
            </p>
          </div>
        </article>

        <article className="ozone-benefit">
          <div className="ozone-benefit-icon">≋</div>
          <div>
            <h3>HELPS CONTROL ODOUR</h3>
            <p>
              Ozone treatment helps break down odour-causing compounds,
              supporting fresher-smelling gear after repeated use.
            </p>
          </div>
        </article>

        <article className="ozone-benefit">
          <div className="ozone-benefit-icon">✓</div>
          <div>
            <h3>CONTROLLED SANITISATION</h3>
            <p>
              Under controlled treatment conditions, ozone can help reduce
              microbial contamination on suitable gear surfaces.
            </p>
          </div>
        </article>

        <article className="ozone-benefit">
          <div className="ozone-benefit-icon">⚙</div>
          <div>
            <h3>CONTROLLED PROCESS</h3>
            <p>
              After treatment, ozone is safely broken down and removed as
              part of the controlled process before the gear is returned.
            </p>
          </div>
        </article>

      </div>
    </div>

    <div
      className="ozone-technology-visual"
      aria-label="Controlled ozone treatment for sports gear"
    >
      <img
        className="ozone-treatment-image"
        src="/ozone-treatment.png"
        alt="Sports gear inside a controlled ozone sanitisation chamber"
      />
    </div>

  </div>
</section>
      <section className="performance-section">
        <div
          className="shell performance-layout"
          data-scroll-reveal
        >
          <div className="performance-copy">
            <div className="eyebrow">
              Care is part of your preparation
            </div>

            <h2>
              SAME GEAR.
              <br />
              <em>BETTER READY.</em>
            </h2>

            <p>
              Your sports gear is part of your game. Keeping it clean,
              fresh and properly cared for helps you feel comfortable
              and ready when it matters.
            </p>
          </div>

          <div
            className="performance-flow"
            aria-label="Clean gear leads to comfort, confidence and being ready to perform"
          >
            {performanceSteps.map((step, index) => (
              <div
                className="performance-step"
                key={step}
              >
                <span className="performance-node">
                  0{index + 1}
                </span>

                <strong>{step}</strong>

                {index < performanceSteps.length - 1 && (
                  <span
                    className="performance-arrow"
                    aria-hidden="true"
                  >
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EXPLORE GEAR CARE */}
      <section
        className="gear-category-section"
        id="what-we-clean"
      >
        <div className="shell">
          <SectionHeading
            eyebrow="Explore Gear Care"
            title={
              <>
                CARE FOR EVERY PIECE{" "}
                <em>OF YOUR GAME.</em>
              </>
            }
            description="From protective gear and gloves to footwear and kit bags, explore professional care options designed around sports gear."
          />

          <div className="gear-category-grid">
            {gearCategories.map((category) => {
              const Icon = category.icon;

              return (
                <Link
                  className="gear-category-card"
                  href="/pricing"
                  key={category.title}
                >
                  <div
                    className="gear-category-image"
                    style={{
                      backgroundImage: `url(${category.image})`,
                    }}
                    role="img"
                    aria-label={`${category.title} professional gear care`}
                  >
                    <span className="gear-category-icon">
                      <Icon aria-hidden="true" />
                    </span>
                  </div>

                  <h3>{category.title}</h3>

                  <p>{category.description}</p>

                  <FaArrowRight
                    className="gear-category-arrow"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>

          <div className="gear-category-action">
            <Link
              className="btn btn-primary"
              href="/pricing"
            >
              View All Gear &amp; Pricing{" "}
              <FaArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* COMPLETE KIT PACKAGES */}
      <section className="section package-home-section">
        <div className="shell">
          <SectionHeading
            eyebrow="Complete Kit Packages"
            title={
              <>
                FULL KIT.
                <br />
                <em>FULLY CARED FOR.</em>
              </>
            }
            description="Two complete-kit options. Clear inclusions, no guesswork."
          />

          <div className="package-grid">
            {packages.map((item) => (
              <PackageCard
                item={item}
                key={item.id}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CARE PROCESS */}
      <section className="section process-section">
        <div className="shell">
          <SectionHeading
            eyebrow="A considered care process"
            title={
              <>
                FROM FIELD-WORN <em>TO READY.</em>
              </>
            }
            description="Four deliberate steps. Every time your sports gear comes through."
          />

          <div className="timeline">
            {steps.map(
              ([number, title, description]) => (
                <article
                  className="timeline-step"
                  key={number}
                >
                  <div className="timeline-marker">
                    <span>{number}</span>
                  </div>

                  <div className="timeline-copy">
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                </article>
              )
            )}
          </div>
        </div>
      </section>

      {/* GEAR CARE BENEFITS */}
      <section className="section section-white">
        <div className="shell why-layout">
          <div className="why-heading">
            <div className="eyebrow">
              Made for the kit room
            </div>

            <h2>
              YOUR GEAR TAKES A BEATING.
              <br />
              <em>WE HELP IT STAY READY.</em>
            </h2>

            <p>
              Thoughtful care for the sports gear that shows up
              with you.
            </p>
          </div>

          <div className="benefit-grid">
            {benefits.map((title, index) => (
              <article
                className="benefit-item"
                key={title}
              >
                <span>0{index + 1}</span>

                <h3>{title}</h3>

                <p>
                  {
                    [
                      "Focused care that helps remove dirt and match-day build-up from sports gear.",
                      "Methods chosen with sports gear materials and construction in mind.",
                      "Freshness-focused cleaning and drying for hard-worked gear.",
                      "A considered process supporting cleaner, fresher sports gear.",
                      "Attention to the materials and construction of each piece.",
                      "Simple booking for players, teams and gear rooms.",
                    ][index]
                  }
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* AUDIENCE */}
      <section className="audience-section">
        <div className="shell">
          <SectionHeading
            eyebrow="From one player to a whole squad"
            title={
              <>
                CARE FOR EVERY <em>LINE-UP.</em>
              </>
            }
            description="Built around cricket today, with a service mindset that can support more sports tomorrow."
          />

          <div className="audience-grid">
            {audiences.map((audience, index) => (
              <div
                className="audience-item"
                key={audience}
              >
                <span>0{index + 1}</span>
                <strong>{audience}</strong>
                <b aria-hidden="true">↗</b>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RESEARCH & TESTING */}
      <section className="research-preview">
        <div className="shell research-preview-inner">
          <div>
            <span className="research-preview-label">
              KITKLEEN / RESEARCH &amp; TESTING
            </span>

            <h2>
              SPORTS GEAR DESERVES
              <br />
              <em>MORE THAN A REGULAR WASH.</em>
            </h2>

            <p>
              Our approach is shaped around sports gear, the
              materials it uses and the care it needs.
            </p>
          </div>

          <Link href="/about">
            About our care process{" "}
            <FaArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* BOOKING CTA */}
      <section className="booking-band">
        <div className="shell booking-inner">
          <div>
            <div className="eyebrow">
              Ready when your kit is
            </div>

            <h2>
              YOUR GEAR WORKS HARD.
              <br />
              <em>GIVE IT PROPER CARE.</em>
            </h2>
          </div>

          <div className="booking-actions">
            <Link
              className="btn btn-primary"
              href="/booking"
            >
              Book Your Kit Care{" "}
              <span aria-hidden="true">↗</span>
            </Link>

            <a
              className="btn btn-secondary"
              href="https://wa.me/918978371100?text=Hi%20KitKleen%2C%20I%27d%20like%20to%20enquire%20about%20sports%20gear%20cleaning."
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp Us{" "}
              <span aria-hidden="true">↗</span>
            </a>

            <a
              className="booking-email"
              href="mailto:sbkitkleen@gmail.com"
            >
              sbkitkleen@gmail.com
            </a>
          </div>
        </div>
      </section>
    </>
  );
}