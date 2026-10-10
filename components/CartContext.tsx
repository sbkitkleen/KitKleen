"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { bags, careLevels, kitPackages, services, type CareLevelId } from "@/lib/data";

const gearCatalog = [...services, ...bags];
const maxUnitPrice=Math.max(
  ...gearCatalog.flatMap(item=>Object.values(item.prices)),
  ...kitPackages.flatMap(item=>Object.values(item.prices)),
);
const maxTotalQuantity=Math.floor(Number.MAX_SAFE_INTEGER/maxUnitPrice);

type CartGearItem = {
  id:string;
  kind:"gear";
  productId:string;
  careLevelId:CareLevelId;
  name:string;
  price:number;
  qty:number;
};

type CartPackageItem = {
  id:string;
  kind:"package";
  packageId:string;
  careLevelId:CareLevelId;
  name:string;
  price:number;
  qty:number;
  includes:readonly string[];
};

export type CartItem = CartGearItem | CartPackageItem;

type CartSelection =
  | {kind:"gear";productId:string;careLevelId:CareLevelId}
  | {kind:"package";packageId:string;careLevelId:CareLevelId};

type CartValue = {
  items:CartItem[];
  addItem:(selection:CartSelection)=>void;
  removeItem:(id:string)=>void;
  updateQty:(id:string,qty:number)=>void;
  clearCart:()=>void;
  count:number;
  subtotal:number;
};

const CartContext = createContext<CartValue | null>(null);

function isCareLevelId(value:unknown):value is CareLevelId {
  return typeof value==="string"&&careLevels.some(level=>level.id===value);
}

function resolveCartItem(selection:CartSelection,qty:number):CartItem|null {
  const careLevel=careLevels.find(level=>level.id===selection.careLevelId);
  if(!careLevel)return null;

  if(selection.kind==="gear"){
    const product=gearCatalog.find(item=>item.id===selection.productId);
    if(!product)return null;
    return {
      id:`gear:${product.id}:${careLevel.id}`,
      kind:"gear",
      productId:product.id,
      careLevelId:careLevel.id,
      name:product.description,
      price:product.prices[careLevel.id],
      qty,
    };
  }

  const kit=kitPackages.find(item=>item.id===selection.packageId);
  if(!kit)return null;
  return {
    id:`package:${kit.id}:${careLevel.id}`,
    kind:"package",
    packageId:kit.id,
    careLevelId:careLevel.id,
    name:kit.name,
    price:kit.prices[careLevel.id],
    qty,
    includes:kit.includes,
  };
}

function restoreCartItem(value:unknown):CartItem|null {
  if(!value||typeof value!=="object")return null;
  const stored=value as Record<string,unknown>;
  if(!isCareLevelId(stored.careLevelId))return null;

  const qty=typeof stored.qty==="number"&&Number.isFinite(stored.qty)
    ?Math.min(maxTotalQuantity,Math.max(0,Math.floor(stored.qty)))
    :0;
  if(qty===0)return null;

  if(stored.kind==="package"&&typeof stored.packageId==="string"){
    return resolveCartItem({kind:"package",packageId:stored.packageId,careLevelId:stored.careLevelId},qty);
  }

  const productId=typeof stored.productId==="string"
    ?stored.productId
    :typeof stored.id==="string"?stored.id:"";
  if(productId){
    return resolveCartItem({kind:"gear",productId,careLevelId:stored.careLevelId},qty);
  }
  return null;
}

function restoreCart(raw:string|null):CartItem[] {
  if(!raw)return [];
  let parsed:unknown;
  try {
    parsed=JSON.parse(raw);
  } catch {
    return [];
  }
  if(!Array.isArray(parsed))return [];

  const restored=new Map<string,CartItem>();
  for(const value of parsed){
    const item=restoreCartItem(value);
    if(!item)continue;
    const existing=restored.get(item.id);
    restored.set(item.id,existing?{...item,qty:Math.min(maxTotalQuantity,existing.qty+item.qty)}:item);
  }
  let remaining=maxTotalQuantity;
  return [...restored.values()].flatMap(item=>{
    const qty=Math.min(item.qty,remaining);
    remaining-=qty;
    return qty>0?[{...item,qty}]:[];
  });
}

export function CartProvider({children}:{children:React.ReactNode}) {
  const [items,setItems] = useState<CartItem[]>([]);
  const [hydrated,setHydrated] = useState(false);

  useEffect(() => {
    const restored=restoreCart(localStorage.getItem("kitkleen-cart"));
    queueMicrotask(() => { setItems(restored); setHydrated(true); });
  },[]);

  useEffect(() => {
    if(hydrated)localStorage.setItem("kitkleen-cart",JSON.stringify(items));
  },[items,hydrated]);

  const value = useMemo<CartValue>(() => ({
    items,
    addItem: selection => {
      const resolved=resolveCartItem(selection,1);
      if(!resolved)return;
      setItems(current=>{
        const totalQuantity=current.reduce((sum,item)=>sum+item.qty,0);
        if(totalQuantity>=maxTotalQuantity)return current;
        const found=current.find(item=>item.id===resolved.id);
        return found
          ?current.map(item=>item.id===resolved.id?{...item,qty:item.qty+1,price:resolved.price}:item)
          :[...current,resolved];
      });
    },
    removeItem: id => setItems(current=>current.filter(item=>item.id!==id)),
    updateQty: (id,qty) => {
      setItems(current=>current.flatMap(item=>{
        if(item.id!==id)return [item];
        const otherQuantity=current.reduce((sum,line)=>sum+(line.id===id?0:line.qty),0);
        const nextQty=Number.isFinite(qty)
          ?Math.min(maxTotalQuantity-otherQuantity,Math.max(0,Math.floor(qty)))
          :0;
        if(nextQty===0)return [];
        const selection=item.kind==="gear"
          ?{kind:"gear" as const,productId:item.productId,careLevelId:item.careLevelId}
          :{kind:"package" as const,packageId:item.packageId,careLevelId:item.careLevelId};
        const resolved=resolveCartItem(selection,nextQty);
        return resolved?[resolved]:[];
      }));
    },
    clearCart: () => setItems([]),
    count: items.reduce((sum,item)=>sum+item.qty,0),
    subtotal: items.reduce((sum,item)=>sum+item.qty*item.price,0),
  }),[items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
