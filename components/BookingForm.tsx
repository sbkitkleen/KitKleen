"use client";

import Link from "next/link";
import {useRef,useState} from "react";
import {bags,careLevels,packages,services,type CareLevelId} from "@/lib/data";
import {useCart} from "@/components/CartContext";
import {
  beginBookingSubmission,
  completeBookingSubmission,
  createBookingSubmissionState,
  finishBookingSubmission,
} from "@/lib/bookingSubmissionIdempotency";
import {FaCalendarDays,FaCheck,FaMinus,FaPlus,FaWhatsapp} from "react-icons/fa6";

type ServiceType=(typeof packages)[number]["id"]|"individual"|"";
type CustomerDetails={name:string;mobile:string;email:string;location:string;date:string;notes:string};

const gearOptions=[...services,...bags].map(item=>({...item,displayName:item.description}));
const serviceOptions=[
  ...packages.map(item=>({
    id:item.id,
    name:`${item.name} · ${item.careLevelName}`,
    price:item.price,
    description:"Complete-kit package request",
  })),
  {id:"individual" as const,name:"Individual Gear",price:null,description:"Select one or more pieces of equipment."},
];

function localDateString(){
  const today=new Date();
  const year=today.getFullYear();
  const month=String(today.getMonth()+1).padStart(2,"0");
  const day=String(today.getDate()).padStart(2,"0");
  return `${year}-${month}-${day}`;
}

function isCareLevelId(value:string):value is CareLevelId {
  return careLevels.some(level=>level.id===value);
}

