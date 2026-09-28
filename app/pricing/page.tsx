import {services,bags,packages} from "@/lib/data";
import {ProductCard} from "@/components/ProductCard";
import {AddButton} from "@/components/AddButton";
import {PackageCard} from "@/components/PackageCard";
export default function Pricing(){
 return <main><section className="page-hero"><div className="shell"><div className="crumb">KitKleen / Pricing</div><h1>Clear pricing.<br/><em>No guesswork.</em></h1><p>Individual gear, kit-bag care and complete-kit packages.</p></div></section>
 <section className="section section-white"><div className="shell"><div className="section-title"><div><div className="eyebrow">Individual Gear</div><h2>Price <em>list</em></h2></div></div>
 <div className="price-table"><div className="price-row price-head"><span>Gear</span><span>Price</span><span></span></div>
 {services.map(s=><div className="price-row" key={s.id}><span>{s.name}</span><strong>₹{s.price}</strong><AddButton item={{id:s.id,name:s.name,price:s.price}}/></div>)}</div>
 </div></section>
 <section className="section section-light"><div className="shell"><div className="section-title"><div><div className="eyebrow">Complete Kit</div><h2>Packages <em>& Care</em></h2></div></div>
 <div className="package-grid">{packages.map(p=><PackageCard item={p} key={p.id}/>)}</div>
 <div style={{marginTop:30}}><div className="product-grid">{bags.map(b=><ProductCard key={b.id} item={{...b,category:"Kit Bag",icon:"▣"}}/>)}</div></div>
 </div></section></main>;
}
