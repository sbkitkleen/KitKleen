import Link from "next/link";
import Image from "next/image";
import { HomeExperience } from "@/components/HomeExperience";

export default function Home(){
 return <main>
  <section className="home-hero"><div className="shell home-hero-grid">
    <div className="home-hero-copy"><div className="kicker">Professional Sports Gear Care</div><h1>CLEAN GEAR.<br/><em>READY TO PERFORM.</em></h1>
    <p>Professional cleaning, sanitisation and care for sports gear — helping your kit stay fresh, comfortable and ready for the next session.</p>
    <p className="home-availability">Currently available in Hyderabad only.</p>
    <div className="actions"><Link href="/booking" className="btn btn-primary">Book Your Kit Care <span aria-hidden="true">↗</span></Link><Link href="#what-we-clean" className="btn btn-secondary">Explore Services</Link></div></div>
    <div
      className="gear-stage"
      aria-label="KitKleen professional sports gear care"
    >
      <Image
        className="gear-hero-image"
        src="/gear-care-hero.png"
        alt="KitKleen professional sports gear care for cricket pads, gloves, helmet and shoes"
        width={900}
        height={600}
        priority
      />
    </div>
  </div></section>
  <section className="feature-strip"><div className="shell feature-grid">
   <div className="feature"><div className="feature-icon">✦</div><div><strong>Deep Cleaning</strong><span>Dirt & stain focused</span></div></div>
   <div className="feature"><div className="feature-icon">≈</div><div><strong>Odour Control</strong><span>Freshness-focused care</span></div></div>
   <div className="feature"><div className="feature-icon">◈</div><div><strong>Sanitisation</strong><span>Hygiene-focused process</span></div></div>
   <div className="feature"><div className="feature-icon">✓</div><div><strong>Gear-Safe Care</strong><span>Material-conscious handling</span></div></div>
  </div></section>
  <HomeExperience />
 </main>;
}
