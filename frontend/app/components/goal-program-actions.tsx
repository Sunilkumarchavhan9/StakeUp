"use client";

import { useMemo, useState } from "react";

import { type LiveGoal, useStakeupProgram } from "../lib/use-stakeup-program";

type GoalProgramActionsProps = {
  goal: LiveGoal;
};

export default function GoalProgramActions({ goal }: GoalProgramActionsProps) {
  const { connected, isVerifier, publicKey, settleGoal, submitProgress, verifyGoal } =
    useStakeupProgram();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [progressAmount, setProgressAmount] = useState("1");

  const isOwner = useMemo(
    () => Boolean(publicKey && goal.owner.equals(publicKey)),
    [goal.owner, publicKey],
  );

  const canVerify = isVerifier && goal.statusCode === 0 && goal.deadlinePassed;
  const canSubmitProgress =
    isOwner &&
    goal.statusCode === 0 &&
    !goal.settled &&
    !goal.deadlinePassed &&
    goal.currentProgress < goal.targetTotalOnchain;
  const canSettle =
    !goal.settled &&
    ((goal.statusCode === 1 && isOwner) ||
      goal.statusCode === 2 ||
      (goal.statusCode === 0 && goal.settleableNow));

  const handleVerify = async (completed: boolean) => {
    setPendingAction(completed ? "complete" : "fail");
    setMessage(null);

    try {
      await verifyGoal(goal, completed);
      setMessage(completed ? "Goal marked complete" : "Goal marked failed");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to verify goal",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleSubmitProgress = async () => {
    const nextAmount = Number(progressAmount);

    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      setMessage("Enter a progress amount greater than zero.");
      return;
    }

    setPendingAction("progress");
    setMessage(null);

    try {
      await submitProgress(goal, Math.floor(nextAmount));
      setMessage("Progress submitted on-chain");
      setProgressAmount("1");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to submit progress",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleSettle = async () => {
    setPendingAction("settle");
    setMessage(null);

    try {
      await settleGoal(goal);
      setMessage(goal.statusCode === 1 ? "Refund claimed" : "Settlement sent");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to settle goal",
      );
    } finally {
      setPendingAction(null);
    }
  };

  if (!connected) {
    return (
      <p className="text-[0.6rem] text-[var(--ink)]/60">
        Connect a wallet to verify or settle this goal.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-3 py-3">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex-1 text-[0.6rem] uppercase tracking-[0.3em] text-slate-500">
            Submit progress
            <input
              type="number"
              min="1"
              step="1"
              value={progressAmount}
              onChange={(event) => setProgressAmount(event.target.value)}
              className="mt-1 w-full rounded-none border border-[var(--card-border)] bg-white px-3 py-2 text-sm normal-case tracking-normal text-[var(--ink)]"
            />
          </label>
          <button
            onClick={handleSubmitProgress}
            disabled={!canSubmitProgress || Boolean(pendingAction)}
            className="rounded-none border border-[var(--card-border)] bg-white px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendingAction === "progress" ? "Submitting..." : "Check in"}
          </button>
        </div>
        <p className="mt-2 text-[0.6rem] text-[var(--ink)]/60">
          {goal.currentProgress}/{goal.targetTotalOnchain} {goal.targetLabel} logged · {goal.checkInCount} check-ins
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleVerify(true)}
          disabled={!canVerify || Boolean(pendingAction)}
          className="rounded-none border border-emerald-200 bg-emerald-50 px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendingAction === "complete" ? "Updating..." : "Verify complete"}
        </button>
        <button
          onClick={() => handleVerify(false)}
          disabled={!canVerify || Boolean(pendingAction)}
          className="rounded-none border border-rose-200 bg-rose-50 px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendingAction === "fail" ? "Updating..." : "Verify failed"}
        </button>
        <button
          onClick={handleSettle}
          disabled={!canSettle || Boolean(pendingAction)}
          className="rounded-none bg-[var(--brand)] px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendingAction === "settle"
            ? "Submitting..."
            : goal.statusCode === 1
              ? "Claim refund"
              : "Settle vault"}
        </button>
      </div>
      {message && <p className="text-[0.6rem] text-[var(--ink)]/60">{message}</p>}
      {!goal.deadlinePassed && goal.statusCode === 0 && (
        <p className="text-[0.6rem] text-[var(--ink)]/60">
          Verification unlocks after the goal deadline. Goal completion also requires at least one backend-verified sync.
        </p>
      )}
      {goal.verifiedProgress > 0 && (
        <p className="text-[0.6rem] text-[var(--ink)]/60">
          Verified progress: {goal.verifiedProgress}/{goal.targetTotalOnchain} {goal.targetLabel}.
        </p>
      )}
      {goal.statusCode === 1 && !isOwner && !goal.settled && (
        <p className="text-[0.6rem] text-[var(--ink)]/60">
          Only the goal owner can claim the refund while the claim window is open.
        </p>
      )}
    </div>
  );
}
