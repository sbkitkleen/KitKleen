"use client";
import { useState } from "react";
export function FAQList({items}:{items:{q:string;a:string}[]}) {
  const [open,setOpen]=useState<number|null>(0);
  return <div className="faq-list">{items.map((x,i)=><button key={x.q} className={`faq-row ${open===i?"open":""}`} onClick={()=>setOpen(open===i?null:i)}>
    <span>{x.q}</span><b>{open===i?"−":"+"}</b>{open===i&&<p>{x.a}</p>}
  </button>)}</div>;
}
