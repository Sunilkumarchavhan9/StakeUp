"use client";

import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import BrandLogo from "./brand-logo";

export default function Navbar() {
  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen border-b border-[#D9D9D9] pb-5">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="text-black">
          <BrandLogo className="h-auto w-[180px]" />
        </Link>
        <div className="flex items-center gap-10">
          <a
            href="#how-it-works"
            className="transition-colors hover:text-[var(--brand-strong)]"
          >
            How it Works
          </a>
          <a
            href="#features"
            className="transition-colors hover:text-[var(--brand-strong)]"
          >
            Feature
          </a>
          <Link
            href="/docs"
            className="transition-colors hover:text-[var(--brand-strong)]"
          >
            Docs
          </Link>
        </div>
        <WalletMultiButton
          style={{
            borderRadius: 0,
            background: "#00FFA6",
            color: "#101010",
            fontFamily: "var(--font-space-mono)",
            fontSize: "1rem",
            fontWeight: 700,
            letterSpacing: "0.02em",
            padding: "0.75rem 1.25rem",
            textTransform: "none",
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-5 left-0 h-2 w-2 -translate-x-1/2 translate-y-1/2 bg-[#D9D9D9]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-2 right-0 h-2 w-2 translate-x-1/2 translate-y-2/1 bg-[#D9D9D9]"
        />
      </div>
    </div>
  );
}
