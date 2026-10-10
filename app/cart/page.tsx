"use client";

import Link from "next/link";
import { careLevels } from "@/lib/data";
import { useCart } from "@/components/CartContext";

export default function Cart() {
  const { items, updateQty, removeItem, clearCart, subtotal } = useCart();

  return (
    <main>
      <section className="page-hero">
        <div className="shell">
          <div className="crumb">KitKleen / Care request</div>
          <h1>Your <em>care request.</em></h1>
          <p>Review your selected gear and care levels before sending a request.</p>
        </div>
      </section>
      <section className="section section-light">
        <div className="shell">
          {items.length === 0 ? (
            <div className="empty-state">
              <h2>Your selection is empty.</h2>
              <p>Add gear and choose a care level from Services.</p>
              <div className="actions" style={{ justifyContent: "center" }}>
                <Link className="btn btn-primary" href="/services">Browse Services →</Link>
              </div>
            </div>
          ) : (
            <div className="cart-layout">
              <div className="cart-list">
                {items.map((item) => {
                  const careLevel = careLevels.find((level) => level.id === item.careLevelId);
                  return (
                    <div className="cart-item" key={item.id}>
                      <div>
                        <h3>{item.name}</h3>
                        <small>
                          {careLevel ? `${careLevel.name} · ${careLevel.subtitle} · ` : ""}
                          ₹{item.price} each
                        </small>
                        {item.kind==="package"&&<small>Includes: {item.includes.join(", ")}</small>}
                        <div className="qty">
                          <button onClick={() => updateQty(item.id, item.qty - 1)} aria-label={`Remove one ${item.name}`}>-</button>
                          <span>{item.qty}</span>
                          <button onClick={() => updateQty(item.id, item.qty + 1)} aria-label={`Add one ${item.name}`}>+</button>
                          <button onClick={() => removeItem(item.id)} style={{ marginLeft: 8 }}>Remove</button>
                        </div>
                      </div>
                      <strong>₹{item.price * item.qty}</strong>
                    </div>
                  );
                })}
                <button className="table-button" onClick={clearCart}>Clear selection</button>
              </div>
              <aside className="cart-summary">
                <div className="eyebrow">Request summary</div>
                <div className="summary-row">
                  <span>Items</span>
                  <span>{items.reduce((sum, item) => sum + item.qty, 0)}</span>
                </div>
                <div className="summary-row summary-total">
                  <span>Estimated total</span>
                  <strong>₹{subtotal}</strong>
                </div>
                <div className="actions">
                  <Link className="btn btn-primary" href="/booking?from=cart">Review enquiry →</Link>
                </div>
                <p className="form-note">The team will confirm availability and launch timing with you.</p>
              </aside>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
