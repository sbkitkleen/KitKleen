"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FaEnvelope, FaFacebookF, FaInstagram, FaPhone, FaWhatsapp, FaYoutube } from "react-icons/fa6";
import { navItems } from "@/lib/data";
import { useCart } from "./CartContext";

export function SiteHeader() {
  const path = usePathname();
  const {count} = useCart();
  const [open,setOpen] = useState(false);
  if(path==="/admin"||path.startsWith("/admin/bookings/")) return null;
  return <>
    <header className="header"><div className="shell header-inner">
      <Link href="/" className="brand-link" onClick={()=>setOpen(false)}>
        <Image src="/kitkleen-logo.png" alt="KitKleen" width={72} height={72} className="brand-logo" loading="eager" />
        <span className="brand-word">KIT<span>KLEEN</span></span>
      </Link>
      <nav className={`main-nav ${open ? "nav-open":""}`}>
        {navItems.map(([label,href]) => <Link href={href} key={href} className={path===href ? "active":""} onClick={()=>setOpen(false)}>{label}</Link>)}
      </nav>
      <div className="header-actions">
        <Link href="/login" className="header-login">Login</Link>
        <Link href="/cart" className="cart-link"><span>Cart</span><b>{count}</b></Link>
      </div>
      <button className="menu-button" onClick={()=>setOpen(v=>!v)} aria-label={open?"Close navigation":"Open navigation"} aria-expanded={open}><span/><span/><span/></button>
    </div></header>
  </>;
}

export function SiteFooter() {
  return <footer className="footer">
    <div className="shell footer-grid">
      <div className="footer-brand">
        <Image src="/kitkleen-logo.png" alt="KitKleen" width={70} height={70} className="footer-logo" />
        <div className="brand-word footer-word">KIT<span>KLEEN</span></div>
        <p>Professional Sports Gear Care<br/>Clean • Care • Restore</p>
        <div className="social-row" aria-label="Social profiles">
          <button type="button" disabled title="Official Instagram profile not configured" aria-label="Instagram profile not configured"><FaInstagram aria-hidden="true"/></button>
          <button type="button" disabled title="Official Facebook profile not configured" aria-label="Facebook profile not configured"><FaFacebookF aria-hidden="true"/></button>
          <button type="button" disabled title="Official YouTube profile not configured" aria-label="YouTube profile not configured"><FaYoutube aria-hidden="true"/></button>
        </div>
      </div>
      <div><h4>Explore</h4><Link href="/services">Services</Link><Link href="/pricing">Pricing</Link><Link href="/subscriptions">Subscriptions</Link><Link href="/offers">Offers</Link></div>
      <div><h4>KitKleen</h4><Link href="/about">About Us</Link><Link href="/faq">FAQ</Link><Link href="/contact">Contact</Link><Link href="/login">Login / Create Account</Link></div>
      <div className="footer-contact"><h4>Get in Touch</h4><a href="mailto:sbkitkleen@gmail.com"><FaEnvelope aria-hidden="true"/><span>sbkitkleen@gmail.com</span></a><a href="tel:+918978371100"><FaPhone aria-hidden="true"/><span>+91 89783 71100</span></a><a href="https://wa.me/918978371100?text=Hi%20KitKleen%2C%20I%20would%20like%20to%20know%20more%20about%20your%20sports%20gear%20cleaning%20services." target="_blank" rel="noreferrer"><FaWhatsapp aria-hidden="true"/><span>Chat on WhatsApp →</span></a></div>
    </div>
    <div className="shell footer-bottom"><span>© {new Date().getFullYear()} KitKleen</span><span>Clean • Care • Restore</span></div>
  </footer>;
}
