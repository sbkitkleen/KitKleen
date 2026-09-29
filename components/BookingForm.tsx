"use client";

import {useState} from "react";
import {bags,packages,services} from "@/lib/data";
import {useCart} from "@/components/CartContext";
import { supabase } from "@/lib/supabase";
import {FaCalendarDays,FaCheck,FaMinus,FaPlus,FaWhatsapp} from "react-icons/fa6";

type ServiceType="deep-clean"|"pro-care"|"individual"|"";
type CustomerDetails={name:string;mobile:string;email:string;location:string;date:string;notes:string};

const gearOptions=[
  ...services.map(item=>({...item,displayName:item.name.replace(" — "," ")})),
  ...bags.map(item=>({...item,displayName:item.name.replace("Kit Bag — ","Kit Bag - ")})),
];
const serviceOptions=[
  {id:"deep-clean" as const,name:"Full Kit Deep Clean",price:packages.find(item=>item.id==="deep-clean")!.price,description:"Dirt, stain and odour removal."},
  {id:"pro-care" as const,name:"Full Kit Pro Care+",price:packages.find(item=>item.id==="pro-care")!.price,description:"Deep cleaning with added care and conditioning."},
  {id:"individual" as const,name:"Individual Gear",price:null,description:"Select one or more pieces of equipment."},
];

function localDateString(){
  const today=new Date();
  const year=today.getFullYear();
  const month=String(today.getMonth()+1).padStart(2,"0");
  const day=String(today.getDate()).padStart(2,"0");
  return `${year}-${month}-${day}`;
}

