"use client";

import Link from "next/link";

import { useStakeupProgram } from "../lib/use-stakeup-program";
import GoalCreateButton from "./goal-create-button";
import GoalProgramActions from "./goal-program-actions";

const badgeClass = (status: string) => {
  if (status === "Completed") {
    return "bg-sky-500/20 text-sky-600";
  }
  if (status === "Failed") {
    return "bg-rose-500/20 text-rose-600";
  }
  return "bg-emerald-500/20 text-emerald-600";
};

export default function ProgramGoalsList() {
  const { connected, error, loading, ownerGoals } = useStakeupProgram();

  if (!connected) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Connect a wallet to load your live on-chain goals.
        </p>
      </div>
    );
  }

  if (loading && ownerGoals.length === 0) {
    return <p className="text-sm text-slate-500">Loading on-chain goals...</p>;
  }

  if (error && ownerGoals.length === 0) {
    return <p className="text-sm text-rose-600">{error}</p>;
  }

  if (ownerGoals.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          No on-chain goals found for this wallet yet. Create one now to start tracking it live.
        </p>
        <GoalCreateButton
          className="rounded-none bg-[var(--brand)] px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[var(--ink)]"
        >
          Create live goal
        </GoalCreateButton>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--card-border)] text-left text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
              <th className="px-3 py-3 font-semibold">Goal</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 font-semibold">Progress</th>
              <th className="px-3 py-3 font-semibold">Stake</th>
              <th className="px-3 py-3 font-semibold">Deadline</th>
              <th className="px-3 py-3 font-semibold">Route</th>
              <th className="px-3 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {ownerGoals.map((goal) => (
              <tr
                key={goal.publicKey.toBase58()}
                className="border-b border-[var(--card-border)] align-top transition hover:bg-white"
              >
                <td className="px-3 py-4">
                  <Link
                    href={`/goals/${goal.slug}`}
                    className="block"
                  >
                    <p className="font-semibold text-[var(--ink)]">{goal.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{goal.description}</p>
                  </Link>
                </td>
                <td className="px-3 py-4">
                  <span
                    className={`inline-flex rounded-none px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] ${badgeClass(goal.status)}`}
                  >
                    {goal.status}
                  </span>
                </td>
                <td className="px-3 py-4">
                  <p className="text-sm font-semibold">{goal.progressLabel}</p>
                  <div className="mt-2 h-2 w-40 max-w-full rounded-none bg-slate-200">
                    <div
                      className="h-2 rounded-none bg-[var(--brand)]"
                      style={{ width: `${goal.progressPercent}%` }}
                    />
                  </div>
                </td>
                <td className="px-3 py-4 text-sm font-semibold">
                  {goal.stakeSol.toFixed(2)} SOL
                </td>
                <td className="px-3 py-4 text-sm">{goal.deadlineLabel}</td>
                <td className="px-3 py-4 text-sm">{goal.recipientLabel}</td>
                <td className="px-3 py-4">
                  <div className="space-y-3">
                    <GoalProgramActions goal={goal} />
                    <Link
                      href={`/goals/${goal.slug}`}
                      className="inline-flex rounded-none border border-[var(--card-border)] px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em]"
                    >
                      Open
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:hidden">
        {ownerGoals.map((goal) => (
          <article
            key={goal.publicKey.toBase58()}
            className="space-y-4 rounded-none border border-[var(--card-border)] bg-white px-5 py-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold">{goal.title}</p>
                <p className="mt-2 text-sm text-slate-500">{goal.detail}</p>
              </div>
              <span
                className={`rounded-none px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] ${badgeClass(goal.status)}`}
              >
                {goal.status}
              </span>
            </div>

            <p className="text-sm text-slate-600">{goal.description}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-3 py-2">
                <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-500">
                  Vault balance
                </p>
                <p className="text-lg font-semibold">{goal.vaultBalanceSol.toFixed(3)} SOL</p>
              </div>
              <div className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-3 py-2">
                <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-500">
                  Deadline
                </p>
                <p className="text-lg font-semibold">{goal.deadlineLabel}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[0.6rem] uppercase tracking-[0.3em] text-slate-500">
                <span>Progress</span>
                <span>{goal.progressLabel}</span>
              </div>
              <div className="h-2 rounded-none bg-slate-200">
                <div
                  className="h-2 rounded-none bg-[var(--brand)]"
                  style={{ width: `${goal.progressPercent}%` }}
                />
              </div>
            </div>

            <GoalProgramActions goal={goal} />

            <Link
              href={`/goals/${goal.slug}`}
              className="inline-flex rounded-none border border-[var(--card-border)] px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em]"
            >
              View details
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
