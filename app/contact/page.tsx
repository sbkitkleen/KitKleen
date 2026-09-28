"use client";
import {useState} from "react";
export default function Contact(){
 const [sent,setSent]=useState(false);
 return <main><section className="page-hero"><div className="shell"><div className="crumb">KitKleen / Contact</div><h1>Let’s talk<br/><em>gear care.</em></h1><p>Questions, bulk requirements, academy or club enquiries — send us a message.</p></div></section><section className="section section-white"><div className="shell contact-grid">
 <div className="contact-cards">
  <div className="contact-card"><small>Email</small><strong><a href="mailto:sbkitkleen@gmail.com">sbkitkleen@gmail.com</a></strong><p>Best for general enquiries.</p></div>
  <div className="contact-card"><small>Phone</small><strong><a href="tel:+918978371100">+91 89783 71100</a></strong><p>Call during business hours.</p></div>
    <div className="contact-card"><small>WhatsApp</small><strong><a href="https://wa.me/918978371100?text=Hi%20KitKleen%2C%20I%20would%20like%20to%20know%20more%20about%20your%20sports%20gear%20cleaning%20services." target="_blank" rel="noreferrer">Chat on WhatsApp →</a></strong><p>Quickest route for booking discussions.</p></div>
 </div>
 <div className="form-card"><div className="eyebrow">Send a message</div><h2 style={{fontFamily:"Barlow Condensed",fontSize:42,margin:"10px 0 20px",textTransform:"uppercase"}}>How can we help?</h2>
 {sent?<div className="empty-state"><h2>Thanks.</h2><p>Your message form is ready for the Supabase connection in the next phase.</p></div>:<form className="form-grid" onSubmit={(e)=>{e.preventDefault();setSent(true)}}><div><label>Name *</label><input required placeholder="Your name"/></div><div><label>Phone</label><input placeholder="8978371100"/></div><div className="full"><label>Email *</label><input required type="email" placeholder="you@example.com"/></div><div className="full"><label>Message *</label><textarea required placeholder="Tell us what you need..." /></div><div className="full form-submit"><button className="btn btn-primary">Send Message →</button><div className="form-note">The form is currently front-end only. We will connect it to Supabase later.</div></div></form>}
 </div></div></section></main>}
