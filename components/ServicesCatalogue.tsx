"use client";

import { useState } from "react";
import { bags, kitPackages, services } from "@/lib/data";
import { PackageCard } from "./PackageCard";
import { ProductCard } from "./ProductCard";
import { ServicesCart } from "./ServicesCart";

const categoryGroups=[
  {id:"cricket-gear",title:"Cricket Gear",items:services.filter(item=>["pads","sports-gloves","keeper-gloves"].includes(item.id))},
  {id:"helmets",title:"Helmets",items:services.filter(item=>item.category==="Helmets")},
  {id:"protective-gear",title:"Protective Gear",items:services.filter(item=>item.category==="Protective Gear")},
  {id:"kit-bags",title:"Kit Bags",items:bags},
  {id:"footwear",title:"Footwear",items:services.filter(item=>item.category==="Footwear")},
  {id:"accessories",title:"Accessories",items:services.filter(item=>["sleeves","supporters","yoga-mat"].includes(item.id))},
];

export function ServicesCatalogue() {
  const [expandedService,setExpandedService]=useState<string|null>(null);

  return <div className="services-shopping-layout">
    <div className="services-shopping-catalogue">
      <section className="services-category-list" id="individual-gear">
        {categoryGroups.map(group=><section className="services-category" id={group.id} key={group.id} aria-labelledby={`${group.id}-heading`}>
          <div className="services-category-heading">
            <h2 id={`${group.id}-heading`}>{group.title}</h2>
            <span>{group.items.length} {group.items.length===1?"service":"services"}</span>
          </div>
          <div className="service-selection-list">
            {group.items.map(item=><ProductCard
              key={item.id}
              item={item}
              expanded={expandedService===item.id}
              onToggle={()=>setExpandedService(current=>current===item.id?null:item.id)}
            />)}
          </div>
        </section>)}
      </section>

      <section className="services-category kit-packages-section" id="complete-kit-packages">
        <div className="services-category-heading">
          <div><div className="eyebrow">Complete-kit packages</div><h2>Full kit.<br/><em>Fully cared for.</em></h2></div>
          <span>2 packages</span>
        </div>
        <p className="kit-packages-intro">Each package is one request line at its displayed price. Included gear is part of the package and is not charged again as individual items.</p>
        <div className="kit-package-grid">{kitPackages.map(item=><PackageCard item={item} key={item.id}/>)}</div>
      </section>

      <p className="launch-enquiry-note">KitKleen is coming soon to Hyderabad. Send an enquiry to discuss services and launch timing; bookings are not yet operational.</p>
    </div>
    <ServicesCart/>
  </div>;
}
