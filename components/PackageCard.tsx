"use client";

import { useState } from "react";
import Image from "next/image";
import { useCart } from "@/components/CartContext";

type Package = { id:string; name:string; price:number; tag:string; description:string; includes:readonly string[] };

export function PackageCard({item}:{item:Package}) {
  const {addItem}=useCart();
  const [added,setAdded]=useState(false);
  return <article className={`package-card ${item.id==="pro-care"?"featured":""}`}>
    <div className="package-brand"><Image src="/kitkleen-logo.png" alt="KitKleen logo" width={1254} height={1254}/><span>KITKLEEN / GEAR CARE</span></div>
    <div className="package-price"><span className="tag">{item.tag}</span><strong>₹{item.price}</strong></div>
    <h3>{item.name}</h3><p>{item.description}</p>
    <ul className="package-includes">{item.includes.map(feature=><li key={feature}>{feature}</li>)}</ul>
    <button className="btn btn-secondary" onClick={()=>{addItem({id:item.id,name:item.name,price:item.price});setAdded(true)}}>{added?"Added to Cart ✓":"Choose Package →"}</button>
  </article>;
}