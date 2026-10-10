import {FAQList} from "@/components/FAQ";
import {academyClubDiscountFaqAnswer} from "@/lib/data";
const items=[
{q:"What is KitKleen?",a:"KitKleen is a sports gear cleaning, sanitisation and care service, starting with cricket and expanding to more sports."},
{q:"What equipment can I get cleaned?",a:"Services include cricket pads, bike and sports helmets, sports and wicket-keeping gloves with inners, protective gear, kit bags in four sizes, apparel and support gear, cricket shoes, studded boots, track-and-field spikes, running and court shoes, and yoga mats."},
{q:"What are KITKLEEN Fresh, Deep and Elite?",a:"Fresh is Essential Care, Deep is Deep Care, and Elite is Premium Pro Care. The Services page compares their care benefits and item prices."},
{q:"How much do complete-kit packages cost?",a:"The Cricket Kit is ₹299 Fresh, ₹399 Deep and ₹549 Elite. The Wicket Keeper Batsman Kit is ₹449 Fresh, ₹599 Deep and ₹749 Elite."},
{q:"What is included in the complete-kit packages?",a:"The Cricket Kit includes a pair of pads (only batting), a pair of gloves (only batting), one helmet, a thigh guard pair and a kit bag up to Large. The Wicket Keeper Batsman Kit also includes a pair of wicket-keeping gloves and a pair of wicket-keeping pads."},
{q:"Can I enquire about one item or a complete kit?",a:"Yes. Explore individual gear prices and complete-kit packages on the Services page, then contact KitKleen with your enquiry."},
{q:"Are bookings operational now?",a:"KitKleen is coming soon to Hyderabad. Contact us to enquire about services and launch timing; bookings are not yet operational."},
{q:"How do subscriptions work?",a:"The subscription area is currently a planned feature. The page shows concept plans while the commercial model is being finalised."},
{q:"How often should I clean cricket gear?",a:"The suggested intervals are after every match or practice for everyday care, every 2–3 matches for refresh cleaning, every 5–8 matches for deep cleaning and every 10–15 matches or 2–3 months for a complete kit. These are practical suggestions, not universal scientific standards; see the Gear Care Guide for the full qualification and equipment advice."},
{q:"What discounts are available for academies and clubs?",a:academyClubDiscountFaqAnswer},
{q:"How do I contact KitKleen?",a:"Email info@kitkleen.in, call +91 89783 71100, or chat with us on WhatsApp."},
];
export default function FAQ(){return <main><section className="page-hero"><div className="shell"><div className="crumb">KitKleen / FAQ</div><h1>Frequently Asked<br/><em>Questions.</em></h1><p>Everything you need to know about services, pricing, booking and what comes next.</p></div></section><section className="section section-light"><div className="shell faq-layout"><div className="faq-nav"><div className="active">Services & Pricing</div><div>Booking</div><div>Subscriptions</div><div>Contact</div></div><FAQList items={items}/></div></section></main>}
