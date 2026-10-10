import type { Metadata } from "next";
import { ServicesCatalogue } from "@/components/ServicesCatalogue";

export const metadata:Metadata={
  title:"Services & Care Prices | KitKleen",
  description:"Choose KITKLEEN Fresh, Deep or Elite care for sports gear, kit bags and complete-kit packages.",
};

export default function Services(){
  return <main>
    <section className="page-hero">
      <div className="shell">
        <div className="crumb">KitKleen / Services</div>
        <h1>Every piece of gear.<br/><em>Properly cared for.</em></h1>
        <p>Choose a service to compare Fresh, Deep and Elite care, then add your selection to a launch enquiry.</p>
      </div>
    </section>
    <section className="section section-light services-shopping-section">
      <div className="shell">
        <div className="services-shopping-heading">
          <div><div className="eyebrow">Explore services</div><h2>Choose your <em>care.</em></h2></div>
          <p>Open one service at a time to compare its care options. Your selection stays in the request summary as you browse.</p>
        </div>
        <ServicesCatalogue/>
      </div>
    </section>
  </main>;
}
