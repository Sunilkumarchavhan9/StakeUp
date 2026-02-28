"use client";

import { useMemo } from "react";
import Link from "next/link";

import ProgramGoalsList from "../components/program-goals-list";
import SidebarBrand from "../components/sidebar-brand";
import WalletSidebarPanel from "../components/wallet-sidebar-panel";
import { type LiveGoal, useStakeupProgram } from "../lib/use-stakeup-program";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Goals", href: "/goals" },
  { label: "Vaults", href: "/vaults" },
  { label: "Charities", href: "/charities" },
  { label: "Verifiers", href: "/verifiers" },
  { label: "Docs", href: "/docs" },
];

const trendLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toPoints = (values: number[]) =>
  values
    .map((value, index) => {
      const x = (index / (values.length - 1 || 1)) * 100;
      const y = 100 - value;
      return `${x},${y}`;
    })
    .join(" ");

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

const computeHealth = (goal: LiveGoal) => {
  if (goal.status === "Completed") {
    return 100;
  }
  if (goal.status === "Failed") {
    return 25;
  }

  const progressWeight = goal.progressPercent * 0.7;
  const verifiedWeight = goal.verifiedProgress > 0 ? 20 : 0;
  const checkInWeight = Math.min(goal.checkInCount, 5) * 2;
  return Math.round(clamp(progressWeight + verifiedWeight + checkInWeight, 0, 100));
};

const heatColorClass = (value: number) =>
  value > 0 ? "bg-emerald-500" : "bg-slate-200";

