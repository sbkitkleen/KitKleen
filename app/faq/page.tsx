import {FAQList} from "@/components/FAQ";
const items=[
{q:"What is KitKleen?",a:"KitKleen is a sports gear cleaning, sanitisation and care service, starting with cricket and expanding to more sports."},
{q:"What equipment can I get cleaned?",a:"The current service list includes cricket pads, sports and bike helmets, gloves, guards, shoes, kit bags, sleeves, supporters and keeper gloves with inners."},
{q:"How much does a full kit clean cost?",a:"The current listed packages are ₹399 for Full Cricket Kit Deep Clean and ₹599 for Full Cricket Kit Pro Care+."},
{q:"What is included in Pro Care+?",a:"The listed Pro Care+ package includes dirt removal, stain treatment, odour removal, minor repair and care, leather conditioner and fragrance."},
{q:"Can I book just one item?",a:"Yes. Individual gear can be selected from the Services or Pricing pages and added to the cart."},
{q:"Can I add multiple items to one booking?",a:"Yes. The cart is designed so you can add multiple gear items before continuing with the booking."},
{q:"How do subscriptions work?",a:"The subscription area is currently a planned feature. The page shows concept plans while the commercial model is being finalised."},
{q:"How do I contact KitKleen?",a:"Email sbkitkleen@gmail.com, call +91 89783 71100, or chat with us on WhatsApp."},
];
export default function FAQ(){return <main><section className="page-hero"><div className="shell"><div className="crumb">KitKleen / FAQ</div><h1>Frequently Asked<br/><em>Questions.</em></h1><p>Everything you need to know about services, pricing, booking and what comes next.</p></div></section><section className="section section-light"><div className="shell faq-layout"><div className="faq-nav"><div className="active">Services & Pricing</div><div>Booking</div><div>Subscriptions</div><div>Contact</div></div><FAQList items={items}/></div></section></main>}
