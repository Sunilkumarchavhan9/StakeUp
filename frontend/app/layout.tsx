import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";

import { StakeupProgramProvider } from "./lib/use-stakeup-program";
import SolanaProvider from "./providers/solana-provider";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "StakeUp",
  description: "Commit funds to goals. Win discipline.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${spaceMono.variable} antialiased`}
      >
        <SolanaProvider>
          <StakeupProgramProvider>{children}</StakeupProgramProvider>
        </SolanaProvider>
      </body>
    </html>
  );
}
