import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";
import { Providers } from "./providers";


const BeVietNam = Be_Vietnam_Pro({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Vault Token Console",
  description: "Vault Token Web3 dashboard for the local Hardhat network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={BeVietNam.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
