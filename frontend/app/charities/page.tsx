"use client";

import { useMemo } from "react";
import Link from "next/link";

import SidebarBrand from "../components/sidebar-brand";
import WalletSidebarPanel from "../components/wallet-sidebar-panel";
import { useStakeupProgram } from "../lib/use-stakeup-program";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Goals", href: "/goals" },
  { label: "Vaults", href: "/vaults" },
  { label: "Charities", href: "/charities" },
  { label: "Verifiers", href: "/verifiers" },
  { label: "Docs", href: "/docs" },
];

const shortenAddress = (value: string) =>
  `${value.slice(0, 4)}...${value.slice(-4)}`;

const formatTimestamp = (unixSeconds: number) => {
  if (unixSeconds <= 0) {
    return "Pending";
  }

  return new Date(unixSeconds * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function CharitiesPage() {
  const { connected, error, goals, loading, recipients } = useStakeupProgram();

  const charityState = useMemo(() => {
    const charityRecipients = recipients.filter((recipient) => recipient.kind === 0);
    const recipientWallets = new Set(
      charityRecipients.map((recipient) => recipient.walletBase58),
    );

    const failedGoals = goals.filter(
      (goal) =>
        goal.status === "Failed" &&
        recipientWallets.has(goal.recipientWallet.toBase58()),
    );
    const settledDonations = failedGoals.filter((goal) => goal.settled);
    const pendingRoutes = failedGoals.filter((goal) => !goal.settled);

    const totalDonated = settledDonations.reduce(
      (sum, goal) => sum + goal.stakeSol,
      0,
    );

    const linkedGoalsByWallet = new Map<string, number>();
    goals.forEach((goal) => {
      const wallet = goal.recipientWallet.toBase58();
      if (!recipientWallets.has(wallet)) {
        return;
      }
      linkedGoalsByWallet.set(wallet, (linkedGoalsByWallet.get(wallet) ?? 0) + 1);
    });

    const list = charityRecipients.map((recipient) => {
      const wallet = recipient.walletBase58;
      const received = settledDonations
        .filter((goal) => goal.recipientWallet.toBase58() === wallet)
        .reduce((sum, goal) => sum + goal.stakeSol, 0);
      const latestTransfer = settledDonations
        .filter((goal) => goal.recipientWallet.toBase58() === wallet)
        .sort((left, right) => right.settledAt - left.settledAt)[0];

      return {
        wallet,
        label: recipient.label,
        totalReceived: received,
        lastTransfer: latestTransfer ? formatTimestamp(latestTransfer.settledAt) : "No donations yet",
        activeGoals: linkedGoalsByWallet.get(wallet) ?? 0,
        isActive: recipient.active,
      };
    });

    const donationFeed = settledDonations
      .slice()
      .sort((left, right) => right.settledAt - left.settledAt)
      .slice(0, 8)
      .map((goal) => ({
        hash: goal.publicKey.toBase58(),
        fromVault: goal.vault.toBase58(),
        to: goal.recipientLabel,
        toWallet: goal.recipientWallet.toBase58(),
        amount: `${goal.stakeSol.toFixed(2)} SOL`,
        time: formatTimestamp(goal.settledAt),
      }));

    const routingRules = charityRecipients.map((recipient) => ({
      label: recipient.label,
      rule: recipient.active
        ? "Available for fallback routing"
        : "Registered but currently inactive",
      coverage: `${linkedGoalsByWallet.get(recipient.walletBase58) ?? 0} linked live goals`,
    }));

    const routeableFailedGoals = failedGoals.length;
    const routingAccuracy =
      routeableFailedGoals > 0
        ? Math.round((settledDonations.length / routeableFailedGoals) * 100)
        : 100;

    return {
      charityRecipients,
      list,
      totalDonated,
      activeLinkedGoals: failedGoals.length + pendingRoutes.length,
      routingAccuracy,
      donationFeed,
      routingRules,
      pendingRoutes,
    };
  }, [goals, recipients]);

  return (
    <div className="h-screen overflow-hidden bg-[var(--surface)] text-[var(--ink)]">
      <div className="grid h-screen grid-cols-[240px_1fr]">
        <aside className="hide-scrollbar flex h-screen flex-col justify-between overflow-y-auto border-r border-[var(--card-border)] bg-white px-5 py-6 text-[var(--ink)]">
          <div>
            <SidebarBrand sectionLabel="Charities" />
            <nav className="mt-6 space-y-2 text-sm">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex w-full items-center justify-between rounded-none border border-transparent px-4 py-3 text-left text-xs uppercase tracking-[0.35em] transition hover:border-[var(--brand)] hover:bg-white/80 hover:text-[var(--ink)] ${
                    item.label === "Charities" ? "text-[var(--ink)]" : "text-[var(--ink)]/70"
                  }`}
                >
                  {item.label}
                  <span className="text-[0.55rem] text-[var(--ink)]/60">{"->"}</span>
                </Link>
              ))}
            </nav>
          </div>
          <WalletSidebarPanel />
        </aside>

        <main className="hide-scrollbar h-screen overflow-y-auto mx-auto w-full max-w-6xl space-y-6 px-4 py-10">
          <header className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-6 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">Charities</p>
                <h1 className="text-4xl font-semibold">Charity Management</h1>
                <p className="mt-2 text-base text-slate-600">
                  Track donation routing, wallet transparency, and impact performance across all fallback paths.
                </p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--brand)]">
                {loading ? "Refreshing" : "Live devnet"}
              </span>
            </div>
          </header>

          {error && (
            <section className="rounded-none border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </section>
          )}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-none border border-[var(--card-border)] bg-white px-5 py-4">
              <p className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-500">Registered charities</p>
              <p className="mt-2 text-3xl font-semibold">{charityState.charityRecipients.length}</p>
            </article>
            <article className="rounded-none border border-[var(--card-border)] bg-white px-5 py-4">
              <p className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-500">Total donated</p>
              <p className="mt-2 text-3xl font-semibold">{charityState.totalDonated.toFixed(2)} SOL</p>
            </article>
            <article className="rounded-none border border-[var(--card-border)] bg-white px-5 py-4">
              <p className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-500">Failed goals routed</p>
              <p className="mt-2 text-3xl font-semibold">{charityState.activeLinkedGoals}</p>
            </article>
            <article className="rounded-none border border-[var(--card-border)] bg-white px-5 py-4">
              <p className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-500">Routing accuracy</p>
              <p className="mt-2 text-3xl font-semibold">{charityState.routingAccuracy}%</p>
            </article>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-none border border-[var(--card-border)] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Charity list</p>
                <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Live on-chain recipients</span>
              </div>
              <div className="mt-4 space-y-3">
                {charityState.list.length === 0 && (
                  <p className="text-sm text-slate-500">
                    {connected
                      ? "No live charity recipients registered yet."
                      : "Connect a wallet to inspect live charity recipients."}
                  </p>
                )}
                {charityState.list.map((charity) => (
                  <div
                    key={charity.wallet}
                    className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{charity.label}</p>
                        <p className="text-xs text-slate-500">
                          {shortenAddress(charity.wallet)} · {charity.isActive ? "Active" : "Inactive"}
                        </p>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--brand)]">
                        {charity.totalReceived.toFixed(2)} SOL
                      </span>
                    </div>
                    <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                      <p>Wallet: {charity.wallet}</p>
                      <p>Last transfer: {charity.lastTransfer}</p>
                      <p>Linked goals: {charity.activeGoals}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-none border border-[var(--card-border)] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Routing logic preview</p>
              <div className="mt-4 space-y-3">
                {charityState.routingRules.length === 0 && (
                  <p className="text-sm text-slate-500">Register a charity to enable fallback routing.</p>
                )}
                {charityState.routingRules.map((rule) => (
                  <div
                    key={rule.label}
                    className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-3"
                  >
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{rule.label}</p>
                    <p className="text-sm font-semibold">{rule.rule}</p>
                    <p className="text-xs text-slate-500">{rule.coverage}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="rounded-none border border-[var(--card-border)] bg-white px-6 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Recent donation transfers</p>
              <span className="text-xs uppercase tracking-[0.3em] text-[var(--brand)]">Live from settled failures</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className="text-left text-[0.6rem] uppercase tracking-[0.3em] text-slate-500">
                    <th className="border-b border-[var(--card-border)] px-2 py-2">Goal PDA</th>
                    <th className="border-b border-[var(--card-border)] px-2 py-2">From vault</th>
                    <th className="border-b border-[var(--card-border)] px-2 py-2">To charity</th>
                    <th className="border-b border-[var(--card-border)] px-2 py-2">Amount</th>
                    <th className="border-b border-[var(--card-border)] px-2 py-2">Settled</th>
                  </tr>
                </thead>
                <tbody>
                  {charityState.donationFeed.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="border-b border-[var(--card-border)] px-2 py-4 text-sm text-slate-500"
                      >
                        No failed settled goals have routed to a charity yet.
                      </td>
                    </tr>
                  )}
                  {charityState.donationFeed.map((tx) => (
                    <tr key={tx.hash} className="text-sm">
                      <td className="border-b border-[var(--card-border)] px-2 py-3 font-semibold">
                        {shortenAddress(tx.hash)}
                      </td>
                      <td className="border-b border-[var(--card-border)] px-2 py-3">
                        {shortenAddress(tx.fromVault)}
                      </td>
                      <td className="border-b border-[var(--card-border)] px-2 py-3">
                        <div>
                          <p>{tx.to}</p>
                          <p className="text-xs text-slate-500">{shortenAddress(tx.toWallet)}</p>
                        </div>
                      </td>
                      <td className="border-b border-[var(--card-border)] px-2 py-3">{tx.amount}</td>
                      <td className="border-b border-[var(--card-border)] px-2 py-3 text-slate-500">{tx.time}</td>
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
