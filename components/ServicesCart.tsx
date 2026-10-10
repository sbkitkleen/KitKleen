"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FaMinus, FaPlus, FaTrash, FaXmark } from "react-icons/fa6";
import { careLevels } from "@/lib/data";
import { useCart, type CartItem } from "./CartContext";

function CartLine({item}:{item:CartItem}) {
  const {updateQty,removeItem}=useCart();
  const level=careLevels.find(careLevel=>careLevel.id===item.careLevelId);
  return <article className="services-cart-line">
    <div className="services-cart-line-heading">
      <div>
        <strong>{item.name}</strong>
        <small>{level?.name} · {level?.subtitle}</small>
        <small>₹{item.price} each</small>
      </div>
      <strong className="services-cart-line-total">₹{item.price*item.qty}</strong>
    </div>
    {item.kind==="package"&&<details className="services-cart-includes">
      <summary>Package inclusions</summary>
      <ul>{item.includes.map(include=><li key={include}>{include}</li>)}</ul>
    </details>}
    <div className="services-cart-line-actions">
      <span className="inline-quantity-control">
        <button type="button" onClick={()=>updateQty(item.id,item.qty-1)} aria-label={`Remove one ${item.name}`}><FaMinus aria-hidden="true"/></button>
        <output aria-live="polite" aria-label={`${item.name} quantity`}>{item.qty}</output>
        <button type="button" onClick={()=>updateQty(item.id,item.qty+1)} aria-label={`Add one ${item.name}`}><FaPlus aria-hidden="true"/></button>
      </span>
      <button className="services-cart-remove" type="button" onClick={()=>removeItem(item.id)} aria-label={`Remove ${item.name} from request`}>
        <FaTrash aria-hidden="true"/> Remove
      </button>
    </div>
  </article>;
}

function CartContents({onContinue}:{onContinue?:()=>void}) {
  const {items,count,subtotal,clearCart}=useCart();
  return <>
    {items.length===0
      ?<div className="services-cart-empty">
        <span aria-hidden="true">▢</span>
        <strong>Your request is empty</strong>
        <p>Choose a service and care level to start your enquiry.</p>
        <a href="#individual-gear" onClick={onContinue}>Browse services</a>
      </div>
      :<>
        <div className="services-cart-lines">{items.map(item=><CartLine key={item.id} item={item}/>)}</div>
        <div className="services-cart-totals">
          <div><span>Items</span><strong>{count}</strong></div>
          <div className="services-cart-subtotal"><span>Estimated subtotal</span><strong>₹{subtotal}</strong></div>
          <button className="services-cart-clear" type="button" onClick={clearCart}>Clear request</button>
          <Link className="btn btn-primary services-cart-continue" href="/booking?from=cart" onClick={onContinue}>Review enquiry <span aria-hidden="true">→</span></Link>
          <small>Launch enquiry only — no payment is collected.</small>
        </div>
      </>}
  </>;
}

export function ServicesCart() {
  const {count,subtotal}=useCart();
  const [drawerOpen,setDrawerOpen]=useState(false);
  const closeButtonRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!drawerOpen)return;
    const previouslyFocused=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown=(event:KeyboardEvent)=>{
      if(event.key==="Escape")setDrawerOpen(false);
    };
    window.addEventListener("keydown",handleKeyDown);
    return ()=>{
      window.removeEventListener("keydown",handleKeyDown);
      document.body.style.overflow=previousOverflow;
      previouslyFocused?.focus();
    };
  },[drawerOpen]);

  return <>
    <aside className="services-cart-panel" aria-label="Your care request">
      <div className="services-cart-panel-heading">
        <div><div className="eyebrow">Your selection</div><h2>Request summary</h2></div>
        <span className="services-cart-count" aria-label={`${count} items`}>{count}</span>
      </div>
      <CartContents/>
    </aside>

    <div className="services-mobile-cart">
      {drawerOpen&&<>
        <button className="services-cart-backdrop" type="button" aria-label="Close request summary" onClick={()=>setDrawerOpen(false)}/>
        <section className="services-cart-drawer" id="services-cart-drawer" role="dialog" aria-modal="true" aria-labelledby="services-cart-drawer-title">
          <div className="services-cart-drawer-heading">
            <div><div className="eyebrow">Your selection</div><h2 id="services-cart-drawer-title">Request summary</h2></div>
            <button ref={closeButtonRef} type="button" onClick={()=>setDrawerOpen(false)} aria-label="Close request summary"><FaXmark aria-hidden="true"/></button>
          </div>
          <CartContents onContinue={()=>setDrawerOpen(false)}/>
        </section>
      </>}
      <button className="services-mobile-cart-bar" type="button" onClick={()=>setDrawerOpen(true)} aria-expanded={drawerOpen} aria-controls="services-cart-drawer">
        <span><strong>{count} {count===1?"item":"items"}</strong><small>₹{subtotal} estimated subtotal</small></span>
        <span>View request <span aria-hidden="true">↑</span></span>
      </button>
    </div>
  </>;
}
