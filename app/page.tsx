import Link from "next/link";
import Image from "next/image";
import { HomeExperience } from "@/components/HomeExperience";

export default function Home(){
 return <main>
  <section className="home-hero"><div className="shell home-hero-grid">
    <div className="home-hero-copy"><div className="kicker">Professional Sports Gear Care</div><h1>CLEAN GEAR.<br/><em>READY TO PERFORM.</em></h1>
    <p>Professional cleaning, sanitisation and care for cricket and sports equipment — helping your gear stay fresh, comfortable and ready for the next session.</p>
    <div className="actions"><Link href="/booking" className="btn btn-primary">Book a Cleaning <span aria-hidden="true">↗</span></Link><Link href="#what-we-clean" className="btn btn-secondary">Explore Services</Link></div>
    <ul className="hero-value-points"><li>Better Performance</li><li>Safer for You & Family</li><li>No Itchiness & Irritation</li><li>Longer Gear Life</li></ul></div>
   <div className="gear-stage" aria-label="KitKleen sports equipment care packages">
    <div className="stage-lines" aria-hidden="true"/><div className="stage-stamp">MATCH<br/>READY<span> / 01</span></div>
    <div className="gear-tile tile-pads"><span className="gear-symbol">▥</span><b>PAD<br/>CARE</b></div>
    <div className="gear-tile tile-gloves"><span className="gear-symbol">✣</span><b>GLOVE<br/>WASH</b></div>
    <div className="gear-tile tile-helmet"><span className="gear-symbol">◉</span><b>HELMET<br/>HYGIENE</b></div>
    <div className="gear-tile tile-shoes"><span className="gear-symbol">⌁</span><b>SHOE<br/>RESET</b></div>
    <div className="gear-bag"><span>FIELD KIT / 04</span><Image src="/kitkleen-logo.png" alt="KitKleen logo" width={1254} height={1254} priority/></div>
    <div className="float-card float-a"><small>FULL KIT</small><strong>₹399</strong><span>DEEP CLEAN</span></div>
    <div className="float-card float-b"><small>FULL KIT</small><strong>₹599</strong><span>PRO CARE+</span></div>
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
