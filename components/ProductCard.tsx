"use client";

import { FaChevronDown, FaMinus, FaPlus } from "react-icons/fa6";
import { careLevels, type CareLevelId, type services, type bags } from "@/lib/data";
import { useCart } from "./CartContext";

type Product=(typeof services)[number]|(typeof bags)[number];

function QuantityAction({productId,careLevelId,name}:{productId:string;careLevelId:CareLevelId;name:string}) {
  const {items,addItem,updateQty}=useCart();
  const lineId=`gear:${productId}:${careLevelId}`;
  const quantity=items.find(item=>item.id===lineId)?.qty??0;
  if(quantity===0){
    return <button className="care-add-button" type="button" onClick={()=>addItem({kind:"gear",productId,careLevelId})} aria-label={`Add ${name} with ${careLevels.find(level=>level.id===careLevelId)?.name} care to request`}>
      Add <FaPlus aria-hidden="true"/>
    </button>;
  }
  return <span className="inline-quantity-control" aria-label={`${name} quantity controls`}>
    <button type="button" onClick={()=>updateQty(lineId,quantity-1)} aria-label={`Remove one ${name} with ${careLevelId} care`}><FaMinus aria-hidden="true"/></button>
    <output aria-live="polite" aria-label={`${name} quantity`}>{quantity}</output>
    <button type="button" onClick={()=>updateQty(lineId,quantity+1)} aria-label={`Add one ${name} with ${careLevelId} care`}><FaPlus aria-hidden="true"/></button>
  </span>;
}

export function ProductCard({item,expanded,onToggle}:{item:Product;expanded:boolean;onToggle:()=>void}) {
  const displayName="size" in item?`Kit Bag — ${item.size}`:item.name;
  return <article className={`service-selection-card ${expanded?"is-expanded":""}`}>
    <button className="service-selection-trigger" type="button" aria-expanded={expanded} onClick={onToggle}>
      <span className="service-selection-icon" aria-hidden="true">{item.icon??"✦"}</span>
      <span className="service-selection-title">
        <strong>{displayName}</strong>
        <small>{item.category}</small>
      </span>
      <span className="service-selection-action">{expanded?"Close":"Choose care"}<FaChevronDown aria-hidden="true"/></span>
    </button>
    {expanded&&<div className="service-care-options" aria-label={`${displayName} care options`}>
      {careLevels.map(level=><div className={`service-care-option service-care-${level.id}`} key={level.id}>
        <div className="service-care-copy">
          <strong>{level.name}</strong>
          <small>{level.subtitle}</small>
          <span className="service-care-benefits">{level.benefits.join(" · ")}</span>
        </div>
        <strong className="service-care-price">₹{item.prices[level.id]}</strong>
        <QuantityAction productId={item.id} careLevelId={level.id} name={displayName}/>
      </div>)}
    </div>}
  </article>;
}
