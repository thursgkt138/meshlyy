import type { Metadata } from "next";
import localFont from "next/font/local";
import { CommerceLanding } from "./components/commerce-landing";
import "./commerce-home.css";
import "./commerce-motion.css";
import "./commerce-next-chapter.css";
import "./forest-commerce.css";
import "./forest-refinements.css";

const dmSans = localFont({
  src: "../public/fonts/meshlyy-dm-sans.ttf",
  display: "swap",
  variable: "--meshlyy-font",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Meshlyy — Every store. Every product. One intelligent network.",
  description: "Discover Meshlyy: connecting local stores, products and shoppers. Find products nearby, request pickup, and bring your store online.",
  icons: { icon: { url: "/meshlyy-emerald.svg", type: "image/svg+xml" } },
};

export default function Home() {
  return <div className={`${dmSans.variable} cm-site forest-theme`}><CommerceLanding /></div>;
}
