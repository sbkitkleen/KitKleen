"use client";

import {use,useEffect,useMemo,useState} from "react";
import Image from "next/image";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {createBrowserClient} from "@supabase/ssr";
import {FaArrowLeft,FaCalendarDays,FaCheck,FaEnvelope,FaLocationDot,FaPhone,FaWhatsapp} from "react-icons/fa6";

type Booking={
  id:string;
  customer_name:string;
  mobile:string;
  email:string|null;
  location:string;
  service_type:string;
  preferred_date:string;
  notes:string|null;
  estimated_total:number;
  status:string;
  created_at:string;
};

type BookingItem={item_name:string;quantity:number;unit_price:number;total_price:number};

const statuses=[
  {value:"new",label:"New"},
  {value:"received",label:"Received"},
  {value:"cleaning",label:"Cleaning"},
  {value:"quality_check",label:"Quality Check"},
  {value:"ready",label:"Ready"},
  {value:"delivered",label:"Completed"},
  {value:"cancelled",label:"Cancelled"},
];
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeStatus(status:string){return status.toLowerCase().replace(/[\s_-]+/g,"_");}
function displayStatus(status:string){return statuses.find(option=>normalizeStatus(option.value)===normalizeStatus(status))?.label??status.replace(/[_-]/g," ").replace(/\b\w/g,letter=>letter.toUpperCase());}
function statusValue(status:string){return statuses.find(option=>normalizeStatus(option.value)===normalizeStatus(status))?.value??status;}
function money(value:number){return `₹${Number(value||0).toLocaleString("en-IN")}`;}
function formatDate(value:string){
  if(!value)return "—";
  const date=new Date(`${value.slice(0,10)}T00:00:00`);
  return Number.isNaN(date.getTime())?"—":date.toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"});
}
function formatDateTime(value:string){
  if(!value)return "—";
  const date=new Date(value);
  return Number.isNaN(date.getTime())?"—":date.toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"});
}
function whatsappNumber(value:string){
  const digits=value.replace(/\D/g,"");
  if(digits.length===10)return `91${digits}`;
  if(digits.startsWith("0")&&digits.length===11)return `91${digits.slice(1)}`;
  return digits;
}

