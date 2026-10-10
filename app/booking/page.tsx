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
  const legacyPackageIds:Record<string,string>={
    "deep-clean":"batting-kit-deep",
    "pro-care":"extended-kit-deep",
  };
  const initialPackage=packages.find(item=>item.id===(packageParam?legacyPackageIds[packageParam]??packageParam:undefined));
  return <main>
    <section className="page-hero"><div className="shell">
      <div className="crumb">KitKleen / Booking</div>
      <h1>Enquire about<br/><em>gear care.</em></h1>
      <p>Tell us what you need cared for and when. KitKleen is coming soon to Hyderabad; bookings are not yet operational, but our team can discuss your enquiry and launch timing.</p>
      <Link className="text-link" href="/services#individual-gear">View services and prices →</Link>
    </div></section>
    <section className="section section-light"><div className="shell"><BookingForm initialPackage={initialPackage?.id} fromCart={params.from==="cart"}/></div></section>
  </main>;
}