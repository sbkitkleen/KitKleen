import Image from "next/image";
import Link from "next/link";

type Package = { id:string; name:string; price:number; tag:string; description:string; includes:readonly string[] };

export function PackageCard({item}:{item:Package}) {
  return <article className={`package-card ${item.id==="pro-care"?"featured":""}`}>
    <div className="package-brand"><Image src="/kitkleen-logo.png" alt="KitKleen logo" width={1254} height={1254}/><span>KITKLEEN / GEAR CARE</span></div>
    <div className="package-price"><span className="tag">{item.tag}</span><strong>₹{item.price}</strong></div>
    <h3>{item.name}</h3><p>{item.description}</p>
    <ul className="package-includes">{item.includes.map(feature=><li key={feature}>{feature}</li>)}</ul>
    <Link className="btn btn-secondary" href={`/booking?package=${item.id}`}>Choose Package →</Link>
  </article>;
}