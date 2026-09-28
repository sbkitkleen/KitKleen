"use client";

import Link from "next/link";
import { useEffect } from "react";
import { packages } from "@/lib/data";
import { PackageCard } from "@/components/PackageCard";
import { FaArrowRight, FaBagShopping, FaBaseballBatBall, FaHands, FaHelmetSafety, FaShieldHalved, FaShoePrints } from "react-icons/fa6";

const steps=[["01","INSPECT","We check materials, wear and areas that need extra attention."],["02","DEEP CLEAN","Dirt and build-up are lifted with gear-conscious care."],["03","SANITISE","A focused hygiene process helps gear feel fresher."],["04","CARE & RESTORE","We finish with considered care for the next session."]];
const benefits=["Professional Cleaning","Gear-Safe Treatment","Odour Control","Sanitisation","Material-Conscious Care","Convenient Service"];
const audiences=["INDIVIDUAL PLAYERS","ACADEMIES","CRICKET CLUBS","TOURNAMENTS","SPORTS ORGANISATIONS","SPORTS FACILITIES"];
const gearCategories=[
  {title:"CRICKET GEAR",description:"Pads and essential cricket equipment",icon:FaBaseballBatBall},
  {title:"HELMETS",description:"Sports and bike helmet care",icon:FaHelmetSafety},
  {title:"GLOVES",description:"Sports and keeper glove care",icon:FaHands},
  {title:"PROTECTIVE GEAR",description:"Thigh, elbow, chest and shin guards",icon:FaShieldHalved},
  {title:"FOOTWEAR",description:"Sports shoes and footwear care",icon:FaShoePrints},
  {title:"KIT BAGS",description:"Cleaning and care for sports kit bags",icon:FaBagShopping},
];
const careBenefits=[
  {icon:"↗",title:"BETTER PERFORMANCE",description:"Clean, fresh gear helps you stay comfortable and focused on the game."},
  {icon:"◈",title:"SAFER FOR YOU & FAMILY",description:"Regular sanitisation helps reduce bacteria, germs and unwanted build-up on frequently used equipment."},
  {icon:"≈",title:"NO ITCHINESS & IRRITATION",description:"Proper cleaning helps remove sweat, dirt and residue that can contribute to discomfort."},
  {icon:"⟲",title:"LONGER GEAR LIFE",description:"Material-conscious cleaning, drying and care helps protect equipment from unnecessary wear."},
];
const performanceSteps=["CLEAN GEAR","COMFORT","CONFIDENCE","READY TO PERFORM"];

function SectionHeading({eyebrow,title,description}:{eyebrow:string;title:React.ReactNode;description?:string}) {
  return <div className="section-title home-section-title"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2></div>{description&&<p>{description}</p>}</div>;
}

