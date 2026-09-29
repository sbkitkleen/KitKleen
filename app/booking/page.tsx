import type {Metadata} from "next";
import Link from "next/link";
import {BookingForm} from "@/components/BookingForm";
import {packages} from "@/lib/data";

export const metadata:Metadata={
  title:"Book a Cleaning | KitKleen",
  description:"Request professional cleaning and care for your sports equipment.",
};

export default async function BookingPage({searchParams}:{searchParams:Promise<{from?:string;package?:string|string[]}>}){
  const params=await searchParams;
  const packageParam=Array.isArray(params.package)?params.package[0]:params.package;
  const initialPackage=packages.find(item=>item.id===packageParam);
  return <main>
    <section className="page-hero"><div className="shell">
      <div className="crumb">KitKleen / Booking</div>
      <h1>Book your gear<br/><em>care session.</em></h1>
      <p>Tell us what you need cared for and when. We’ll capture your request and help you confirm it on WhatsApp.</p>
      <Link className="text-link" href="/pricing">View individual gear pricing →</Link>
    </div></section>
    <section className="section section-light"><div className="shell"><BookingForm initialPackage={initialPackage?.id} fromCart={params.from==="cart"}/></div></section>
  </main>;
}