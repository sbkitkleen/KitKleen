"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = { id:string; name:string; price:number; qty:number };

type CartValue = {
  items:CartItem[];
  addItem:(item:Omit<CartItem,"qty">)=>void;
  removeItem:(id:string)=>void;
  updateQty:(id:string,qty:number)=>void;
  clearCart:()=>void;
  count:number;
  subtotal:number;
};

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({children}:{children:React.ReactNode}) {
  const [items,setItems] = useState<CartItem[]>([]);
  const [hydrated,setHydrated] = useState(false);
  useEffect(() => {
    const raw = localStorage.getItem("kitkleen-cart");
    let storedItems:CartItem[]=[];
    if (raw) { try { storedItems=JSON.parse(raw); } catch {} }
    queueMicrotask(() => { setItems(storedItems); setHydrated(true); });
  },[]);
  useEffect(() => { if (hydrated) localStorage.setItem("kitkleen-cart", JSON.stringify(items)); },[items,hydrated]);

  const value = useMemo<CartValue>(() => ({
    items,
    addItem: (item) => setItems(cur => {
      const found = cur.find(x => x.id === item.id);
      return found ? cur.map(x => x.id === item.id ? {...x,qty:x.qty+1} : x) : [...cur,{...item,qty:1}];
    }),
    removeItem: id => setItems(cur => cur.filter(x => x.id !== id)),
    updateQty: (id,qty) => setItems(cur => qty <= 0 ? cur.filter(x => x.id !== id) : cur.map(x => x.id === id ? {...x,qty} : x)),
    clearCart: () => setItems([]),
    count: items.reduce((s,x)=>s+x.qty,0),
    subtotal: items.reduce((s,x)=>s+x.qty*x.price,0),
  }),[items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
}