export function BookingForm({initialPackage,fromCart=false}:{initialPackage?:"deep-clean"|"pro-care";fromCart?:boolean}){
  const {items:cartItems,addItem,updateQty}=useCart();
  const [serviceType,setServiceType]=useState<ServiceType>(initialPackage??"");
  const [quantities,setQuantities]=useState<Record<string,number>>({});
  const [customer,setCustomer]=useState<CustomerDetails>({name:"",mobile:"",email:"",location:"",date:"",notes:""});
  const [error,setError]=useState("");
  const [submitted,setSubmitted]=useState(false);
  const cartPackage=fromCart?packages.find(item=>cartItems.some(cartItem=>cartItem.id===item.id)):undefined;
  const effectiveServiceType=serviceType||cartPackage?.id||(fromCart&&cartItems.some(cartItem=>gearOptions.some(item=>item.id===cartItem.id))?"individual":"");
  const selectedPackage=packages.find(item=>item.id===effectiveServiceType);
  const usesCartItems=fromCart&&effectiveServiceType==="individual";
  const quantityFor=(id:string)=>usesCartItems?cartItems.find(item=>item.id===id)?.qty??0:quantities[id]??0;
  const selectedGear=effectiveServiceType==="individual"?gearOptions.filter(item=>quantityFor(item.id)>0):[];
  const serviceName=selectedPackage?.name??(effectiveServiceType==="individual"?"Individual Gear":"Not selected");
  const total=selectedPackage?.price??selectedGear.reduce<number>((sum,item)=>sum+item.price*quantityFor(item.id),0);
  const summaryItems:{name:string;quantity:number}[]=selectedPackage?[{name:selectedPackage.name,quantity:cartPackage?.id===selectedPackage.id?cartItems.find(item=>item.id===selectedPackage.id)?.qty??1:1}]:selectedGear.map(item=>({name:item.displayName,quantity:quantityFor(item.id)}));
  const bookingLines=selectedPackage?[`${selectedPackage.name} × ${summaryItems[0].quantity}`]:selectedGear.map(item=>`${item.displayName} × ${quantityFor(item.id)}`);
  const whatsappMessage=[
    "Hi KitKleen,",
    "",
    "I would like to book a cleaning service.",
    "",
    "Items:",
    ...(bookingLines.length?bookingLines:["No items selected"]),
    "",
    `Estimated Total: ₹${total}`,
    "",
    `Preferred Date: ${customer.date}`,
    `Location: ${customer.location}`,
    "",
    "Additional Notes:",
    customer.notes||"None",
  ].join("\n");
  const whatsappUrl=`https://wa.me/918978371100?text=${encodeURIComponent(whatsappMessage)}`;

  function updateCustomer(field:keyof CustomerDetails,value:string){
    setCustomer(current=>({...current,[field]:value}));
  }

  function updateQuantity(id:string,change:number){
    if(usesCartItems){
      const currentQuantity=cartItems.find(item=>item.id===id)?.qty??0;
      const nextQuantity=currentQuantity+change;
      if(nextQuantity<=0){updateQty(id,0);return;}
      const gear=gearOptions.find(item=>item.id===id);
      if(currentQuantity>0){updateQty(id,nextQuantity);return;}
      if(gear&&change>0)addItem({id:gear.id,name:gear.name,price:gear.price});
      return;
    }
    setQuantities(current=>{
      const quantity=Math.max(0,(current[id]??0)+change);
      if(quantity===0){const next={...current};delete next[id];return next;}
      return {...current,[id]:quantity};
    });
  }

async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setError("");

  if (effectiveServiceType === "individual" && !selectedGear.length) {
    setError("Select at least one gear item to continue.");
    return;
  }

  if (effectiveServiceType !== "individual" && !selectedPackage) {
    setError("Choose a service type to continue.");
    return;
  }

  if (customer.date < localDateString()) {
    setError("Choose today or a future date.");
    return;
  }

  try {
    const bookingId = crypto.randomUUID();

    // 1. Save the main booking
    const { error: bookingError } = await supabase
      .from("bookings")
      .insert({
        id: bookingId,
        customer_name: customer.name,
        mobile: customer.mobile,
        email: customer.email || null,
        location: customer.location,
        service_type: serviceName,
        preferred_date: customer.date,
        notes: customer.notes || null,
        estimated_total: total,
        status: "new",
      });

    if (bookingError) {
  setError(
    `Booking failed: ${bookingError.message || "Unknown error"}${
      bookingError.code ? ` (Code: ${bookingError.code})` : ""
    }`
  );
  return;
}

    // 2. Prepare booking items
    type BookingItemInsert = {
  booking_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
    };
    const bookingItems: BookingItemInsert[] = selectedPackage
      ? [
          {
            booking_id: bookingId,
            item_name: selectedPackage.name,
            quantity: summaryItems[0]?.quantity ?? 1,
            unit_price: selectedPackage.price,
            total_price:
              selectedPackage.price * (summaryItems[0]?.quantity ?? 1),
          },
        ]
      : selectedGear.map((item) => {
          const quantity = quantityFor(item.id);

          return {
            booking_id: bookingId,
            item_name: item.displayName,
            quantity,
            unit_price: item.price,
            total_price: item.price * quantity,
          };
        });

    // 3. Save individual booking items
    const { error: itemsError } = await supabase
      .from("booking_items")
      .insert(bookingItems);

    if (itemsError) {
      console.error("Booking items error:", itemsError);
      setError(
        "Your booking was created, but we couldn't save the selected items. Please contact us."
      );
      return;
    }

    // 4. Show success screen
    setSubmitted(true);
  } catch (error) {
    console.error("Unexpected booking error:", error);
    setError("Something went wrong. Please try again.");
  }
}

  return <div className="booking-layout">
    <div className="booking-form-column">
      {submitted?<section className="booking-success" role="status">
        <span className="booking-success-icon"><FaCheck aria-hidden="true"/></span>
        <div className="eyebrow">Request captured</div>
        <h2>Thanks! Your booking request has been captured.</h2>
        <p>To confirm your booking quickly, you can continue on WhatsApp.</p>
        <a className="btn btn-primary booking-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer"><FaWhatsapp aria-hidden="true"/> Chat on WhatsApp <span aria-hidden="true">→</span></a>
      </section>:<form className="booking-form" onSubmit={submitBooking}>
        <section className="booking-form-section">
          <div className="booking-section-heading"><span>01</span><div><div className="eyebrow">Your details</div><h2>Customer Details</h2></div></div>
          <div className="booking-fields">
            <label>Full Name *<input autoComplete="name" required value={customer.name} onChange={event=>updateCustomer("name",event.target.value)} placeholder="Your full name"/></label>
            <label>Mobile Number *<input autoComplete="tel" type="tel" inputMode="tel" pattern="[0-9+()\- ]{7,18}" required value={customer.mobile} onChange={event=>updateCustomer("mobile",event.target.value)} placeholder="+91 98765 43210"/></label>
            <label>Email<input autoComplete="email" type="email" value={customer.email} onChange={event=>updateCustomer("email",event.target.value)} placeholder="you@example.com"/></label>
            <label>City / Location *<input autoComplete="address-level2" required value={customer.location} onChange={event=>updateCustomer("location",event.target.value)} placeholder="City or area"/></label>
          </div>
        </section>

        <section className="booking-form-section">
          <div className="booking-section-heading"><span>02</span><div><div className="eyebrow">Choose your care</div><h2>Service Type</h2></div></div>
          <fieldset className="booking-service-options"><legend className="visually-hidden">Select a service type</legend>
            {serviceOptions.map(option=><label className={`booking-service-option ${effectiveServiceType===option.id?"is-selected":""}`} key={option.id}>
              <input type="radio" name="serviceType" value={option.id} required checked={effectiveServiceType===option.id} onChange={()=>{setServiceType(option.id);setError("");}}/>
              <span className="service-radio-indicator" aria-hidden="true"/>
              <span className="booking-service-copy"><strong>{option.name}</strong><small>{option.description}</small></span>
              {option.price!==null&&<strong className="booking-service-price">₹{option.price}</strong>}
            </label>)}
          </fieldset>
          {effectiveServiceType==="individual"&&<div className="booking-gear-picker">
            <div className="booking-gear-heading"><h3>Select your gear</h3><span>Choose multiple items</span></div>
            <div className="booking-gear-list">{gearOptions.map(item=>{
              const quantity=quantityFor(item.id);
              return <div className={`booking-gear-row ${quantity?"has-quantity":""}`} key={item.id}>
                <div className="booking-gear-name"><strong>{item.displayName}</strong><small>₹{item.price} each</small></div>
                <div className="booking-quantity" aria-label={`${item.displayName} quantity`}>
                  <button type="button" onClick={()=>updateQuantity(item.id,-1)} disabled={quantity===0} aria-label={`Remove one ${item.displayName}`}><FaMinus aria-hidden="true"/></button>
                  <output aria-live="polite">{quantity}</output>
                  <button type="button" onClick={()=>updateQuantity(item.id,1)} aria-label={`Add one ${item.displayName}`}><FaPlus aria-hidden="true"/></button>
                </div>
              </div>;
            })}</div>
          </div>}
        </section>

        <section className="booking-form-section">
          <div className="booking-section-heading"><span>03</span><div><div className="eyebrow">Timing and details</div><h2>Preferred Date &amp; Notes</h2></div></div>
          <div className="booking-fields booking-fields-single">
            <label>Preferred Date *<span className="booking-date-input"><input type="date" required min={localDateString()} value={customer.date} onChange={event=>updateCustomer("date",event.target.value)}/><FaCalendarDays aria-hidden="true"/></span></label>
            <label>Additional Notes<textarea value={customer.notes} onChange={event=>updateCustomer("notes",event.target.value)} placeholder="Tell us anything we should know about your gear or booking..." rows={4}/></label>
          </div>
        </section>
        {error&&<p className="booking-error" role="alert">{error}</p>}
        <button className="btn btn-primary booking-submit" type="submit">Book Now <span aria-hidden="true">→</span></button>
      </form>}
    </div>

    <aside className="booking-summary">
      <div className="booking-summary-top"><span>KK / REQUEST</span><span className="booking-summary-mark">KITKLEEN</span></div>
      <div className="eyebrow">Review before you send</div><h2>Booking Summary</h2>
      <dl>
        <div><dt>Service</dt><dd>{serviceName}</dd></div>
        <div><dt>Selected gear</dt><dd>{summaryItems.length?summaryItems.map(item=><span className="booking-summary-item" key={item.name}>{item.name}</span>):"No items selected"}</dd></div>
        <div><dt>Quantity</dt><dd>{summaryItems.length?summaryItems.map(item=><span className="booking-summary-item" key={item.name}>{item.quantity} {item.quantity===1?"item":"items"}</span>):"—"}</dd></div>
        <div><dt>Preferred date</dt><dd>{customer.date||"Not selected"}</dd></div>
      </dl>
      <div className="booking-summary-total"><span>Estimated Total</span><strong>₹{total}</strong></div>
      <p>Final timing and handover details can be confirmed with our team.</p>
    </aside>
  </div>;
}