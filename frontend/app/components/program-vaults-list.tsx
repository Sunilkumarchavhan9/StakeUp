"use client";

import { useMemo } from "react";

import { useStakeupProgram } from "../lib/use-stakeup-program";
import GoalProgramActions from "./goal-program-actions";

const countdownString = (deadlineTs: number) => {
  const diff = deadlineTs * 1000 - Date.now();
  if (diff <= 0) {
    return "Unlocked";
  }

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return `${days}d ${hours}h ${minutes}m`;
};

const healthScore = (goal: {
  statusCode: number;
  settled: boolean;
  deadlinePassed: boolean;
  stakeSol: number;
}) => {
  if (goal.settled) {
    return 100;
  }
  if (goal.statusCode === 2) {
    return 42;
  }
  if (goal.statusCode === 1) {
    return 88;
  }
  if (goal.deadlinePassed) {
    return 58;
  }
  if (goal.stakeSol >= 1) {
    return 76;
  }
  return 84;
};

const healthLabel = (score: number) => {
  if (score >= 75) {
    return { label: "Safe", className: "text-emerald-600" };
  }
  if (score >= 50) {
    return { label: "Pending verifier risk", className: "text-amber-600" };
  }
  return { label: "Release blocked", className: "text-rose-600" };
};

export default function ProgramVaultsList() {
  const { connected, error, goals, loading } = useStakeupProgram();

  const displayGoals = useMemo(() => goals, [goals]);

  if (!connected) {
    return (
      <p className="text-sm text-slate-500">
        Connect a wallet to inspect live vault PDAs and settlement actions.
      </p>
    );
  }

  if (loading && displayGoals.length === 0) {
    return <p className="text-sm text-slate-500">Loading on-chain vaults...</p>;
  }

  if (error && displayGoals.length === 0) {
    return <p className="text-sm text-rose-600">{error}</p>;
  }

  if (displayGoals.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No vault PDAs found yet. Create a goal first to fund a vault.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {displayGoals.map((goal) => {
        const health = healthScore(goal);
        const tone = healthLabel(health);

        return (
          <div
            key={goal.publicKey.toBase58()}
            className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{goal.title}</p>
                <p className="text-xs text-slate-500">
                  Vault {goal.vault.toBase58().slice(0, 4)}...
                  {goal.vault.toBase58().slice(-4)} · Owner{" "}
                  {goal.owner.toBase58().slice(0, 4)}...
                  {goal.owner.toBase58().slice(-4)}
                </p>
              </div>
              <span
                className={`text-xs font-semibold uppercase tracking-[0.3em] ${
                  goal.status === "Pending"
                    ? "text-amber-600"
                    : goal.status === "Completed"
                      ? "text-emerald-600"
                      : "text-rose-600"
                }`}
              >
                {goal.settled ? "Settled" : goal.status}
              </span>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-none border border-[var(--card-border)] bg-white px-3 py-2 text-xs">
                <p className="uppercase tracking-[0.3em] text-slate-500">
                  Vault health
                </p>
                <p className="text-lg font-semibold">{health}%</p>
                <p className={`font-semibold ${tone.className}`}>{tone.label}</p>
              </div>
              <div className="rounded-none border border-[var(--card-border)] bg-white px-3 py-2 text-xs">
                <p className="uppercase tracking-[0.3em] text-slate-500">
                  Release countdown
                </p>
                <p className="text-lg font-semibold">
                  {countdownString(goal.deadlineTs)}
                </p>
                <p className="text-slate-500">Unlock date: {goal.deadlineLabel}</p>
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-none border border-[var(--card-border)] bg-white px-3 py-2 text-xs">
                <p className="uppercase tracking-[0.3em] text-slate-500">
                  Conditional release logic
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-slate-600">
                  <li>Completed: refund to owner</li>
                  <li>Failed: route to recipient</li>
                  <li>Pending after expiry: fail-safe settlement</li>
                </ul>
              </div>
              <div className="rounded-none border border-[var(--card-border)] bg-emerald-50 px-3 py-2 text-xs">
                <p className="uppercase tracking-[0.3em] text-emerald-700">
                  Vault balance
                </p>
                <p className="mt-1 text-emerald-800">
                  {goal.vaultBalanceSol.toFixed(3)} SOL
                </p>
                <p className="text-emerald-800">
                  Recipient {goal.recipientWallet.toBase58().slice(0, 4)}...
                  {goal.recipientWallet.toBase58().slice(-4)}
                </p>
              </div>
            </div>

            <div className="mt-3">
              <GoalProgramActions goal={goal} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