export default function GoalsPage() {
  const { connected, loading, ownerGoals } = useStakeupProgram();

  const metrics = useMemo(() => {
    const totalGoals = ownerGoals.length;
    const completedGoals = ownerGoals.filter((goal) => goal.status === "Completed");
    const pendingGoals = ownerGoals.filter((goal) => goal.status === "Pending");
    const failedGoals = ownerGoals.filter((goal) => goal.status === "Failed");
    const totalStake = ownerGoals.reduce((sum, goal) => sum + goal.stakeSol, 0);
    const completionRate = totalGoals > 0 ? Math.round((completedGoals.length / totalGoals) * 100) : 0;
    const avgHealth = totalGoals > 0 ? Math.round(ownerGoals.reduce((sum, goal) => sum + computeHealth(goal), 0) / totalGoals) : 0;
    const riskyGoals = pendingGoals.filter((goal) => computeHealth(goal) < 60);

    const weeklyTrend = ownerGoals
      .slice(0, 7)
      .map((goal) => goal.progressPercent)
      .reverse();

    while (weeklyTrend.length < 7) {
      weeklyTrend.unshift(0);
    }

    const streakGoal = pendingGoals[0] ?? ownerGoals[0] ?? null;
    const streakPattern = Array.from({ length: 28 }, (_, index) => {
      if (!streakGoal) {
        return 0;
      }

      return index >= 28 - Math.min(streakGoal.checkInCount, 28) ? 1 : 0;
    });

    const upcomingTimeline = [...pendingGoals]
      .sort((left, right) => left.deadlineTs - right.deadlineTs)
      .slice(0, 4)
      .flatMap((goal) => [
        {
          key: `${goal.publicKey.toBase58()}-deadline`,
          when: goal.deadlineLabel,
          title: `${goal.title} deadline`,
          detail: `${goal.progressLabel} tracked on-chain`,
        },
        {
          key: `${goal.publicKey.toBase58()}-window`,
          when: formatTimestamp(goal.deadlineTs + goal.claimWindowSecs),
          title: "Settlement window",
          detail: `Refund or route to ${goal.recipientLabel}`,
        },
      ]);

    const activity = ownerGoals
      .slice(0, 4)
      .map((goal) => {
        if (goal.status === "Completed") {
          return {
            key: `${goal.publicKey.toBase58()}-complete`,
            title: `${goal.title} verified complete`,
            detail: `Verified ${formatTimestamp(goal.verifiedAt)} · refund path live`,
          };
        }

        if (goal.status === "Failed") {
          return {
            key: `${goal.publicKey.toBase58()}-failed`,
            title: `${goal.title} failed`,
            detail: `Route ${goal.recipientLabel} · settle ${goal.settleableNow ? "available" : "pending"}`,
          };
        }

        return {
          key: `${goal.publicKey.toBase58()}-pending`,
          title: `${goal.title} in progress`,
          detail: `${goal.progressLabel} · ${goal.verifiedProgress} verified`,
        };
      });

    return {
      totalGoals,
      completedGoals,
      failedGoals,
      pendingGoals,
      totalStake,
      completionRate,
      avgHealth,
      riskyGoals,
      weeklyTrend,
      streakGoal,
      streakPattern,
      upcomingTimeline,
      activity,
    };
  }, [ownerGoals]);

  return (
    <div className="h-screen overflow-hidden bg-[var(--surface)] text-[var(--ink)]">
      <div className="grid h-screen grid-cols-[240px_1fr]">
        <aside className="hide-scrollbar flex h-screen flex-col justify-between overflow-y-auto border-r border-[var(--card-border)] bg-white px-5 py-6 text-[var(--ink)]">
          <div>
            <SidebarBrand sectionLabel="Goals" />
            <nav className="mt-6 space-y-2 text-sm">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex w-full items-center justify-between rounded-none border border-transparent px-4 py-3 text-left text-xs uppercase tracking-[0.35em] transition hover:border-[var(--brand)] hover:bg-white/80 hover:text-[var(--ink)] ${
                    item.label === "Goals" ? "text-[var(--ink)]" : "text-[var(--ink)]/70"
                  }`}
                >
                  {item.label}
                  <span className="text-[0.55rem] text-[var(--ink)]/60">→</span>
                </Link>
              ))}
            </nav>
          </div>
          <WalletSidebarPanel />
        </aside>

        <main className="hide-scrollbar h-screen overflow-y-auto mx-auto w-full max-w-6xl space-y-6 px-4 py-10">
          <header className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-6 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <p className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">Goals</p>
            <h1 className="text-4xl font-semibold">Goal Tracking</h1>
            <p className="mt-2 text-base text-slate-600">
              Live devnet goal metrics, verifier state, and settlement readiness.
            </p>
          </header>

          {metrics.riskyGoals.length > 0 && (
            <section className="rounded-none border border-amber-300 bg-amber-50 px-6 py-4">
              <p className="text-sm font-semibold text-amber-800">
                {metrics.riskyGoals.length} live goal(s) are below the healthy progress threshold.
              </p>
            </section>
          )}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-none border border-[var(--card-border)] bg-white px-5 py-4">
              <p className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-500">Total goals</p>
              <p className="mt-2 text-3xl font-semibold">{metrics.totalGoals}</p>
            </article>
            <article className="rounded-none border border-[var(--card-border)] bg-white px-5 py-4">
              <p className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-500">Goal health</p>
              <p className="mt-2 text-3xl font-semibold">{metrics.avgHealth}%</p>
            </article>
            <article className="rounded-none border border-[var(--card-border)] bg-white px-5 py-4">
              <p className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-500">Completion rate</p>
              <p className="mt-2 text-3xl font-semibold">{metrics.completionRate}%</p>
            </article>
            <article className="rounded-none border border-[var(--card-border)] bg-white px-5 py-4">
              <p className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-500">Total stake</p>
              <p className="mt-2 text-3xl font-semibold">{metrics.totalStake.toFixed(2)} SOL</p>
            </article>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <article className="rounded-none border border-[var(--card-border)] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <p className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-500">Weekly live progress</p>
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--brand)]">
                  {loading ? "refreshing" : "live"}
                </span>
              </div>
              <div className="mt-5 h-36">
                <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="goalTrendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="var(--brand)" />
                      <stop offset="100%" stopColor="var(--brand-strong)" />
                    </linearGradient>
                  </defs>
                  <polyline
                    fill="none"
                    stroke="url(#goalTrendGradient)"
                    strokeWidth="3"
                    points={toPoints(metrics.weeklyTrend)}
                  />
                </svg>
              </div>
              <div className="mt-3 grid grid-cols-7 text-center text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">
                {trendLabels.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
            </article>

            <article className="rounded-none border border-[var(--card-border)] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <p className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-500">Check-in coverage</p>
              <p className="mt-1 text-xs text-slate-500">
                {metrics.streakGoal
                  ? `${metrics.streakGoal.checkInCount} manual check-ins on ${metrics.streakGoal.title}`
                  : "Create a live goal to start logging progress"}
              </p>
              <div className="mt-4 grid grid-cols-7 gap-2">
                {metrics.streakPattern.map((value, index) => (
                  <div
                    key={`coverage-${index}`}
                    className={`h-4 w-full rounded-none ${heatColorClass(value)}`}
                  />
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>Pending goals: {metrics.pendingGoals.length}</span>
                <span>Failed goals: {metrics.failedGoals.length}</span>
              </div>
            </article>
          </section>

          <section className="space-y-4 rounded-none border border-[var(--card-border)] bg-[var(--card)] px-6 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Goals list</p>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Live devnet goals and actions
              </span>
            </div>
            <ProgramGoalsList />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-none border border-[var(--card-border)] bg-white px-6 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Upcoming deadlines</p>
              <div className="mt-4 space-y-3">
                {metrics.upcomingTimeline.length === 0 && (
                  <p className="text-sm text-slate-500">
                    {connected ? "No pending live deadlines." : "Connect a wallet to load live deadlines."}
                  </p>
                )}
                {metrics.upcomingTimeline.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-3"
                  >
                    <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-500">{item.when}</p>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.detail}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-none border border-[var(--card-border)] bg-white px-6 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Verifier trust timeline</p>
              <div className="mt-4 space-y-4">
                {ownerGoals.length === 0 && (
                  <p className="text-sm text-slate-500">
                    {connected ? "No live goals to verify yet." : "Connect a wallet to load verifier history."}
                  </p>
                )}
                {ownerGoals.slice(0, 4).map((goal) => (
                  <div
                    key={`${goal.publicKey.toBase58()}-verifier`}
                    className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-3"
                  >
                    <p className="text-sm font-semibold">{goal.title}</p>
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span>Verified syncs</span>
                        <span className="font-semibold text-[var(--brand)]">
                          {goal.verifiedCheckInCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Last verified</span>
                        <span className="text-slate-500">{formatTimestamp(goal.lastVerifiedAt)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Status</span>
                        <span className="text-slate-500">{goal.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="rounded-none border border-[var(--card-border)] bg-white px-6 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Recent activity</p>
            <div className="mt-3 space-y-3">
              {metrics.activity.length === 0 && (
                <p className="text-sm text-slate-500">
                  {connected ? "No live activity yet." : "Connect a wallet to load live activity."}
                </p>
              )}
              {metrics.activity.map((item) => (
                <div
                  key={item.key}
                  className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-3"
                >
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
