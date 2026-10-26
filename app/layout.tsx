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
  metadataBase: new URL("https://syborx-calculo-3d.karlozvx.chatgpt.site"),
  title: "SyborX · Laboratorio de Cálculo 3D",
  description: "Visualización educativa de superficies matemáticas en 3D y realidad aumentada.",
  openGraph: {
    title: "SyborX · Laboratorio de Cálculo 3D",
    description: "De la ecuación al espacio real.",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "Superficie matemática 3D de SyborX" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SyborX · Laboratorio de Cálculo 3D",
    description: "De la ecuación al espacio real.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
