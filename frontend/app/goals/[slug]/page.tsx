import Link from "next/link";
import { notFound } from "next/navigation";

import GoalDetailLivePanel from "../../components/goal-detail-live-panel";
import { listOnchainGoalMetadata } from "../../lib/server/onchain-read";

export const dynamic = "force-dynamic";

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const goal = (await listOnchainGoalMetadata()).find(
    (record) => record.slug === slug,
  );

  if (!goal) {
    notFound();
  }

  const stakeLabel = `${goal.stakeSol.toFixed(2)} SOL`;
  const summaryDetail = `${goal.durationDays} day target window · on-chain metadata`;
  const estimatedDeadline = new Date(goal.deadlineTs * 1000);
  const shortRecipient = `${goal.recipientWallet.slice(0, 6)}...${goal.recipientWallet.slice(-6)}`;

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
        <div className="flex items-center justify-between rounded-none border border-[var(--card-border)] bg-[var(--card)] px-6 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">Goal tracking</p>
            <h1 className="text-3xl font-semibold">{goal.title}</h1>
          </div>
          <Link
            href="/dashboard"
            className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--brand)]"
          >
            ← Back
          </Link>
        </div>

        <section className="space-y-4 rounded-none border border-[var(--card-border)] bg-white px-6 py-6 shadow-[0_20px_50px_rgba(15,23,42,0.1)]">
          <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-500">Live metadata</p>
          <p className="text-lg text-slate-600">{summaryDetail}</p>
          <p className="text-sm text-slate-500">{goal.description}</p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-3 text-sm">
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">Stake</p>
              <p className="text-lg font-semibold">{stakeLabel}</p>
              <p className="text-xs text-slate-500">Locked in the vault PDA on devnet.</p>
            </div>
            <div className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-3 text-sm">
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">Estimated deadline</p>
              <p className="text-lg font-semibold">
                {estimatedDeadline.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="text-xs text-slate-500">Exact live status is resolved in the panel below.</p>
            </div>
            <div className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-3 text-sm">
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">Slug</p>
              <p className="text-lg font-semibold">{goal.slug}</p>
              <p className="text-xs text-slate-500">Resolved directly from the on-chain metadata PDA.</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-[0.8fr_0.8fr_1.4fr]">
          <div className="rounded-none border border-[var(--card-border)] bg-white px-5 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">Target</p>
            <p className="mt-2 text-xl font-semibold">{goal.targetTotal} {goal.targetLabel}</p>
            <p className="mt-2 text-xs text-slate-500">Stored in the Goal and GoalMetadata PDAs on devnet.</p>
          </div>

          <div className="rounded-none border border-[var(--card-border)] bg-white px-5 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">Duration</p>
            <p className="mt-2 text-xl font-semibold">{goal.durationDays} days</p>
            <p className="mt-2 text-xs text-slate-500">Used to derive the deadline passed to the on-chain program.</p>
          </div>

          <div className="rounded-none border border-[var(--card-border)] bg-white px-5 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">Payout route</p>
                <p className="mt-2 text-xl font-semibold">{shortRecipient}</p>
              </div>
              <a
                href={`https://solscan.io/account/${goal.recipientWallet}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-[var(--brand)]"
              >
                Solscan
              </a>
            </div>
            <div className="mt-3 rounded-none border border-[var(--card-border)] bg-[var(--card)] px-3 py-2">
              <p className="font-mono text-xs break-all text-slate-600">{goal.recipientWallet}</p>
            </div>
            <p className="mt-2 text-xs text-slate-500">This wallet receives funds if the goal fails or the refund window expires.</p>
          </div>
        </section>

        <GoalDetailLivePanel
          title={goal.title}
          slug={goal.slug}
          description={goal.description}
          targetLabel={goal.targetLabel}
          targetTotal={goal.targetTotal}
          durationDays={goal.durationDays}
          stake={stakeLabel}
        />
      </div>
    </div>
  );
}
