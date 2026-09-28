"use client";
import {useCart} from "./CartContext";
export function AddButton({item}:{item:{id:string;name:string;price:number}}){
 const {addItem}=useCart();
 return <button className="table-button" onClick={()=>addItem(item)}>Add to cart</button>;
}
