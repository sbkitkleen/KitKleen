import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cricket Gear Care Guide | KitKleen",
  description:
    "Practical advice for caring for cricket gear, suggested cleaning intervals and KitKleen service recommendations.",
};

const gearConcerns = [
  {
    title: "Bacteria and unpleasant odours",
    description:
      "Sweat, skin oils and dirt accumulate inside gloves, pads and helmet padding. Moisture encourages microbial growth, potentially creating persistent unpleasant smells.",
  },
  {
    title: "Mould and fungal growth",
    description:
      "When damp equipment is stored in a closed kit bag, moisture can remain trapped for hours or days. This increases the risk of mould growth, particularly in fabric and foam.",
  },
  {
    title: "Material deterioration",
    description:
      "Repeated exposure to sweat, salts and moisture may contribute to leather stiffening, fabric discolouration, weakened stitching and deterioration of some foam or synthetic materials.",
  },
  {
    title: "Skin irritation and hygiene concerns",
    description:
      "Dirty, damp equipment can irritate skin, particularly where it remains in close contact with the body. Sharing poorly maintained equipment can also increase hygiene concerns.",
  },
  {
    title: "Persistent smells throughout the kit bag",
    description:
      "Odours from damp gloves, pads and shoes can affect the entire kit bag. Perfume or deodoriser may temporarily mask smells without removing the underlying sweat residue.",
  },
];

const equipmentCare = [
  {
    name: "Batting gloves",
    description:
      "Air-dry after every game; avoid direct heat and soaking leather.",
    image: "/gear-care/cricket-gloves.jpg",
  },
  {
    name: "Batting pads",
    description:
      "Wipe away surface dirt; open straps and ventilate thoroughly.",
    image: "/gear-care/cricket-pads.jpg",
  },
  {
    name: "Helmet",
    description:
      "Clean the shell and removable padding according to manufacturer instructions.",
    image: "/gear-care/cricket-helmet.jpg",
  },
  {
    name: "Kit bag",
    description: "Empty after use, remove dirt and let the interior dry.",
    image: "/gear-care/kit-bag.jpg",
  },
  {
    name: "Cricket shoes",
    description: "Remove insoles where possible, clean mud and air-dry.",
    image: "/gear-care/footwear.jpg",
  },
  {
    name: "Thigh and arm guards",
    description:
      "Wipe appropriately and dry completely before storing.",
    image: "/gear-care/protective-gear.jpg",
  },
];

const cleaningIntervals = [
  { level: "Everyday care", frequency: "After every match or practice" },
  { level: "Refresh cleaning", frequency: "Every 2–3 matches" },
  { level: "Deep cleaning", frequency: "Every 5–8 matches" },
  {
    level: "Complete kit cleaning",
    frequency: "Every 10–15 matches or 2–3 months",
  },
];

const serviceRecommendations = [
  {
    title: "Refresh Cleaning",
    frequency: "Every 2–3 matches",
    purpose: "Regular maintenance and odour control.",
    includes: [
      "Surface and spot cleaning",
      "Sweat and odour treatment",
      "Controlled drying",
      "Kit bag ventilation and treatment",
      "Ozone treatment only where appropriate and validated",
    ],
  },
  {
    title: "Deep Cleaning",
    frequency: "Every 5–8 matches",
    purpose: "Address accumulated sweat, dirt, stains and odours.",
    includes: [
      "Thorough cleaning of applicable gear surfaces",
      "Cleaning of compatible clothing and equipment",
      "Targeted sweat and odour removal",
      "Appropriate stain treatment",
      "Controlled drying",
      "Validated ozone treatment where suitable",
    ],
  },
  {
    title: "Complete Kit Cleaning",
    frequency: "Every 10–15 matches, or every 2–3 months",
    purpose: "Comprehensive cleaning and care for the entire kit.",
    includes: [
      "Batting pads and gloves",
      "Helmet and compatible padding",
      "Cricket shoes, kit bag, clothing and accessories",
      "Material-appropriate cleaning, drying and inspection",
      "Validated ozone treatment where suitable",
    ],
  },
];