export function HomeExperience() {
  useEffect(()=>{
    const targets=Array.from(document.querySelectorAll<HTMLElement>("[data-scroll-reveal]"));
    if(!("IntersectionObserver" in window)){
      targets.forEach(target=>target.classList.add("is-revealed"));
      return;
    }
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      }
    }),{threshold:.12,rootMargin:"0px 0px -36px 0px"});
    targets.forEach(target=>target.classList.add("reveal-pending"));
    targets.forEach(target=>observer.observe(target));
    return ()=>observer.disconnect();
  },[]);

  return <>
    <section className="care-matters-section"><div className="shell care-matters-layout">
      <div className="care-matters-copy" data-scroll-reveal><div className="eyebrow">Why Proper Gear Care Matters</div><h2>MORE THAN JUST CLEAN.<br/><em>YOUR GEAR. YOUR COMFORT. YOUR PERFORMANCE.</em></h2>
        <p>Sports equipment collects sweat, dirt, moisture, odour and everyday wear. A regular/basic wash is not always suitable for equipment made from different materials.</p>
        <p>KitKleen is designed around sports gear — with appropriate cleaning, sanitisation, drying and care for frequently used equipment.</p>
        <div className="care-elements"><span>SWEAT</span><i/><span>DIRT</span><i/><span>MOISTURE</span><i/><span>ODOUR</span></div>
      </div>
      <div className="care-benefit-grid">{careBenefits.map((benefit,index)=><article className="care-benefit" data-scroll-reveal key={benefit.title} style={{"--reveal-delay":`${index*75}ms`} as React.CSSProperties}>
        <div className="care-benefit-top"><span className="care-icon" aria-hidden="true">{benefit.icon}</span><span className="care-number">0{index+1} / KIT CARE</span></div>
        <h3>{benefit.title}</h3><p>{benefit.description}</p><span className="care-card-rule" aria-hidden="true"/>
      </article>)}</div>
    </div></section>

    <section className="performance-section"><div className="shell performance-layout" data-scroll-reveal>
      <div className="performance-copy"><div className="eyebrow">Care is part of your preparation</div><h2>SAME GEAR.<br/><em>BETTER READY.</em></h2><p>Your equipment is part of your game. Keeping it clean, fresh and properly cared for helps you feel comfortable and ready when it matters.</p></div>
      <div className="performance-flow" aria-label="Clean gear leads to comfort, confidence and being ready to perform">{performanceSteps.map((step,index)=><div className="performance-step" key={step}><span className="performance-node">0{index+1}</span><strong>{step}</strong>{index<performanceSteps.length-1&&<span className="performance-arrow" aria-hidden="true">→</span>}</div>)}</div>
    </div></section>

    <section className="gear-category-section" id="what-we-clean"><div className="shell">
      <SectionHeading eyebrow="Explore Gear Care" title={<>CARE FOR EVERY PIECE <em>OF YOUR GAME.</em></>} description="From protective gear and gloves to footwear and kit bags, explore professional care options designed around sports equipment." />
      <div className="gear-category-grid">{gearCategories.map((category,index)=>{
        const Icon=category.icon;
        return <Link className="gear-category-card" href="/pricing" key={category.title}>
          <div className="gear-category-top"><span className="gear-category-icon"><Icon aria-hidden="true"/></span><span className="gear-category-index">KIT / 0{index+1}</span></div>
          <h3>{category.title}</h3><p>{category.description}</p><FaArrowRight className="gear-category-arrow" aria-hidden="true"/>
        </Link>;
      })}</div>
      <div className="gear-category-action"><Link className="btn btn-primary" href="/pricing">View All Gear &amp; Pricing <FaArrowRight aria-hidden="true"/></Link></div>
    </div></section>

    <section className="section package-home-section"><div className="shell">
      <SectionHeading eyebrow="Complete Kit Packages" title={<>FULL KIT.<br/><em>FULLY CARED FOR.</em></>} description="Two complete-kit options. Clear inclusions, no guesswork." />
      <div className="package-grid">{packages.map(item=><PackageCard item={item} key={item.id}/>)}</div>
    </div></section>

    <section className="section process-section"><div className="shell">
      <SectionHeading eyebrow="A considered care process" title={<>FROM FIELD-WORN <em>TO READY.</em></>} description="Four deliberate steps. Every time your equipment comes through." />
      <div className="timeline">{steps.map(([number,title,description])=><article className="timeline-step" key={number}><div className="timeline-marker"><span>{number}</span></div><div className="timeline-copy"><h3>{title}</h3><p>{description}</p></div></article>)}</div>
    </div></section>

    <section className="section section-white"><div className="shell why-layout">
      <div className="why-heading"><div className="eyebrow">Made for the kit room</div><h2>YOUR GEAR TAKES A BEATING.<br/><em>WE HELP IT STAY READY.</em></h2><p>Thoughtful care for the equipment that shows up with you.</p></div>
      <div className="benefit-grid">{benefits.map((title,index)=><article className="benefit-item" key={title}><span>0{index+1}</span><h3>{title}</h3><p>{["Focused care that helps remove dirt and match-day build-up.","Methods chosen with sports equipment materials in mind.","Freshness-focused cleaning for hard-worked kit.","A considered process for equipment hygiene.","Attention to the construction of each piece.","Simple booking for players, teams and gear rooms."][index]}</p></article>)}</div>
    </div></section>

    <section className="audience-section"><div className="shell"><SectionHeading eyebrow="From one player to a whole squad" title={<>CARE FOR EVERY <em>LINE-UP.</em></>} description="Built around cricket today, with a service mindset that can support more sports tomorrow." /><div className="audience-grid">{audiences.map((audience,index)=><div className="audience-item" key={audience}><span>0{index+1}</span><strong>{audience}</strong><b aria-hidden="true">↗</b></div>)}</div></div></section>

    <section className="research-preview"><div className="shell research-preview-inner"><div><span className="research-preview-label">KITKLEEN / RESEARCH & TESTING</span><h2>SPORTS GEAR DESERVES<br/><em>MORE THAN A REGULAR WASH.</em></h2><p>Our approach is shaped around sports equipment, the materials it uses and the care it needs.</p></div><Link href="/about">About our care process <FaArrowRight aria-hidden="true"/></Link></div></section>

    <section className="booking-band"><div className="shell booking-inner"><div><div className="eyebrow">Ready when your kit is</div><h2>YOUR GEAR WORKS HARD.<br/><em>GIVE IT PROPER CARE.</em></h2></div><div className="booking-actions"><Link className="btn btn-primary" href="/booking">Book a Cleaning <span aria-hidden="true">↗</span></Link><a className="btn btn-secondary" href="https://wa.me/918978371100?text=Hi%20KitKleen%2C%20I%27d%20like%20to%20enquire%20about%20sports%20gear%20cleaning." target="_blank" rel="noreferrer">WhatsApp Us <span aria-hidden="true">↗</span></a><a className="booking-email" href="mailto:sbkitkleen@gmail.com">sbkitkleen@gmail.com</a></div></div></section>
  </>;
}