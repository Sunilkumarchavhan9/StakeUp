"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import BrandLogo from "../brand-logo";
import GoalCreateButton from "../goal-create-button";
import WalletSidebarPanel from "../wallet-sidebar-panel";
import { useStakeupProgram } from "../../lib/use-stakeup-program";

type DashboardGoal = {
  key: string;
  title: string;
  detail: string;
  status: "Pending" | "Completed" | "Failed";
  slug: string;
  description: string;
  progressPercent: number;
  progressLabel: string;
  stakeSol: number;
  recipientLabel: string;
  deadlineTs: number;
  deadlineLabel: string;
  goalAddress?: string;
  vaultAddress?: string;
};

type StatsCard = { label: string; value: string; meta: string };
type ActivityItem = { id: string; label: string; detail: string; accent: string };
type CalendarEvent = { id: string; title: string; date: string; time: string; goal: string; note: string };

const PROGRAM_ID = "3HfJzm3qJawEJJhrFFn8aYSVYS8qT2B4s5JviAAyE6MB";
const weekDayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Goals", href: "/goals" },
  { label: "Vaults", href: "/vaults" },
  { label: "Charities", href: "/charities" },
  { label: "Verifiers", href: "/verifiers" },
  { label: "Docs", href: "/docs" },
];

const cardBase = "rounded-none border border-[var(--card-border)] bg-[var(--card)] px-5 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]";
const heroCardClass = "rounded-none border border-[var(--card-border)] bg-gradient-to-br from-[var(--brand)]/30 to-[var(--brand-strong)]/30 px-6 py-6 shadow-[0_20px_50px_rgba(15,23,42,0.12)]";

const badgeClass = (status: DashboardGoal["status"]) => {
  if (status === "Completed") return "bg-sky-500/20 text-sky-600";
  if (status === "Failed") return "bg-rose-500/20 text-rose-600";
  return "bg-emerald-500/20 text-emerald-600";
};

const formatCalendarDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function DashboardPage() {
  const [selectedView, setSelectedView] = useState<"Month" | "Week" | "Day" | "Agenda">("Month");
  const [modalEvent, setModalEvent] = useState<CalendarEvent | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const { config, connected, error, ownerGoals, platformReady, publicKey, recipients } = useStakeupProgram();

  const dashboardGoals = useMemo<DashboardGoal[]>(
    () =>
      ownerGoals.map((goal) => ({
        key: goal.publicKey.toBase58(),
        title: goal.title,
        detail: goal.detail,
        status: goal.status,
        slug: goal.slug,
        description: goal.description,
        progressPercent: goal.progressPercent,
        progressLabel: goal.progressLabel,
        stakeSol: goal.stakeSol,
        recipientLabel: goal.recipientLabel,
        deadlineTs: goal.deadlineTs,
        deadlineLabel: goal.deadlineLabel,
        goalAddress: goal.publicKey.toBase58(),
        vaultAddress: goal.vault.toBase58(),
      })),
    [ownerGoals],
  );

  const filteredGoals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return dashboardGoals;
    return dashboardGoals.filter((goal) => [goal.title, goal.description, goal.recipientLabel].some((value) => value.toLowerCase().includes(query)));
  }, [dashboardGoals, searchQuery]);

  const visibleGoals = filteredGoals;
  const currentGoal = visibleGoals[0];
  const statsCards = useMemo<StatsCard[]>(() => {
    const total = dashboardGoals.length;
    const pending = dashboardGoals.filter((goal) => goal.status === "Pending").length;
    const completed = dashboardGoals.filter((goal) => goal.status === "Completed").length;
    const failed = dashboardGoals.filter((goal) => goal.status === "Failed").length;
    const totalStake = dashboardGoals.reduce((sum, goal) => sum + goal.stakeSol, 0);
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const activeRecipients = recipients.filter((recipient) => recipient.active && !recipient.archived).length;

    return [
      {
        label: "Goals",
        value: `${total}`,
        meta: connected
          ? total > 0
            ? `${pending} pending · ${completed} completed`
            : "No live goals created yet"
          : "Connect wallet to load live goals",
      },
      { label: "Active", value: `${pending}`, meta: pending > 0 ? "Awaiting verifier or settlement" : "No pending live goals" },
      { label: "Success rate", value: `${successRate}%`, meta: `${completed} success · ${failed} failed` },
      { label: "Staked", value: `${totalStake.toFixed(2)} SOL`, meta: platformReady ? "Tracked on Solana devnet" : "Initialize program first" },
      { label: "Wallet", value: connected && publicKey ? `${publicKey.toBase58().slice(0, 4)}...` : "Offline", meta: connected ? "Connected on devnet" : "Connect to load live goals" },
      { label: "Recipients", value: `${activeRecipients}`, meta: `${recipients.length} total registered` },
    ];
  }, [connected, dashboardGoals, platformReady, publicKey, recipients]);

  const recentActivities = useMemo<ActivityItem[]>(() => {
    if (visibleGoals.length === 0) return [];
    return visibleGoals.slice(0, 4).map((goal) => {
      if (goal.status === "Completed") {
        return {
          id: `${goal.key}-completed`,
          label: `${goal.title} verified complete`,
          detail: "Owner refund path is ready on devnet.",
          accent: "bg-sky-400/15 text-sky-700",
        };
      }
      if (goal.status === "Failed") {
        return {
          id: `${goal.key}-failed`,
          label: `${goal.title} marked failed`,
          detail: `Funds route to ${goal.recipientLabel}.`,
          accent: "bg-rose-400/15 text-rose-700",
        };
      }
      return {
        id: `${goal.key}-pending`,
        label: `${goal.title} is still pending`,
        detail: `Deadline ${goal.deadlineLabel} · ${goal.progressLabel}.`,
        accent: "bg-emerald-400/15 text-emerald-700",
      };
    });
  }, [visibleGoals]);

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    if (visibleGoals.length === 0) return [];

    const events = visibleGoals.flatMap((goal) => {
      const deadlineDate = formatCalendarDate(new Date(goal.deadlineTs * 1000));
      const baseEvent: CalendarEvent = {
        id: `${goal.key}-deadline`,
        title: `${goal.title} deadline`,
        date: deadlineDate,
        time: "18:00",
        goal: goal.title,
        note: `${goal.status} · ${goal.recipientLabel}`,
      };

      if (goal.status === "Completed") {
        const refundDate = formatCalendarDate(new Date((goal.deadlineTs + 24 * 60 * 60) * 1000));
        return [
          baseEvent,
          { id: `${goal.key}-refund`, title: `${goal.title} refund window`, date: refundDate, time: "12:00", goal: goal.title, note: "Claim refund or let it route at claim-window expiry." },
        ];
      }

      if (goal.status === "Failed") {
        return [
          baseEvent,
          { id: `${goal.key}-settle`, title: `${goal.title} settlement`, date: deadlineDate, time: "19:00", goal: goal.title, note: `Route stake to ${goal.recipientLabel}.` },
        ];
      }

      return [baseEvent];
    });

    return events.sort((left, right) => left.date.localeCompare(right.date));
  }, [visibleGoals]);

  const calendarState = useMemo(() => {
    const now = new Date();
    const activeMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const gridStart = new Date(activeMonth);
    gridStart.setDate(1 - activeMonth.getDay());

    const cells = Array.from({ length: 35 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const iso = formatCalendarDate(date);
      return {
        id: iso,
        dayName: weekDayLabels[date.getDay()],
        dayNumber: date.getDate(),
        isCurrentMonth: date.getMonth() === activeMonth.getMonth(),
        isToday: iso === formatCalendarDate(now),
        events: calendarEvents.filter((event) => event.date === iso),
      };
    });

    const currentWeekIndex = cells.findIndex((cell) => cell.isToday);
    const weekStart = currentWeekIndex >= 0 ? Math.floor(currentWeekIndex / 7) * 7 : 0;

    return {
      monthLabel: activeMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      cells,
      weekCells: cells.slice(weekStart, weekStart + 7),
      todayCell: cells.find((cell) => cell.isToday) ?? cells.find((cell) => cell.isCurrentMonth) ?? cells[0],
      agendaEvents: [...calendarEvents].sort((left, right) => `${left.date}${left.time}`.localeCompare(`${right.date}${right.time}`)),
    };
  }, [calendarEvents]);

  const developerInfo = useMemo(
    () => ({
      programId: PROGRAM_ID,
      configPda: config ? "Configured on devnet" : "Not initialized",
      goalPda: currentGoal?.goalAddress ?? "No live goal selected",
      vaultPda: currentGoal?.vaultAddress ?? "No live goal selected",
    }),
    [config, currentGoal],
  );

  const copyText = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(successMessage);
    } catch {
      setFeedback("Clipboard access was blocked.");
    }
  };

  const handleCopyDebug = async () => {
    const payload = JSON.stringify({
      programId: developerInfo.programId,
      config: config ? { admin: config.admin.toBase58(), verifier: config.verifier.toBase58() } : null,
      wallet: publicKey?.toBase58() ?? null,
      currentGoal: currentGoal ? { title: currentGoal.title, status: currentGoal.status, goalPda: currentGoal.goalAddress ?? null, vaultPda: currentGoal.vaultAddress ?? null } : null,
    }, null, 2);
    await copyText(payload, "Copied dashboard debug payload.");
  };

  const handleExportActivity = async () => {
    const payload = recentActivities.map((item) => `${item.label} | ${item.detail}`).join("\n");
    await copyText(payload, "Copied recent activity summary.");
  };

  const renderCalendarContent = () => {
    if (selectedView === "Agenda") {
      return (
        <div className="space-y-2">
          {calendarState.agendaEvents.length === 0 && <p className="text-sm text-slate-500">No upcoming events.</p>}
          {calendarState.agendaEvents.map((event) => (
            <button key={event.id} onClick={() => setModalEvent(event)} className="flex w-full items-center justify-between rounded-none border border-[var(--card-border)] bg-white px-4 py-3 text-left">
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">{event.title}</p>
                <p className="text-xs text-slate-500">{event.goal} · {event.date} · {event.time}</p>
              </div>
              <span className="text-[0.6rem] uppercase tracking-[0.3em] text-[var(--brand)]">Open</span>
            </button>
          ))}
        </div>
      );
    }

    const cells = selectedView === "Week" ? calendarState.weekCells : selectedView === "Day" ? [calendarState.todayCell] : calendarState.cells;
    const gridClass = selectedView === "Day" ? "grid grid-cols-1 gap-2" : "grid grid-cols-7 gap-2";

    return (
      <div className={gridClass}>
        {cells.map((cell) => (
          <div key={cell.id} className={`min-h-[90px] rounded-none border border-[var(--card-border)] p-2 text-[0.65rem] ${cell.isCurrentMonth ? "bg-white text-[var(--ink)]" : "bg-[var(--card)] text-[var(--ink)]/70"}`}>
            <div className="flex items-center justify-between text-[0.55rem] text-[var(--ink)]">
              <span>{cell.dayName}</span>
              <span className="font-semibold">{cell.dayNumber}</span>
            </div>
            <div className="mt-2 space-y-1">
              {cell.events.length === 0 && selectedView === "Day" && <p className="text-xs text-slate-500">No events scheduled.</p>}
              {cell.events.map((event) => (
                <button key={event.id} onClick={() => setModalEvent(event)} className="w-full rounded-none border border-[var(--card-border)] bg-[var(--card)] px-2 py-1 text-left text-[0.65rem] text-[var(--ink)] transition hover:border-[var(--brand)]">
                  <p className="font-semibold">{event.title}</p>
                  <p className="text-[0.55rem] text-slate-500">{event.time}</p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };
  return (
    <div className="h-screen overflow-hidden bg-[var(--surface)] text-[var(--ink)]">
      <div className="grid h-screen grid-cols-[240px_1fr]">
        <aside className="hide-scrollbar flex h-screen flex-col justify-between overflow-y-auto border-r border-[var(--card-border)] bg-white text-[var(--ink)]">
          <div>
            <div className="flex min-h-[93px] flex-col justify-center border-b border-[var(--card-border)] px-5">
              <Link href="/" className="text-[var(--ink)]">
                <BrandLogo className="h-auto w-full max-w-[175px]" />
              </Link>
              <p className="mt-2 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-[var(--ink)]/55">
                Dashboard
              </p>
            </div>
            <div className="px-5 py-6">
              <nav className="space-y-2 text-sm">
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex w-full items-center justify-between rounded-none border border-transparent px-4 py-3 text-left text-xs uppercase tracking-[0.35em] transition hover:border-[var(--brand)] hover:bg-white/80 hover:text-[var(--ink)] ${
                      item.label === "Dashboard" ? "text-[var(--ink)]" : "text-[var(--ink)]/70"
                    }`}
                  >
                    {item.label}
                    <span className="text-[0.55rem] text-[var(--ink)]/60">→</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
          <div className="px-5 py-6 pt-0">
            <WalletSidebarPanel />
          </div>
        </aside>

        <div className="flex h-screen flex-col overflow-hidden">
          <header className="flex items-center justify-between border-b border-[var(--card-border)] bg-[var(--surface)] px-6 py-4">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">Dashboard · Overview</p>
              <h1 className="text-3xl font-semibold">StakeUp Vault Hub</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-none border border-[var(--card-border)] px-4 py-2 text-xs text-slate-500">
                <span className="h-2 w-2 rounded-none bg-[var(--brand)]" />
                {connected ? "Wallet connected" : "Devnet ready"}
              </div>
              <div className="flex items-center gap-3 rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-2">
                <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search live goals" className="w-40 bg-transparent text-xs text-slate-500 outline-none placeholder:text-slate-400" />
                <div className="h-8 w-px bg-slate-300/40" />
                <GoalCreateButton
                  className="rounded-none bg-[var(--brand)] px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[var(--ink)]"
                >
                  Deposit
                </GoalCreateButton>
              </div>
            </div>
          </header>

          <main className="hide-scrollbar flex-1 space-y-6 overflow-y-auto px-6 py-6">
            {(feedback || error) && (
              <section className={`rounded-none border px-4 py-3 text-sm ${error ? "border-rose-300 bg-rose-50 text-rose-700" : "border-[var(--card-border)] bg-white text-slate-600"}`}>
                {error ?? feedback}
              </section>
            )}

            <section className="grid gap-4 md:grid-cols-3">
              {statsCards.map((card) => (
                <article key={card.label} className={`${cardBase} space-y-2`}>
                  <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">{card.label}</p>
                  <p className="text-3xl font-semibold">{card.value}</p>
                  <p className="text-xs text-slate-500">{card.meta}</p>
                </article>
              ))}
            </section>

            <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
              <article className={`${heroCardClass} space-y-5`}>
                {currentGoal ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Current Goal</p>
                        <h2 className="text-2xl font-semibold text-[var(--ink)]">{currentGoal.title}</h2>
                      </div>
                      <span className={`rounded-none px-4 py-1 text-[0.65rem] uppercase tracking-[0.3em] ${badgeClass(currentGoal.status)}`}>{currentGoal.status}</span>
                    </div>
                    <p className="text-sm text-slate-600">{currentGoal.detail}</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[0.6rem] uppercase tracking-[0.3em] text-slate-500">
                        <span>Verified progress</span>
                        <span>{currentGoal.progressLabel}</span>
                      </div>
                      <div className="h-2 rounded-none bg-white/30">
                        <div className="h-2 rounded-none bg-[var(--brand)]" style={{ width: `${currentGoal.progressPercent}%` }} />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-none border border-[var(--card-border)] bg-white px-3 py-3">
                        <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-500">Stake</p>
                        <p className="text-lg font-semibold">{currentGoal.stakeSol.toFixed(2)} SOL</p>
                      </div>
                      <div className="rounded-none border border-[var(--card-border)] bg-white px-3 py-3">
                        <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-500">Route</p>
                        <p className="text-lg font-semibold">{currentGoal.recipientLabel}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 text-xs uppercase tracking-[0.3em]">
                      <Link href="/goals" className="rounded-none border border-[var(--card-border)] px-5 py-2 font-semibold">View</Link>
                      <GoalCreateButton className="rounded-none bg-[var(--brand)] px-5 py-2 font-semibold text-[var(--ink)]">
                        New goal
                      </GoalCreateButton>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Current Goal</p>
                    <h2 className="text-2xl font-semibold text-[var(--ink)]">No goals yet</h2>
                    <p className="text-sm text-slate-600">
                      {searchQuery.trim()
                        ? `No live goals matched "${searchQuery.trim()}".`
                        : connected
                        ? "Create your first live goal on Solana devnet."
                        : "Connect a wallet and create a goal to start funding a live devnet vault."}
                    </p>
                    <GoalCreateButton className="rounded-none bg-[var(--brand)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--ink)]">
                      Create live goal
                    </GoalCreateButton>
                  </div>
                )}
              </article>

              <div className="space-y-6">
                <article className={cardBase}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Your Goals</p>
                      <h3 className="text-xl font-semibold">At a glance</h3>
                    </div>
                    <Link href="/goals" className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[var(--brand)] transition hover:text-[var(--brand-strong)]">View all</Link>
                  </div>
                  <div className="space-y-3">
                    {filteredGoals.slice(0, 3).map((goal) => (
                      <Link key={goal.key} href={`/goals/${goal.slug}`} className="block">
                        <div className="rounded-none border border-[var(--card-border)] bg-white p-3 text-sm text-[var(--ink)]">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold">{goal.title}</p>
                            <span className={`rounded-none px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] ${badgeClass(goal.status)}`}>{goal.status}</span>
                          </div>
                          <p className="mt-1 text-[0.65rem] text-slate-500">{goal.detail}</p>
                        </div>
                      </Link>
                    ))}
                    {filteredGoals.length === 0 && (
                      <p className="text-sm text-slate-500">
                        {searchQuery
                          ? <>No live goals matched <span className="font-semibold">{searchQuery}</span>.</>
                          : connected
                            ? "No live goals yet. Create one to populate the dashboard."
                            : "Connect a wallet to load your live goals."}
                      </p>
                    )}
                  </div>
                </article>

                <article className={cardBase}>
                  <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Developer</p>
                  <h3 className="text-xl font-semibold">Program info</h3>
                  <div className="space-y-2 text-sm text-slate-500">
                    <p><span className="text-[0.55rem] uppercase tracking-[0.3em] text-slate-400">Program ID</span><br />{developerInfo.programId}</p>
                    <p><span className="text-[0.55rem] uppercase tracking-[0.3em] text-slate-400">Config</span><br />{developerInfo.configPda}</p>
                    <p><span className="text-[0.55rem] uppercase tracking-[0.3em] text-slate-400">Goal PDA</span><br />{developerInfo.goalPda}</p>
                    <p><span className="text-[0.55rem] uppercase tracking-[0.3em] text-slate-400">Vault PDA</span><br />{developerInfo.vaultPda}</p>
                  </div>
                  <button onClick={handleCopyDebug} className="w-full rounded-none border border-[var(--card-border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em]">Copy debug info</button>
                </article>
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1fr]">
              <article className={`${cardBase} space-y-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Recent Activity</p>
                    <h3 className="text-xl font-semibold">Timeline</h3>
                  </div>
                  <button onClick={handleExportActivity} className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-slate-500">Export</button>
                </div>
                <div className="space-y-3">
                  {recentActivities.length === 0 && <p className="text-sm text-slate-500">No activity yet.</p>}
                  {recentActivities.map((item) => (
                    <div key={item.id} className={`rounded-none border border-[var(--card-border)] px-4 py-3 ${item.accent}`}>
                      <p className="text-sm font-semibold text-[var(--ink)]">{item.label}</p>
                      <p className="text-xs text-slate-600">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className={`${cardBase} space-y-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Calendar</p>
                    <h3 className="text-xl font-semibold">{calendarState.monthLabel}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                    {["Month", "Week", "Day", "Agenda"].map((view) => (
                      <button
                        key={view}
                        onClick={() => setSelectedView(view as "Month" | "Week" | "Day" | "Agenda")}
                        className={`rounded-none px-3 py-1 ${selectedView === view ? "bg-[var(--brand)] text-[var(--ink)]" : "border border-[var(--card-border)] hover:bg-[var(--card)]"}`}
                      >
                        {view}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedView !== "Agenda" && (
                  <div className="grid grid-cols-7 gap-2 text-[0.65rem] uppercase tracking-[0.3em] text-[var(--ink)]">
                    {weekDayLabels.map((day) => (
                      <div key={day} className="text-center">{day}</div>
                    ))}
                  </div>
                )}

                {renderCalendarContent()}
              </article>
            </div>
          </main>
        </div>
      </div>

      {modalEvent && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[var(--panel-alt)]/70 px-4 py-6">
          <div className="w-full max-w-xl rounded-none border border-[var(--card-border)] bg-white p-6 shadow-[0_30px_70px_rgba(0,0,0,0.25)] text-[var(--ink)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[0.6rem] uppercase tracking-[0.4em] text-slate-400">Pin goal event</p>
                <h3 className="text-2xl font-semibold">{modalEvent.title}</h3>
              </div>
              <button onClick={() => setModalEvent(null)} className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Close</button>
            </div>
            <p className="mt-2 text-sm text-slate-600">{modalEvent.note}</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-1 rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-3 text-[var(--ink)]">
                <p className="text-[0.6rem] uppercase tracking-[0.4em] text-slate-500">Goal</p>
                <p className="text-sm font-semibold">{modalEvent.goal}</p>
                <p className="text-[0.75rem] text-slate-500">{modalEvent.date} · {modalEvent.time}</p>
              </div>
              <div className="space-y-1 rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-3 text-[var(--ink)]">
                <p className="text-[0.6rem] uppercase tracking-[0.4em] text-slate-500">Pinned</p>
                <p className="text-sm font-semibold text-[var(--brand)]">{pinned === modalEvent.title ? "Already pinned" : "Not pinned yet"}</p>
                <button onClick={() => setPinned(modalEvent.title)} className="w-full rounded-none bg-[var(--brand)] px-3 py-2 text-center text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[var(--ink)]">Pin goal event</button>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-[0.65rem] uppercase tracking-[0.3em] text-[var(--ink)]">
              <a
                href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(modalEvent.title)}&dates=${modalEvent.date.replace(/-/g, "")}T${modalEvent.time.replace(":", "")}00/${modalEvent.date.replace(/-/g, "")}T${modalEvent.time.replace(":", "")}30`}
                target="_blank"
                rel="noreferrer"
                className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-[var(--ink)] transition hover:border-[var(--brand)]"
              >
                Add to Google Calendar
              </a>
              <span className="text-[0.65rem] text-slate-500">Or press Esc to close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
