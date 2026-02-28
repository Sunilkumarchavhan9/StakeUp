"use client";

import { useStakeupProgram } from "../lib/use-stakeup-program";
import GoalCreateButton from "./goal-create-button";
import GoalProgramActions from "./goal-program-actions";

type GoalDetailLivePanelProps = {
  title: string;
  slug: string;
  description: string;
  targetLabel: string;
  targetTotal: number;
  durationDays: number;
  stake: string;
};

export default function GoalDetailLivePanel({
  description,
  durationDays,
  slug,
  stake,
  targetLabel,
  targetTotal,
  title,
}: GoalDetailLivePanelProps) {
  const { connected, goals, loading } = useStakeupProgram();

  const matchingGoal = goals.find((goal) => goal.slug === slug);

  return (
    <section className="space-y-4 rounded-none border border-[var(--card-border)] bg-white px-6 py-6 shadow-[0_20px_50px_rgba(15,23,42,0.1)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-500">
            On-chain vault controls
          </p>
          <p className="text-sm text-slate-500">
            Create this goal on devnet, then verify or settle it from the same page.
          </p>
        </div>
        {!matchingGoal && (
          <GoalCreateButton
            template={{
              templateId: 0,
              title,
              detail: `Stake ${stake} · Duration ${durationDays} days`,
              status: "Pending",
              slug,
              stake,
              deadline: "",
              description,
              targetLabel,
              targetTotal,
              currentValue: 0,
              elapsedDays: 0,
              durationDays,
              missedDays: 0,
              charityName: "",
              watchers: 0,
              streakPattern: [],
              verifierEvents: [],
            }}
            className="rounded-none bg-[var(--brand)] px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[var(--ink)]"
          >
            Deposit on-chain
          </GoalCreateButton>
        )}
      </div>

      {!connected && (
        <p className="text-sm text-slate-500">
          Connect a wallet to load the live goal record.
        </p>
      )}

      {connected && loading && !matchingGoal && (
        <p className="text-sm text-slate-500">Loading on-chain state...</p>
      )}

      {connected && matchingGoal && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-3">
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-500">Status</p>
              <p className="text-lg font-semibold">{matchingGoal.status}</p>
            </div>
            <div className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-3">
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-500">Vault balance</p>
              <p className="text-lg font-semibold">
                {matchingGoal.vaultBalanceSol.toFixed(3)} SOL
              </p>
            </div>
            <div className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-3">
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-500">Deadline</p>
              <p className="text-lg font-semibold">{matchingGoal.deadlineLabel}</p>
            </div>
            <div className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-3">
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-500">Progress</p>
              <p className="text-lg font-semibold">{matchingGoal.progressLabel}</p>
            </div>
          </div>
          <div className="h-2 rounded-none bg-slate-200">
            <div
              className="h-2 rounded-none bg-[var(--brand)]"
              style={{ width: `${matchingGoal.progressPercent}%` }}
            />
          </div>
          <GoalProgramActions goal={matchingGoal} />
        </div>
      )}
    </section>
  );
}
