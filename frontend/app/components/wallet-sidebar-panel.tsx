"use client";

import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

import { useStakeupProgram } from "../lib/use-stakeup-program";

const shortenAddress = (address: string) =>
  `${address.slice(0, 4)}...${address.slice(-4)}`;

export default function WalletSidebarPanel() {
  const { connected, publicKey } = useWallet();
  const { config, isAdmin, platformReady, recipients } = useStakeupProgram();
  const activeRecipients = recipients.filter((recipient) => recipient.active).length;

  const walletLabel = connected && publicKey
    ? shortenAddress(publicKey.toBase58())
    : "Not connected";

  const helperText = connected
    ? "Connected on Solana devnet"
    : "Connect Phantom or Solflare";

  const programStatus = platformReady ? "Program ready" : "Program not initialized";

  return (
    <div className="space-y-3">
      <p className="text-[0.6rem] uppercase tracking-[0.3em] text-[var(--ink)]/60">
        Wallet
      </p>
      <div className="rounded-none border border-[var(--card-border)] bg-[var(--card)] p-3 text-xs text-[var(--ink)]/80">
        <p className="font-semibold text-[var(--ink)]">{walletLabel}</p>
        <p className="text-[0.6rem] text-[var(--ink)]/60">{helperText}</p>
      </div>
      <div className="rounded-none border border-[var(--card-border)] bg-white p-3 text-xs text-[var(--ink)]/80">
        <p className="font-semibold text-[var(--ink)]">{programStatus}</p>
        <p className="text-[0.6rem] text-[var(--ink)]/60">
          {config
            ? `Verifier: ${shortenAddress(config.verifier.toBase58())}`
            : "Configure verifier and recipients in Admin"}
        </p>
        {connected && config && (
          <p className="mt-2 text-[0.6rem] text-[var(--ink)]/60">
            {isAdmin ? "Admin wallet detected" : "Read-only wallet connected"}
          </p>
        )}
        <p className="mt-1 text-[0.6rem] text-[var(--ink)]/60">
          {activeRecipients} active / {recipients.length} total recipients
        </p>
        <Link
          href="/verifiers"
          className="mt-3 inline-flex rounded-none border border-[var(--card-border)] px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] transition hover:border-[var(--brand)]"
        >
          Open admin
        </Link>
      </div>
      <WalletMultiButton
        style={{
          width: "100%",
          height: "auto",
          borderRadius: 0,
          background: "var(--brand)",
          color: "var(--ink)",
          fontFamily: "var(--font-space-mono)",
          fontSize: "0.75rem",
          fontWeight: 700,
          justifyContent: "center",
          letterSpacing: "0.3em",
          padding: "0.6rem 1rem",
          textTransform: "uppercase",
        }}
      />
    </div>
  );
}
