import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Meshlyy — Your neighbourhood. Connected.",
  description: "Discover nearby stores, reserve what you need, and pick it up locally.",
  icons: { icon: { url: "/mark.svg", type: "image/svg+xml" } },
};
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
