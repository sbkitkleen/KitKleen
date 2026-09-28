import {services,bags} from "@/lib/data";
import {ProductCard} from "@/components/ProductCard";
export default function Services(){
 return <main><section className="page-hero"><div className="shell"><div className="crumb">KitKleen / Services</div><h1>Every piece of gear.<br/><em>Properly cared for.</em></h1><p>Browse individual sports gear care options, then add as many items as you need to your cart.</p></div></section>
 <section className="section section-white"><div className="shell"><div className="section-title"><div><div className="eyebrow">Individual Gear</div><h2>Choose your <em>items</em></h2></div></div><div className="product-grid">{services.map(s=><ProductCard key={s.id} item={s}/>)}</div></div></section>
 <section className="section section-light"><div className="shell"><div className="section-title"><div><div className="eyebrow">Kit Bags</div><h2>Bag <em>Care</em></h2></div></div><div className="product-grid">{bags.map(b=><ProductCard key={b.id} item={{...b,category:"Kit Bag",icon:"▣"}}/>)}</div></div></section>
 </main>;
}
