import Image from "next/image";

const values=[["Protect","Treat equipment according to what it is used for."],["Clean","Target dirt, sweat, stains and unwanted odour."],["Care","Use appropriate drying and conditioning steps."],["Restore","Help well-used gear feel ready for its next session."]];
const credentials=[
	["MONTHS OF RESEARCH","Understanding equipment materials, cleaning requirements and common gear-care problems."],
	["TESTING & REFINEMENT","Evaluating cleaning, drying, sanitisation and care approaches."],
	["SPORTS GEAR KNOWLEDGE","Understanding how equipment is used and where sweat, dirt and odour accumulate."],
	["PROFESSIONAL CARE","A structured process designed specifically around sports equipment rather than a basic wash."],
];

export default function About(){
 return <main>
	<section className="page-hero"><div className="shell"><div className="crumb">KitKleen / About Us</div><h1>Sports gear care,<br/><em>done properly.</em></h1><p>KitKleen is being built around one simple idea: sports gear deserves more than a basic wash.</p></div></section>
	<section className="section section-white"><div className="shell about-grid"><div className="about-visual"><Image src="/kitkleen-logo.png" alt="KitKleen logo" width={1254} height={1254}/></div><div className="about-copy"><div className="eyebrow">Our approach</div><h2>Clean. <em>Care.</em> Restore.</h2><p>From cricket pads and gloves to helmets, footwear and kit bags, the aim is to create a professional, convenient care service for equipment that is expensive, heavily used and often difficult to clean properly.</p><div className="values">{values.map(([title,description])=><div className="value-card" key={title}><strong>{title}</strong><p>{description}</p></div>)}</div></div></div></section>
	<section className="research-section"><div className="shell">
	 <div className="research-heading"><div className="eyebrow">Built around equipment, not a wash cycle</div><h2>NOT JUST A WASH.<br/><em>A SPORTS GEAR CARE PROCESS.</em></h2>
		<div className="research-copy"><p>KitKleen was developed through months of research, testing and practical understanding of sports equipment and the materials used in it.</p><p>Sports gear isn&apos;t the same as everyday clothing. Leather, foam, fabric, rubber and protective materials can require different cleaning, drying and care approaches.</p><p>Improper cleaning or drying can contribute to material deterioration and shorten the usable life of expensive equipment.</p></div>
	 </div>
	<div className="research-message"><span className="research-mark"><Image src="/kitkleen-logo.png" alt="" width={1254} height={1254}/></span><div><h3>Sports gear deserves more than a regular wash.</h3><p>A basic cleaning approach may not be appropriate for every piece of sports equipment. KitKleen focuses on cleaning, sanitisation, drying and care with the equipment&apos;s material and purpose in mind.</p></div></div>
	 <div className="credential-grid">{credentials.map(([title,description],index)=><article className="credential-card" key={title}><span>0{index+1} / KITKLEEN</span><h3>{title}</h3><p>{description}</p><i aria-hidden="true"/></article>)}</div>
	</div></section>
 </main>;
}
