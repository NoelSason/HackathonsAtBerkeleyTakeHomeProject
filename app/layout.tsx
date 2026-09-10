import type { Metadata } from "next";
import { Archivo, Geist_Mono } from "next/font/google";
import "./globals.css";

/*
 * Two families do all the work. Archivo is a grotesk with a wide weight
 * range, so headings and body copy come from one typeface and separate on
 * weight, size and tracking instead of on family. Geist Mono is reserved
 * for data that should line up column to column: scores, counts, ids.
 *
 * next/font downloads both at build time and self-hosts them, so there is
 * no request to Google at runtime and no layout shift while they load.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Cal Hacks Portal",
    template: "%s · Cal Hacks Portal",
  },
  description:
    "Apply to Cal Hacks as a hacker, mentor, judge or volunteer, and track your application from submission to decision.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
