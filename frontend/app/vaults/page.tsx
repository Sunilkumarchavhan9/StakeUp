"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import ProgramVaultsList from "../components/program-vaults-list";
import SidebarBrand from "../components/sidebar-brand";

type VerificationState = "done" | "pending" | "blocked";

type VerificationStep = {
  label: string;
  state: VerificationState;
};

type VaultItem = {
  id: string;
  goal: string;
  owner: string;
  amount: string;
  status: "Locked" | "Ready to release" | "Donated";
  unlockAt: string;
  verifier: string;
  verifierPendingHours: number;
  disputeFlag: boolean;
  missingProof: boolean;
  charityName: string;
  charityWallet: string;
  steps: VerificationStep[];
};

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Goals", href: "/goals" },
  { label: "Vaults", href: "/vaults" },
  { label: "Charities", href: "/charities" },
  { label: "Verifiers", href: "/verifiers" },
  { label: "Docs", href: "/docs" },
];

const vaults: VaultItem[] = [
  {
    id: "VLT-1092",
    goal: "Run 100km in 7 days",
    owner: "Amit",
    amount: "0.50 SOL",
    status: "Locked",
    unlockAt: "2026-03-05T18:00:00Z",
    verifier: "Verifier-01",
    verifierPendingHours: 28,
    disputeFlag: false,
    missingProof: false,
    charityName: "Save Animals DAO",
    charityWallet: "save-animals.sol",
    steps: [
      { label: "Proof submitted", state: "done" },
      { label: "Verifier pending", state: "pending" },
      { label: "Multi-sig approval", state: "pending" },
      { label: "Release window", state: "pending" },
    ],
  },
  {
    id: "VLT-1154",
    goal: "Gym 12 sessions",
    owner: "Riya",
    amount: "0.80 SOL",
    status: "Ready to release",
    unlockAt: "2026-02-28T09:30:00Z",
    verifier: "Verifier-08",
    verifierPendingHours: 2,
    disputeFlag: false,
    missingProof: false,
    charityName: "Youth Sports Fund",
    charityWallet: "youth-sports.sol",
    steps: [
      { label: "Proof submitted", state: "done" },
      { label: "Verifier pending", state: "done" },
      { label: "Multi-sig approval", state: "pending" },
      { label: "Release window", state: "pending" },
    ],
  },
  {
    id: "VLT-0963",
    goal: "Cycling 200km",
    owner: "Dev",
    amount: "0.40 SOL",
    status: "Donated",
    unlockAt: "2026-02-20T16:00:00Z",
    verifier: "Verifier-03",
    verifierPendingHours: 0,
    disputeFlag: true,
    missingProof: true,
    charityName: "Clean Oceans DAO",
    charityWallet: "clean-oceans.sol",
    steps: [
      { label: "Proof submitted", state: "done" },
      { label: "Verifier pending", state: "done" },
      { label: "Multi-sig approval", state: "blocked" },
      { label: "Donation executed", state: "done" },
    ],
  },
];

const txFeed = [
  { hash: "0x8e2...91a", action: "Deposit", amount: "0.50 SOL", time: "2h ago" },
  { hash: "0x45d...7cf", action: "Verifier approval", amount: "-", time: "9h ago" },
  { hash: "0xb61...5aa", action: "Donation transfer", amount: "0.40 SOL", time: "1d ago" },
];

const parseAmount = (value: string) => {
  const numeric = Number.parseFloat(value);
  return Number.isNaN(numeric) ? 0 : numeric;
};

const vaultHealth = (vault: VaultItem, now: number) => {
  if (vault.status === "Donated") {
    return 35;
  }
  let score = 100;
  score -= Math.min(25, Math.floor(vault.verifierPendingHours / 4));
  if (vault.disputeFlag) {
    score -= 25;
  }
  if (vault.missingProof) {
    score -= 20;
  }
  const hoursToUnlock = (new Date(vault.unlockAt).getTime() - now) / (1000 * 60 * 60);
  if (hoursToUnlock <= 48 && vault.status === "Locked") {
    score -= 12;
  }
  return Math.max(0, Math.min(100, score));
};

const vaultAlerts = (vault: VaultItem, now: number) => {
  const alerts: string[] = [];
  if (vault.verifierPendingHours >= 24) {
    alerts.push(`Verifier delayed ${vault.verifierPendingHours}h`);
  }
  const unlockDiffHours = (new Date(vault.unlockAt).getTime() - now) / (1000 * 60 * 60);
  if (unlockDiffHours > 0 && unlockDiffHours <= 48) {
    alerts.push("Unlock window near");
  }
  if (vault.missingProof) {
    alerts.push("Proof missing");
  }
  if (vault.disputeFlag) {
    alerts.push("Dispute flag active");
  }
  return alerts;
};

const releaseTimeline = [
  { date: "Today", item: "VLT-1154 release request", state: "Queued" },
  { date: "Mar 2", item: "VLT-1092 verifier checkpoint", state: "Pending verifier" },
  { date: "Mar 5", item: "VLT-1092 unlock window", state: "Scheduled" },
];

