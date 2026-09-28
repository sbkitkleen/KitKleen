import type {Metadata} from "next";
import "./globals.css";
import {Providers} from "@/components/Providers";
import {SiteFooter,SiteHeader} from "@/components/SiteChrome";

export const metadata:Metadata = {
  title:"KitKleen | Professional Sports Gear Care",
  description:"Professional cleaning, sanitisation and care for cricket and sports gear."
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en" data-scroll-behavior="smooth"><body><Providers><SiteHeader/>{children}<SiteFooter/></Providers></body></html>;
}
