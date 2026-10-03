import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const sans = DM_Sans({
  variable: "--font-dm",
  subsets: ["latin"],
});

const serif = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WayOff — prove you know your hometown",
  description:
    "Get dropped on a random sidewalk in a place you know. Find a real street with no GPS pin. Compare ghost routes. Built with Cursor, Grok Voice, and Grok Imagine.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full bg-night font-sans text-sand">{children}</body>
    </html>
  );
}
