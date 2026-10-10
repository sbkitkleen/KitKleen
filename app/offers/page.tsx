import type { Metadata } from "next";
import Link from "next/link";
import {
  academyClubDiscountExplanation,
  academyClubDiscountTiers,
} from "@/lib/data";

export const metadata: Metadata = {
  title: "Offers & Rewards | KitKleen",
  description:
    "Explore KitKleen squad, academy, player loyalty and referral offers.",
};

const squadOffers = [
  { discount: "5%", eligibility: "Minimum order of 4 kits" },
  { discount: "10%", eligibility: "Minimum order of 6 kits" },
];

const playerRewards = [
  {
    title: "First order",
    discount: "5%",
    detail: "For an individual player’s first order.",
  },
  {
    title: "Loyalty reward",
    discount: "10%",
    detail: "Every fifth qualifying order, such as the 5th, 10th and subsequent fifth orders.",
  },
  {
    title: "Milestone reward",
    discount: "100%",
    detail:
      "On the 50th and 100th qualifying orders, the reward covers one complete-kit package only, up to ₹799. Pay any amount above ₹799. It does not cover other items or additional packages in the order.",
  },
];

export default function Offers() {
  return (
    <main>
      <section className="page-hero">
        <div className="shell">
          <div className="crumb">KitKleen / Offers</div>
          <h1>
            Good care deserves
            <br />
            <em>a little extra.</em>
          </h1>
          <p>
            Offers for individual players, squads, academies and clubs. Check
            the eligibility and conditions below before placing an enquiry.
          </p>
          <p>
            Looking after your kit too?{" "}
            <Link className="offer-guide-link" href="/gear-care">
              Read the Gear Care Guide →
            </Link>
          </p>
        </div>
      </section>

      <section className="section section-light offers-section">
        <div className="shell">
          <div className="offers-section-heading">
            <div className="eyebrow">Group offers</div>
            <h2>
              Squad <em>days.</em>
            </h2>
            <p>Arrange a group order for your team.</p>
          </div>
          <div className="offer-card-grid offer-card-grid-two">
            {squadOffers.map((offer) => (
              <article className="offer-card" key={offer.discount}>
                <strong className="offer-rate">{offer.discount}</strong>
                <div>
                  <h3>Squad days</h3>
                  <p>{offer.eligibility}</p>
                </div>
              </article>
            ))}
          </div>
          <p className="offer-note">
            The minimums overlap at 6 kits. Confirm the applicable squad-day
            tier when arranging the order.
          </p>
        </div>
      </section>

      <section className="section section-white offers-section" id="academy-club">
        <div className="shell">
          <div className="offers-section-heading">
            <div className="eyebrow">For academies and clubs</div>
            <h2>
              Care for the <em>whole club.</em>
            </h2>
            <p>{academyClubDiscountExplanation}</p>
          </div>
          <div className="offer-card-grid offer-card-grid-two">
            {academyClubDiscountTiers.map((offer) => (
              <article className="offer-card" key={offer.discount}>
                <strong className="offer-rate">{offer.discount}</strong>
                <div>
                  <h3>Academies / Clubs</h3>
                  <p>{offer.eligibility}</p>
                </div>
              </article>
            ))}
          </div>
          <p className="offer-note offer-academy-qualification">
            The ₹299 eligibility threshold is assessed before the complete-kit
            package discount. A qualifying complete-kit package meets the
            minimum-order requirement. The package&apos;s own advertised price
            remains separate from this additional discount. Eligibility is
            confirmed by the KitKleen team; no promotional amount is applied
            here.
          </p>
        </div>
      </section>

      <section className="section section-light offers-section" id="player-rewards">
        <div className="shell">
          <div className="offers-section-heading">
            <div className="eyebrow">For individual players</div>
            <h2>
              Player <em>rewards.</em>
            </h2>
          </div>
          <div className="offer-card-grid offer-card-grid-three">
            {playerRewards.map((reward) => (
              <article className="offer-card offer-card-tall" key={reward.title}>
                <strong className="offer-rate">{reward.discount}</strong>
                <div>
                  <h3>{reward.title}</h3>
                  <p>{reward.detail}</p>
                </div>
              </article>
            ))}
          </div>
          <p className="offer-note">
            The 50th/100th-order milestone reward is limited to one eligible
            package worth up to ₹799 per redemption. An order may use only one
            additional promotion, so confirm which eligible offer applies to a
            milestone order.
          </p>
        </div>
      </section>

      <section className="section section-white offers-section" id="referrals">
        <div className="shell">
          <div className="offers-section-heading">
            <div className="eyebrow">Share the care</div>
            <h2>
              Referral <em>rewards.</em>
            </h2>
          </div>
          <div className="referral-grid">
            <article className="referral-card">
              <span className="offer-kicker">For the referred customer</span>
              <strong className="offer-rate">10%</strong>
              <h3>Discount on a qualifying referral</h3>
              <p>
                A referred customer receives a 10% discount for each qualifying
                referral. The offer is subject to the ₹299 minimum order
                threshold and cannot be combined with another additional
                promotion.
              </p>
              <p className="offer-note">
                Eligible items and the exact redemption steps for the referred
                customer need confirmation.
              </p>
            </article>
            <article className="referral-card">
              <span className="offer-kicker">For the person making referrals</span>
              <strong className="offer-rate">10%</strong>
              <h3>One coupon for each completed referral</h3>
              <p>
                The bonus is credited only after the referred person’s first
                order is completed successfully. Refer five different people
                and receive five separate 10% coupons. Each coupon is valid for
                30 days and applies to a separate order; multiple referral
                coupons cannot be used on one order.
              </p>
              <p className="offer-note">
                Confirm the coupon validity start date and eligible items when
                redeeming.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section section-light offers-section" id="offer-conditions">
        <div className="shell">
          <div className="offer-conditions">
            <div className="eyebrow">Please read before ordering</div>
            <h2>
              Offer <em>conditions.</em>
            </h2>
            <ul>
              <li>
                A minimum order value of ₹299 is required for a promotional
                discount. This threshold is checked before the complete-kit
                package discount. Selecting a complete-kit package automatically
                meets the minimum, even if its displayed package price is lower.
              </li>
              <li>
                Complete-kit package pricing and an additional promotional
                discount are separate. Package prices already include their
                stated package discount; this does not promise that another
                promotion will stack with it.
              </li>
              <li>
                Only one eligible additional offer may be used per order.
                Squad-day discounts, referral bonuses, festival coupons and
                other promotions cannot be combined.
              </li>
              <li>
                The minimum-order calculation for taxes, delivery fees or other
                charges has not been specified. Confirm the qualifying order
                value when arranging an offer.
              </li>
            </ul>
            <p className="offer-system-note">
              Promotions are not currently calculated or applied in the cart.
              Contact KitKleen to confirm eligibility and have one applicable
              offer noted with your enquiry; displayed service and package
              prices remain unchanged.
            </p>
            <Link className="btn btn-primary" href="/contact">
              Ask about an offer
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
