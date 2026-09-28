import type {Metadata} from "next";
import Link from "next/link";
import {BookingForm} from "@/components/BookingForm";

export const metadata:Metadata={
  title:"Book a Cleaning | KitKleen",
  description:"Request professional cleaning and care for your sports equipment.",
};

export default function BookingPage(){
  return <main>
    <section className="page-hero"><div className="shell">
      <div className="crumb">KitKleen / Booking</div>
      <h1>Book your gear<br/><em>care session.</em></h1>
      <p>Tell us what you need cared for and when. We’ll capture your request and help you confirm it on WhatsApp.</p>
      <Link className="text-link" href="/pricing">View individual gear pricing →</Link>
    </div></section>
    <section className="section section-light"><div className="shell"><BookingForm/></div></section>
  </main>;
}