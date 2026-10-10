"use client";
import {useCart} from "./CartContext";
import type {CareLevelId} from "@/lib/data";
export function AddButton({item,careLevelId}:{item:{id:string;name:string};careLevelId:CareLevelId}){
 const {addItem}=useCart();
 return <button className="table-button" onClick={()=>addItem({kind:"gear",productId:item.id,careLevelId})}>Add to cart</button>;
}
