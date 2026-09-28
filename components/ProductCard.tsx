"use client";
import { useCart } from "./CartContext";
export function ProductCard({item}:{item:{id:string;name:string;price:number;category?:string;icon?:string;description?:string}}) {
  const {addItem,items}=useCart();
  const selected=items.some(cartItem=>cartItem.id===item.id);
  return <article className="product-card">
    <div className="product-icon">{item.icon??"✦"}</div>
    <div><span className="mini-tag">{item.category??"KitKleen"}</span><h3>{item.name}</h3>
      {item.description&&<p className="product-description">{item.description}</p>}
      <div className="product-bottom"><strong>₹{item.price}</strong><button className={selected?"is-added":""} onClick={()=>addItem({id:item.id,name:item.name,price:item.price})}>{selected?"Add another +":"Add to Kit +"}</button></div>
    </div>
  </article>;
}
