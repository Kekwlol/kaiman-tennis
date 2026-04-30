import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Kaiman Tennis — Vereinssoftware",
    template: "%s — Kaiman Tennis",
  },
  description:
    "All-in-One Tennisverein-Software: Reservierung, Mitglieder, Turniere, Buchhaltung. Drei Wege deine Software einzubinden — Subdomain, Custom Domain oder JS-Widget.",
  manifest: "/manifest.webmanifest",
  applicationName: "Kaiman Tennis",
  authors: [{ name: "Klemens Kaindl", url: "https://kaiman.studio" }],
  keywords: [
    "Tennisverein", "Vereinssoftware", "Platzbuchung", "Reservierung",
    "Mitgliederverwaltung", "eTennis Alternative",
  ],
  openGraph: {
    type: "website",
    locale: "de_AT",
    siteName: "Kaiman Tennis",
    title: "Kaiman Tennis — Vereinssoftware, die einfach ist",
    description:
      "Reservierung, Mitglieder, Turniere, Buchhaltung — alles aus einer Hand.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kaiman Tennis",
    description: "Tennisverein-Software, die einfach ist.",
  },
  robots: {
    index: true,
    follow: true,
  },
  themeColor: "#16a34a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900">{children}</body>
    </html>
  );
}