export default function BookingDetailPage({params}:{params:Promise<{id:string}>}){
  const {id}=use(params);
  const router=useRouter();
  const supabase=useMemo(()=>createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  ),[]);
  const [booking,setBooking]=useState<Booking|null>(null);
  const [items,setItems]=useState<BookingItem[]>([]);
  const [selectedStatus,setSelectedStatus]=useState("new");
  const [loading,setLoading]=useState(true);
  const [notFound,setNotFound]=useState(false);
  const [error,setError]=useState("");
  const [technicalError,setTechnicalError]=useState("");
  const [updating,setUpdating]=useState(false);
  const [statusMessage,setStatusMessage]=useState("");
  const [statusError,setStatusError]=useState("");

  useEffect(()=>{
    async function loadBooking(){
      try{
        const {data:{user},error:authError}=await supabase.auth.getUser();
        if(authError)throw authError;
        if(!user){router.replace("/admin/login");return;}
        if(!uuidPattern.test(id)){setNotFound(true);return;}

        const {data:bookingData,error:bookingError}=await supabase
          .from("bookings")
          .select("id,customer_name,mobile,email,location,service_type,preferred_date,notes,estimated_total,status,created_at")
          .eq("id",id)
          .maybeSingle();

        if(bookingError)throw bookingError;
        if(!bookingData){setNotFound(true);setLoading(false);return;}

        const {data:itemData,error:itemError}=await supabase
          .from("booking_items")
          .select("item_name,quantity,unit_price,total_price")
          .eq("booking_id",bookingData.id);

        if(itemError)throw itemError;

        setBooking(bookingData as Booking);
        setItems((itemData??[]) as BookingItem[]);
        setSelectedStatus(statusValue(bookingData.status));
      }catch(loadError){
        setError("Unable to load this booking right now.");
        setTechnicalError(loadError instanceof Error?loadError.message:"Request failed");
      }finally{
        setLoading(false);
      }
    }
    loadBooking();
  },[id,router,supabase]);

  async function updateStatus(nextStatus:string){
    if(!booking||normalizeStatus(nextStatus)===normalizeStatus(booking.status))return;
    setSelectedStatus(nextStatus);
    setStatusMessage("");
    setStatusError("");
    setUpdating(true);
    try{
      const {data,error:updateError}=await supabase
        .from("bookings")
        .update({status:nextStatus})
        .eq("id",booking.id)
        .select("id,status")
        .single();

      if(updateError)throw updateError;
      setBooking(current=>current?{...current,status:data.status}:current);
      setSelectedStatus(data.status);
      setStatusMessage("Status updated");
    }catch(updateError){
      setSelectedStatus(statusValue(booking.status));
      setStatusError("Status could not be updated. Please try again.");
      setTechnicalError(updateError instanceof Error?updateError.message:"Request failed");
    }finally{
      setUpdating(false);
    }
  }

  return <main className="detail-page"><div className="detail-shell">
    <header className="detail-header">
      <div className="detail-brand"><Image src="/kitkleen-logo.png" alt="KitKleen" width={42} height={42} priority/><div><span>KITKLEEN</span><strong>Booking Details</strong></div></div>
      <Link className="back-link" href="/admin"><FaArrowLeft aria-hidden="true"/> Back to Bookings</Link>
    </header>

    {loading?<section className="detail-state" role="status"><span className="detail-spinner"/><div><strong>Loading booking details...</strong><small>Securely retrieving the customer record</small></div></section>:error?<section className="detail-state detail-error" role="alert"><span className="detail-state-mark">!</span><div><strong>{error}</strong><small>{technicalError}</small><Link href="/admin">Back to Bookings</Link></div></section>:notFound?<section className="detail-state detail-not-found"><span className="detail-state-mark">?</span><div><strong>Booking Not Found</strong><small>Unable to find this booking.</small><Link href="/admin">Back to Bookings</Link></div></section>:booking&&<>
      <section className="detail-title"><div><span className="detail-eyebrow">KitKleen / Booking Details</span><h1>Booking <em>#{booking.id.slice(0,6).toUpperCase()}</em></h1><p>Review the customer request, selected gear and current service status.</p></div><StatusBadge status={booking.status}/></section>
      <div className="detail-grid">
        <section className="detail-card customer-card">
          <CardHeading number="01" title="Customer Details"/>
          <div className="customer-details">
            <DetailField label="Customer Name" value={booking.customer_name}/>
            <DetailField label="Mobile" value={booking.mobile} href={`tel:${booking.mobile}`} icon={<FaPhone aria-hidden="true"/>}/>
            <DetailField label="Email" value={booking.email||"Not provided"} href={booking.email?`mailto:${booking.email}`:undefined}/>
            <DetailField label="Location" value={booking.location} icon={<FaLocationDot aria-hidden="true"/>}/>
          </div>
          <div className="customer-actions"><a className="whatsapp-link" href={`https://wa.me/${whatsappNumber(booking.mobile)}`} target="_blank" rel="noreferrer"><FaWhatsapp aria-hidden="true"/> WhatsApp</a>{booking.email&&<a className="email-link" href={`mailto:${booking.email}`}><FaEnvelope aria-hidden="true"/> Email Customer</a>}</div>
        </section>

        <section className="detail-card status-card">
          <CardHeading number="02" title="Booking Status"/>
          <label className="status-select-label" htmlFor="booking-status">Current service progress</label>
          <select id="booking-status" className={`status-select status-${normalizeStatus(selectedStatus)}`} value={selectedStatus} disabled={updating} onChange={event=>{setSelectedStatus(event.target.value);setStatusMessage("");setStatusError("");}}>
            {!statuses.some(option=>option.value===selectedStatus)&&<option value={selectedStatus}>{displayStatus(selectedStatus)}</option>}
            {statuses.map(status=><option value={status.value} key={status.value}>{status.label}</option>)}
          </select>
          <button className="update-status-button" type="button" onClick={()=>updateStatus(selectedStatus)} disabled={updating||normalizeStatus(selectedStatus)===normalizeStatus(booking.status)}>{updating?"Updating...":"Update Status"}</button>
          <div className="status-feedback" aria-live="polite">{updating?<span className="status-saving">Saving status...</span>:statusMessage?<span className="status-success"><FaCheck aria-hidden="true"/> {statusMessage}</span>:statusError?<span className="status-failure">{statusError}</span>:<span>Status updates are saved to this booking.</span>}</div>
          {statusError&&technicalError&&<small className="status-technical">{technicalError}</small>}
        </section>

        <section className="detail-card service-card">
          <CardHeading number="03" title="Service Details"/>
          <div className="service-summary"><span>Service</span><strong>{booking.service_type}</strong></div>
          <div className="items-table-wrap"><table className="items-table"><thead><tr><th>Selected Gear</th><th>Qty</th><th>Unit Price</th><th>Total Price</th></tr></thead><tbody>
            {items.length?items.map((item,index)=><tr key={`${item.item_name}-${index}`}><td>{item.item_name}</td><td>{item.quantity}</td><td>{money(item.unit_price)}</td><td>{money(item.total_price)}</td></tr>):<tr><td className="no-items" colSpan={4}>No individual gear items recorded.</td></tr>}
          </tbody></table></div>
        </section>

        <section className="detail-card booking-info-card">
          <CardHeading number="04" title="Booking Details"/>
          <div className="booking-info-grid">
            <DetailField label="Preferred Date" value={formatDate(booking.preferred_date)} icon={<FaCalendarDays aria-hidden="true"/>}/>
            <DetailField label="Created At" value={formatDateTime(booking.created_at)}/>
            <DetailField label="Estimated Total" value={money(booking.estimated_total)} emphasized/>
            <div className="notes-field"><span>Notes</span><p>{booking.notes?.trim()||"No additional notes"}</p></div>
          </div>
        </section>
      </div>
    </>}
  </div>
  <style jsx global>{`
    .detail-page{min-height:100vh;background:#F3F7F5;color:#17384B;font-family:"DM Sans",Arial,sans-serif;padding:0 24px 48px}
    .detail-shell{width:min(1120px,100%);margin:0 auto}
    .detail-header{min-height:76px;display:flex;align-items:center;justify-content:space-between;gap:18px;border-bottom:1px solid #D7E2DE}
    .detail-brand{display:flex;align-items:center;gap:10px}.detail-brand img{width:40px;height:40px;object-fit:contain}.detail-brand div{display:grid;gap:4px}.detail-brand span{font:700 19px/.9 "Barlow Condensed",Impact,sans-serif;color:#17384B}.detail-brand strong{font-size:8px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#28757B}
    .back-link{display:inline-flex;align-items:center;gap:8px;padding:9px 12px;border:1px solid #D7E2DE;border-radius:4px;background:#fff;color:#28757B;font-size:10px;font-weight:800;text-decoration:none;transition:background .15s,border-color .15s}.back-link:hover{border-color:#A9D83B;background:#F8FBF2}.back-link svg{font-size:10px}
    .detail-title{display:flex;align-items:end;justify-content:space-between;gap:20px;padding:29px 0 20px}.detail-eyebrow,.card-kicker{color:#28757B;font-size:9px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}.detail-title h1{margin:7px 0 5px;font:700 36px/.95 "Barlow Condensed",Impact,sans-serif;text-transform:uppercase}.detail-title h1 em{color:#28757B;font-style:normal}.detail-title p{margin:0;color:#687B7B;font-size:11px;line-height:1.55}
    .detail-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr);gap:14px;align-items:start}.detail-card{min-width:0;padding:19px;border:1px solid #D7E2DE;border-radius:7px;background:#fff;box-shadow:0 4px 15px rgba(23,56,75,.035)}.service-card{grid-column:1}.booking-info-card{grid-column:2;grid-row:2}.status-card{grid-column:2;grid-row:1}
    .card-heading{display:flex;align-items:center;gap:10px;margin-bottom:17px}.card-number{width:27px;height:27px;display:grid;place-items:center;background:#EAF3F1;color:#28757B;font:700 14px "Barlow Condensed",Impact,sans-serif}.card-heading h2{margin:0;font:700 22px/1 "Barlow Condensed",Impact,sans-serif;text-transform:uppercase;color:#17384B}
    .customer-details{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 18px}.detail-field{min-width:0;display:grid;gap:6px}.detail-field>span,.notes-field>span{display:flex;align-items:center;gap:6px;color:#788783;font-size:8px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.detail-field>span svg{color:#28757B;font-size:9px}.detail-field strong,.detail-field a{color:#17384B;font-size:11px;font-weight:700;overflow-wrap:anywhere;text-decoration:none}.detail-field a:hover{color:#28757B;text-decoration:underline}.customer-actions{display:flex;gap:8px;margin-top:19px;padding-top:14px;border-top:1px solid #E8EFEC}.whatsapp-link,.email-link{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:32px;padding:0 11px;border:1px solid #D7E2DE;border-radius:4px;color:#28757B;font-size:9px;font-weight:800;text-decoration:none}.whatsapp-link{border-color:#CFE2D4;background:#F3F8F2;color:#36765F}.whatsapp-link:hover,.email-link:hover{border-color:#A9D83B;background:#F7FAF1}.customer-actions svg{font-size:12px}
    .status-select-label{display:block;margin-bottom:7px;color:#788783;font-size:9px;font-weight:700}.status-select{width:100%;min-height:41px;padding:0 11px;border:1px solid #D7E2DE;border-radius:4px;background:#fff;color:#17384B;font:700 11px "DM Sans",Arial,sans-serif;outline:none}.status-select:focus{border-color:#28757B;box-shadow:0 0 0 3px rgba(40,117,123,.09)}.status-select:disabled{opacity:.65;cursor:wait}.status-select.status-new{background:#FBF8EB;color:#887635}.status-select.status-received{background:#EEF7F5;color:#28757B}.status-select.status-cleaning{background:#EEF7F5;color:#28757B}.status-select.status-quality_check{background:#F2F3FA;color:#625B87}.status-select.status-ready{background:#F3F8E9;color:#64852E}.status-select.status-delivered{background:#F0F6F2;color:#54745F}.status-select.status-cancelled{background:#FBF4F2;color:#976253}.update-status-button{width:100%;min-height:36px;margin-top:10px;border:0;border-radius:4px;background:#28757B;color:#fff;font:800 9px "DM Sans",Arial,sans-serif;text-transform:uppercase;cursor:pointer;transition:background .15s,opacity .15s}.update-status-button:hover:not(:disabled){background:#205F64}.update-status-button:disabled{opacity:.48;cursor:not-allowed}.status-feedback{min-height:20px;margin-top:9px;color:#83918C;font-size:9px}.status-success{display:inline-flex;align-items:center;gap:5px;color:#527B32;font-weight:800}.status-success svg{font-size:9px}.status-failure{color:#A24F3D}.status-saving{color:#28757B}.status-technical{display:block;color:#8A9692;font-size:8px;overflow-wrap:anywhere}
    .status-pill{display:inline-flex;align-items:center;padding:6px 9px;border:1px solid #D7E2DE;border-radius:4px;background:#F3F7F5;color:#526A70;font-size:8px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}.status-pill.status-new{border-color:#E9E3C8;background:#FBF8EB;color:#887635}.status-pill.status-received{border-color:#CFE2E0;background:#EEF7F5;color:#28757B}.status-pill.status-cleaning{border-color:#CFE2E0;background:#EEF7F5;color:#28757B}.status-pill.status-quality_check{border-color:#DBD8ED;background:#F2F3FA;color:#625B87}.status-pill.status-ready{border-color:#D8E6BC;background:#F3F8E9;color:#64852E}.status-pill.status-delivered{border-color:#D5E3DA;background:#F0F6F2;color:#54745F}.status-pill.status-cancelled{border-color:#E8D7D2;background:#FBF4F2;color:#976253}
    .service-summary{display:flex;justify-content:space-between;gap:12px;padding:0 0 14px}.service-summary span{color:#788783;font-size:9px;font-weight:700}.service-summary strong{color:#17384B;font-size:11px;text-align:right}.items-table-wrap{overflow-x:auto;border:1px solid #E5ECE9;border-radius:4px}.items-table{width:100%;min-width:470px;border-collapse:collapse;text-align:left}.items-table th{padding:9px 10px;background:#F5F8F6;color:#74827E;font-size:8px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;white-space:nowrap}.items-table td{padding:10px;border-top:1px solid #E8EFEC;color:#435C62;font-size:9px}.items-table th:not(:first-child),.items-table td:not(:first-child){text-align:right;white-space:nowrap}.items-table .no-items{text-align:left!important;color:#83918C}
    .booking-info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 12px}.booking-info-grid .detail-field strong.emphasized{font:700 23px/1 "Barlow Condensed",Impact,sans-serif;color:#28757B}.notes-field{grid-column:1/-1;display:grid;gap:7px;padding-top:13px;border-top:1px solid #E8EFEC}.notes-field p{min-height:34px;margin:0;color:#53696D;font-size:10px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}
    .detail-state{min-height:calc(100vh - 78px);display:flex;align-items:center;justify-content:center;gap:13px}.detail-state>div{display:grid;gap:6px}.detail-state strong{color:#17384B;font-size:13px}.detail-state small{color:#7B8985;font-size:10px}.detail-state a{margin-top:7px;color:#28757B;font-size:10px;font-weight:800;text-decoration:none}.detail-state a:hover{text-decoration:underline}.detail-spinner{width:24px;height:24px;border:2px solid #DDE8E3;border-top-color:#28757B;border-radius:50%;animation:detail-spin .8s linear infinite}@keyframes detail-spin{to{transform:rotate(360deg)}}.detail-error,.detail-not-found{min-height:300px}.detail-state-mark{width:36px;height:36px;display:grid;place-items:center;border:1px solid #D7E2DE;border-radius:50%;background:#fff;color:#28757B;font:700 18px "Barlow Condensed",Impact,sans-serif}.detail-error .detail-state-mark{color:#A24F3D;border-color:#E8D7D2;background:#FBF4F2}
    @media(max-width:760px){.detail-page{padding-inline:16px}.detail-grid{grid-template-columns:1fr}.status-card,.service-card,.booking-info-card{grid-column:1;grid-row:auto}.status-card{grid-row:1}.customer-card{grid-row:2}.service-card{grid-row:3}.booking-info-card{grid-row:4}}
    @media(max-width:520px){.detail-page{padding-inline:12px}.detail-header{min-height:68px}.detail-brand img{width:35px;height:35px}.detail-brand span{font-size:17px}.back-link{padding:8px 9px;font-size:9px}.detail-title{align-items:flex-start;flex-direction:column;padding:22px 0 16px}.detail-title h1{font-size:32px}.detail-card{padding:15px}.customer-details{grid-template-columns:1fr;gap:13px}.booking-info-grid{grid-template-columns:1fr 1fr}.items-table{min-width:430px}.customer-actions{flex-wrap:wrap}.whatsapp-link,.email-link{flex:1}.detail-state{min-height:calc(100vh - 68px)}}
    @media(prefers-reduced-motion:reduce){.detail-spinner{animation-duration:2s}}
  `}</style>
  </main>;
}

function CardHeading({number,title}:{number:string;title:string}){
  return <div className="card-heading"><span className="card-number">{number}</span><h2>{title}</h2></div>;
}

function DetailField({label,value,href,icon,emphasized}:{label:string;value:string;href?:string;icon?:React.ReactNode;emphasized?:boolean}){
  return <div className="detail-field"><span>{icon}{label}</span>{href?<a href={href}>{value}</a>:<strong className={emphasized?"emphasized":""}>{value}</strong>}</div>;
}

function StatusBadge({status}:{status:string}){
  return <span className={`status-pill status-${normalizeStatus(status)}`}>{displayStatus(status)}</span>;
}