export function BookingForm({initialPackage,fromCart=false}:{initialPackage?:(typeof packages)[number]["id"];fromCart?:boolean}){
  const {items:cartItems}=useCart();
  const [serviceType,setServiceType]=useState<ServiceType>(initialPackage??"");
  const [careLevelId,setCareLevelId]=useState<CareLevelId>("fresh");
  const [quantities,setQuantities]=useState<Record<string,number>>({});
  const [customer,setCustomer]=useState<CustomerDetails>({name:"",mobile:"",email:"",location:"",date:"",notes:""});
  const [error,setError]=useState("");
  const [submitted,setSubmitted]=useState(false);
  const [isSubmitting,setIsSubmitting]=useState(false);
  const submissionState=useRef(createBookingSubmissionState());
  const effectiveServiceType=fromCart?"cart":serviceType;
  const selectedPackage=packages.find(item=>item.id===effectiveServiceType);
  const selectedCartItems=fromCart?cartItems:[];
  const quantityFor=(id:string)=>quantities[id]??0;
  const selectedGear=effectiveServiceType==="individual"
    ?gearOptions.filter(item=>quantityFor(item.id)>0).map(item=>({
      ...item,
      careLevelId,
      price:item.prices[careLevelId],
      quantity:quantityFor(item.id),
    }))
    :[];
  const total=fromCart
    ?cartItems.reduce((sum,item)=>sum+item.price*item.qty,0)
    :selectedPackage?.price??selectedGear.reduce<number>((sum,item)=>sum+item.price*item.quantity,0);
  const serviceName=selectedPackage
    ?`${selectedPackage.name} · ${selectedPackage.careLevelName}`
    :fromCart?"Launch Enquiry — Gear & Package Selection"
    :(effectiveServiceType==="individual"?"Individual Gear":"Not selected");
  const summaryItems:{name:string;quantity:number;includes?:readonly string[]}[]=fromCart
    ?cartItems.map(item=>({
      name:`${item.name} · ${careLevels.find(level=>level.id===item.careLevelId)?.name}`,
      quantity:item.qty,
      includes:item.kind==="package"?item.includes:undefined,
    }))
    :selectedPackage
      ?[{name:`${selectedPackage.name} · ${selectedPackage.careLevelName}`,quantity:1,includes:selectedPackage.includes}]
      :selectedGear.map(item=>({
      name:`${item.displayName} · ${careLevels.find(level=>level.id===item.careLevelId)?.name}`,
      quantity:item.quantity,
    }));
  const bookingLines=fromCart
    ?cartItems.map(item=>`${item.name} · ${careLevels.find(level=>level.id===item.careLevelId)?.name} × ${item.qty}${item.kind==="package"?` (Includes: ${item.includes.join(", ")})`:""}`)
    :selectedPackage
      ?[`${selectedPackage.name} · ${selectedPackage.careLevelName}`]
      :selectedGear.map(item=>`${item.displayName} · ${careLevels.find(level=>level.id===item.careLevelId)?.name} × ${item.quantity}`);
  const whatsappMessage=[
    "Hi KitKleen,",
    "",
    "I would like to submit a launch enquiry for sports gear care.",
    "",
    "Items:",
    ...(bookingLines.length?bookingLines:["No items selected"]),
    "",
    `Estimated Total: ₹${total}`,
    "Promotional discounts are not included in this estimate. Please confirm eligibility with KitKleen.",
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
    setQuantities(current=>{
      const quantity=Math.max(0,(current[id]??0)+change);
      if(quantity===0){const next={...current};delete next[id];return next;}
      return {...current,[id]:quantity};
    });
  }

async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if(submissionState.current.inProgress)return;
  setError("");

  if (fromCart && !selectedCartItems.length) {
    setError("Your request is empty. Return to Services and add an item before continuing.");
    return;
  }

  if (!fromCart && effectiveServiceType === "individual" && !selectedGear.length) {
    setError("Select at least one gear item to continue.");
    return;
  }

  if (!fromCart && effectiveServiceType !== "individual" && !selectedPackage) {
    setError("Choose a service type to continue.");
    return;
  }

  if (customer.date < localDateString()) {
    setError("Choose today or a future date.");
    return;
  }

  const body={
    mode: fromCart ? "cart" : selectedPackage ? "package" : "individual",
    customer: {
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email || null,
      location: customer.location,
      date: customer.date,
      notes: customer.notes || null,
    },
    items: fromCart
      ? selectedCartItems.map(item=>item.kind==="package"
        ?{kind:"package",packageId:item.packageId,careLevelId:item.careLevelId,quantity:item.qty}
        :{kind:"gear",productId:item.productId,careLevelId:item.careLevelId,quantity:item.qty})
      : selectedPackage
        ? [{kind:"package",packageId:selectedPackage.kitId,careLevelId:selectedPackage.careLevelId,quantity:1}]
        : selectedGear.map((item) => ({
          kind:"gear",
          productId:item.id,
          careLevelId:item.careLevelId,
          quantity:item.quantity,
        })),
  };
  const idempotencyKey=beginBookingSubmission(
    submissionState.current,
    JSON.stringify(body)
  );
  if(!idempotencyKey)return;
  setIsSubmitting(true);

  try {
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const result: unknown = await response.json().catch(() => null);
      const message = result && typeof result === "object" && "error" in result &&
        typeof result.error === "string"
        ? result.error
        : "Your booking could not be submitted. Please try again.";
      setError(message);
      return;
    }

    completeBookingSubmission(submissionState.current);
    setSubmitted(true);
  } catch (error) {
    console.error("Unexpected booking error:", error);
    setError("Something went wrong. Please try again.");
  } finally {
    finishBookingSubmission(submissionState.current);
    setIsSubmitting(false);
  }
}

  return <div className="booking-layout">
    <div className="booking-form-column">
      {submitted?<section className="booking-success" role="status">
        <span className="booking-success-icon"><FaCheck aria-hidden="true"/></span>
        <div className="eyebrow">Enquiry captured</div>
        <h2>Thanks! Your care enquiry has been captured.</h2>
        <p>KitKleen is coming soon to Hyderabad. You can continue on WhatsApp to discuss your enquiry and launch timing.</p>
        <a className="btn btn-primary booking-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer"><FaWhatsapp aria-hidden="true"/> Continue on WhatsApp <span aria-hidden="true">→</span></a>
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
          <div className="booking-section-heading"><span>02</span><div><div className="eyebrow">{fromCart?"Review your selection":"Choose your care"}</div><h2>{fromCart?"Selected Services":"Service Type"}</h2></div></div>
          {!fromCart&&<fieldset className="booking-service-options"><legend className="visually-hidden">Select a service type</legend>
            {serviceOptions.map(option=><label className={`booking-service-option ${effectiveServiceType===option.id?"is-selected":""}`} key={option.id}>
              <input type="radio" name="serviceType" value={option.id} required checked={effectiveServiceType===option.id} onChange={()=>{setServiceType(option.id);setError("");}}/>
              <span className="service-radio-indicator" aria-hidden="true"/>
              <span className="booking-service-copy"><strong>{option.name}</strong><small>{option.description}</small></span>
              {option.price!==null&&<strong className="booking-service-price">₹{option.price}</strong>}
            </label>)}
          </fieldset>}
          {fromCart&&<div className="booking-gear-picker">
            <div className="booking-gear-heading"><h3>Request items</h3><a href="/cart">Edit request</a></div>
            {selectedCartItems.map(item=><div className="booking-gear-row has-quantity" key={item.id}>
              <div className="booking-gear-name">
                <strong>{item.name} · {careLevels.find(level=>level.id===item.careLevelId)?.name}</strong>
                <small>₹{item.price} each · Quantity {item.qty}</small>
                {item.kind==="package"&&<small>Includes: {item.includes.join(", ")}</small>}
              </div>
              <strong>₹{item.price*item.qty}</strong>
            </div>)}
          </div>}
          {!fromCart&&effectiveServiceType==="individual"&&<div className="booking-gear-picker">
                <label className="booking-care-level">Care level
                  <select value={careLevelId} onChange={event=>{if(isCareLevelId(event.target.value))setCareLevelId(event.target.value);}}>
                    {careLevels.map(level=><option key={level.id} value={level.id}>{level.name} — {level.subtitle}</option>)}
                  </select>
                </label>
                <div className="booking-gear-heading"><h3>Select your gear</h3><span>Choose multiple items</span></div>
                <div className="booking-gear-list">{gearOptions.map(item=>{
                  const quantity=quantityFor(item.id);
                  return <div className={`booking-gear-row ${quantity?"has-quantity":""}`} key={item.id}>
                    <div className="booking-gear-name"><strong>{item.displayName}</strong><small>₹{item.prices[careLevelId]} each · {careLevels.find(level=>level.id===careLevelId)?.name}</small></div>
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
            <label>Additional Notes<textarea value={customer.notes} onChange={event=>updateCustomer("notes",event.target.value)} placeholder="Tell us anything we should know about your gear or booking. Academy/club enquiries: include your organisation name and kit count." rows={4}/></label>
          </div>
        </section>
        {error&&<p className="booking-error" role="alert">{error}</p>}
        <button className="btn btn-primary booking-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting?"Sending...":"Send Care Enquiry"} <span aria-hidden="true">→</span>
        </button>
      </form>}
    </div>

    <aside className="booking-summary">
      <div className="booking-summary-top"><span>KK / REQUEST</span><span className="booking-summary-mark">KITKLEEN</span></div>
      <div className="eyebrow">Review before you send</div><h2>Booking Summary</h2>
      <dl>
        <div><dt>Service</dt><dd>{serviceName}</dd></div>
        <div><dt>Selected gear</dt><dd>{summaryItems.length?summaryItems.map(item=><span className="booking-summary-item" key={item.name}>{item.name}{item.includes&&<small className="booking-summary-includes">Includes: {item.includes.join(", ")}</small>}</span>):"No items selected"}</dd></div>
        <div><dt>Quantity</dt><dd>{summaryItems.length?summaryItems.map(item=><span className="booking-summary-item" key={item.name}>{item.quantity} {item.quantity===1?"item":"items"}</span>):"—"}</dd></div>
        <div><dt>Preferred date</dt><dd>{customer.date||"Not selected"}</dd></div>
      </dl>
      <div className="booking-summary-total"><span>Estimated Total</span><strong>₹{total}</strong></div>
      <p className="offer-summary-note">
        Academy/club discounts are subject to eligibility confirmation: 5% on
        up to 5 kits or 10% on more than 5 kits, on every qualifying order
        above ₹299. The threshold is assessed before package discounts, and a
        qualifying complete-kit package meets the minimum. One additional
        promotion per order; academy/club discounts cannot combine with squad
        day, referral, festival or other promotional offers. This estimate does
        not apply a discount.{" "}
        <Link href="/offers#academy-club">View offer details</Link>
      </p>
      <p>Final timing and handover details can be confirmed with our team.</p>
    </aside>
  </div>;
}