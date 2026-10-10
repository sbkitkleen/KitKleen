"use client";

import { FaMinus, FaPlus } from "react-icons/fa6";
import { careLevels, type CareLevelId, type kitPackages } from "@/lib/data";
import { useCart } from "./CartContext";

type KitPackage=(typeof kitPackages)[number];

function PackageQuantity({packageId,careLevelId,name}:{packageId:string;careLevelId:CareLevelId;name:string}) {
  const {items,addItem,updateQty}=useCart();
  const lineId=`package:${packageId}:${careLevelId}`;
  const quantity=items.find(item=>item.id===lineId)?.qty??0;
  if(quantity===0){
    return <button className="care-add-button" type="button" onClick={()=>addItem({kind:"package",packageId,careLevelId})} aria-label={`Add ${name} with ${careLevels.find(level=>level.id===careLevelId)?.name} care to request`}>
      Add <FaPlus aria-hidden="true"/>
    </button>;
  }
  return <span className="inline-quantity-control" aria-label={`${name} quantity controls`}>
    <button type="button" onClick={()=>updateQty(lineId,quantity-1)} aria-label={`Remove one ${name} with ${careLevelId} care`}><FaMinus aria-hidden="true"/></button>
    <output aria-live="polite" aria-label={`${name} quantity`}>{quantity}</output>
    <button type="button" onClick={()=>updateQty(lineId,quantity+1)} aria-label={`Add one ${name} with ${careLevelId} care`}><FaPlus aria-hidden="true"/></button>
  </span>;
}

export function PackageCard({item}:{item:KitPackage}) {
  return <article className="kit-package-card">
    <div className="package-brand"><span>KITKLEEN / COMPLETE KIT</span></div>
    <h4>{item.name}</h4>
    <div className="kit-package-includes">
      <strong>Package includes</strong>
      <ul>{item.includes.map(feature=><li key={feature}>{feature}</li>)}</ul>
    </div>
    <div className="kit-package-prices">
      {careLevels.map(level=><div className={`kit-package-price-row kit-package-${level.id}`} key={level.id}>
        <span><strong>{level.name}</strong><small>{level.subtitle}</small><small className="kit-package-care-benefits">{level.benefits.join(" · ")}</small></span>
        <span className="kit-package-deal">
          <del>₹{item.originalPrices[level.id]}</del>
          <strong className="service-care-price">₹{item.prices[level.id]}</strong>
          <span className="kit-package-discount">Save ~30%</span>
          <small className="kit-package-saving">Save ₹{item.originalPrices[level.id]-item.prices[level.id]}</small>
        </span>
        <PackageQuantity packageId={item.id} careLevelId={level.id} name={item.name}/>
      </div>)}
    </div>
  </article>;
}