export default function GearCareGuide() {
  return (
    <main>
      <section className="page-hero">
        <div className="shell">
          <div className="crumb">KitKleen / Gear Care Guide</div>
          <h1>
            Care for your kit.
            <br />
            <em>Ready for the next game.</em>
          </h1>
          <p>
            Practical ways to look after cricket equipment, understand
            suggested cleaning intervals and choose a care service.
          </p>
        </div>
      </section>

      <section className="section section-white gear-guide-intro">
        <div className="shell gear-guide-hero">
          <div>
            <div className="eyebrow">A little care goes a long way</div>
            <h2>
              Sweat left behind can affect <em>more than freshness.</em>
            </h2>
            <p>
              Sweat, oils, dirt and moisture can build up in frequently used
              equipment. Let gear dry and air out after use, and follow each
              manufacturer&apos;s care instructions.
            </p>
            <nav className="gear-guide-jumps" aria-label="Guide sections">
              <a href="#sweat-and-gear">Why gear needs care</a>
              <a href="#everyday-care">Everyday care</a>
              <a href="#cleaning-frequency">Cleaning frequency</a>
              <a href="#kitkleen-services">Service recommendations</a>
            </nav>
          </div>
        </div>
      </section>

      <section className="section section-light" id="sweat-and-gear">
        <div className="shell">
          <div className="guide-section-heading">
            <div className="eyebrow">Why gear needs care</div>
            <h2>
              What can happen when sweat remains in <em>cricket gear?</em>
            </h2>
          </div>
          <div className="guide-topic-grid">
            {gearConcerns.map((concern, index) => (
              <article className="guide-topic-card" key={concern.title}>
                <span className="guide-topic-number">0{index + 1}</span>
                <h3>{concern.title}</h3>
                <p>{concern.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-white" id="everyday-care">
        <div className="shell">
          <div className="guide-section-heading">
            <div className="eyebrow">Everyday care</div>
            <h2>
              Help your cricket kit <em>air out.</em>
            </h2>
            <p>
              Follow manufacturer instructions, especially for leather,
              padding and removable components.
            </p>
          </div>
          <div className="equipment-care-grid">
            {equipmentCare.map((item) => (
              <article className="equipment-care-card" key={item.name}>
                <Image
                  src={item.image}
                  alt={item.name}
                  width={240}
                  height={160}
                />
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
          <p className="gear-care-reminder">
            <strong>Never leave sweaty or wet cricket equipment sealed inside a kit bag overnight.</strong>
          </p>
        </div>
      </section>

      <section className="section section-light" id="cleaning-frequency">
        <div className="shell">
          <div className="guide-section-heading">
            <div className="eyebrow">Suggested intervals</div>
            <h2>
              How often should cricket gear be <em>cleaned?</em>
            </h2>
          </div>
          <div className="cleaning-interval-grid">
            {cleaningIntervals.map((interval) => (
              <article className="cleaning-interval-card" key={interval.level}>
                <h3>{interval.level}</h3>
                <p>{interval.frequency}</p>
              </article>
            ))}
          </div>
          <p className="interval-qualification">
            These are practical suggested intervals, not scientifically
            established universal standards. Players who sweat heavily, play
            tournaments or store gear in humid conditions may need cleaning
            more frequently.
          </p>
        </div>
      </section>

      <section className="section section-white" id="kitkleen-services">
        <div className="shell">
          <div className="guide-section-heading">
            <div className="eyebrow">KitKleen service recommendations</div>
            <h2>
              Choose care to match your <em>use.</em>
            </h2>
            <p>
              Frequencies are suggestions. Treatment depends on the equipment
              and its materials; ozone is used only where suitable and
              validated.
            </p>
          </div>
          <div className="service-recommendation-grid">
            {serviceRecommendations.map((service) => (
              <article
                className="service-recommendation-card"
                key={service.title}
              >
                <span className="service-recommendation-frequency">
                  {service.frequency}
                </span>
                <h3>{service.title}</h3>
                <p>{service.purpose}</p>
                <ul>
                  {service.includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <div className="actions">
            <Link className="btn btn-secondary" href="/services">
              Compare services and prices
            </Link>
            <Link className="btn btn-secondary" href="/offers">
              View offers and rewards
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