export default function VaultsPage() {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  const totalLocked = useMemo(
    () =>
      vaults
        .filter((vault) => vault.status === "Locked")
        .reduce((sum, vault) => sum + parseAmount(vault.amount), 0),
    [],
  );
  const pendingRelease = useMemo(
    () => vaults.filter((vault) => vault.status === "Ready to release").length,
    [],
  );
  const avgHealth = useMemo(
    () =>
      Math.round(
        vaults.reduce((sum, vault) => sum + vaultHealth(vault, now), 0) / (vaults.length || 1),
      ),
    [now],
  );
  const globalAlerts = useMemo(
    () => vaults.flatMap((vault) => vaultAlerts(vault, now).map((item) => `${vault.id}: ${item}`)),
    [now],
  );

  return (
    <div className="h-screen overflow-hidden bg-[var(--surface)] text-[var(--ink)]">
      <div className="grid h-screen grid-cols-[240px_1fr]">
        <aside className="hide-scrollbar flex h-screen flex-col justify-between overflow-y-auto border-r border-[var(--card-border)] bg-white px-5 py-6 text-[var(--ink)]">
          <div>
            <SidebarBrand sectionLabel="Vaults" />
            <nav className="mt-6 space-y-2 text-sm">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex w-full items-center justify-between rounded-none border border-transparent px-4 py-3 text-left text-xs uppercase tracking-[0.35em] transition hover:border-[var(--brand)] hover:bg-white/80 hover:text-[var(--ink)] ${
                    item.label === "Vaults" ? "text-[var(--ink)]" : "text-[var(--ink)]/70"
                  }`}
                >
                  {item.label}
                  <span className="text-[0.55rem] text-[var(--ink)]/60">{"->"}</span>
                </Link>
              ))}
            </nav>
          </div>
          <div className="space-y-3">
            <p className="text-[0.6rem] uppercase tracking-[0.3em] text-[var(--ink)]/60">Vault wallet</p>
            <div className="rounded-none border border-[var(--card-border)] bg-[var(--card)] p-3 text-xs text-[var(--ink)]/70">
              <p>Main treasury connected</p>
              <p className="text-[0.6rem] text-[var(--ink)]/60">Signer: StakeUp Program</p>
            </div>
          </div>
        </aside>

        <main className="hide-scrollbar h-screen overflow-y-auto mx-auto w-full max-w-6xl space-y-6 px-4 py-10">
          <header className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-6 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <p className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">Vaults</p>
            <h1 className="text-4xl font-semibold">Vault Management</h1>
            <p className="mt-2 text-base text-slate-600">
              Live vault health, countdown clarity, verification trust, and conditional release logic.
            </p>
          </header>

          {globalAlerts.length > 0 && (
            <section className="rounded-none border border-amber-300 bg-amber-50 px-6 py-4">
              <p className="text-sm font-semibold text-amber-800">Risk alerts</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-800">
                {globalAlerts.map((alert) => (
                  <li key={alert}>{alert}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-none border border-[var(--card-border)] bg-white px-5 py-4">
              <p className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-500">Total vaults</p>
              <p className="mt-2 text-3xl font-semibold">{vaults.length}</p>
            </article>
            <article className="rounded-none border border-[var(--card-border)] bg-white px-5 py-4">
              <p className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-500">Locked funds</p>
              <p className="mt-2 text-3xl font-semibold">{totalLocked.toFixed(2)} SOL</p>
            </article>
            <article className="rounded-none border border-[var(--card-border)] bg-white px-5 py-4">
              <p className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-500">Pending release</p>
              <p className="mt-2 text-3xl font-semibold">{pendingRelease}</p>
            </article>
            <article className="rounded-none border border-[var(--card-border)] bg-white px-5 py-4">
              <p className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-500">Avg vault health</p>
              <p className="mt-2 text-3xl font-semibold">{avgHealth}%</p>
            </article>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <article className="rounded-none border border-[var(--card-border)] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Vaults list</p>
                <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Live vault PDAs
                </span>
              </div>
              <ProgramVaultsList />
            </article>

            <article className="rounded-none border border-[var(--card-border)] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Release timeline</p>
              <div className="mt-4 space-y-3">
                {releaseTimeline.map((step) => (
                  <div
                    key={`${step.date}-${step.item}`}
                    className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-3"
                  >
                    <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-500">
                      {step.date}
                    </p>
                    <p className="text-sm font-semibold">{step.item}</p>
                    <p className="text-xs text-slate-500">{step.state}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="rounded-none border border-[var(--card-border)] bg-white px-6 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">
                Real-time on-chain events
              </p>
              <span className="text-xs uppercase tracking-[0.3em] text-[var(--brand)]">
                Streaming feed
              </span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse">
                <thead>
                  <tr className="text-left text-[0.6rem] uppercase tracking-[0.3em] text-slate-500">
                    <th className="border-b border-[var(--card-border)] px-2 py-2">Tx hash</th>
                    <th className="border-b border-[var(--card-border)] px-2 py-2">Event</th>
                    <th className="border-b border-[var(--card-border)] px-2 py-2">Amount</th>
                    <th className="border-b border-[var(--card-border)] px-2 py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {txFeed.map((tx) => (
                    <tr key={tx.hash} className="text-sm">
                      <td className="border-b border-[var(--card-border)] px-2 py-3 font-semibold">
                        {tx.hash}
                      </td>
                      <td className="border-b border-[var(--card-border)] px-2 py-3">{tx.action}</td>
                      <td className="border-b border-[var(--card-border)] px-2 py-3">{tx.amount}</td>
                      <td className="border-b border-[var(--card-border)] px-2 py-3 text-slate-500">
                        {tx.time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
