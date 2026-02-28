"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";

import { type GoalListItem } from "../data/goals";
import { useStakeupProgram } from "../lib/use-stakeup-program";

type GoalCreateButtonProps = {
  children: ReactNode;
  className: string;
  template?: GoalListItem;
};

export default function GoalCreateButton({
  children,
  className,
  template,
}: GoalCreateButtonProps) {
  const { connected, createGoal, platformReady, recipients } = useStakeupProgram();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [title, setTitle] = useState(template?.title ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [targetLabel, setTargetLabel] = useState(template?.targetLabel ?? "km");
  const [targetTotal, setTargetTotal] = useState(template?.targetTotal ?? 100);
  const [durationDays, setDurationDays] = useState(template?.durationDays ?? 7);
  const [stakeSol, setStakeSol] = useState(
    template ? Number.parseFloat(template.stake) : 0.5,
  );
  const [recipientWallet, setRecipientWallet] = useState("");

  const activeRecipients = useMemo(
    () => recipients.filter((recipient) => recipient.active && !recipient.archived),
    [recipients],
  );

  const canSubmit = connected && platformReady && activeRecipients.length > 0;

  const defaultRecipient = useMemo(
    () => activeRecipients[0]?.walletBase58 ?? "",
    [activeRecipients],
  );

  const handleToggle = () => {
    setOpen((current) => !current);
    setMessage(null);

    if (!recipientWallet && defaultRecipient) {
      setRecipientWallet(defaultRecipient);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setMessage(null);

    try {
      await createGoal({
        title,
        slug: template?.slug,
        description,
        targetLabel,
        targetTotal,
        durationDays,
        stakeSol,
        recipientWallet: recipientWallet || defaultRecipient,
      });
      setMessage("Goal created on-chain");
      setOpen(false);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to create goal",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleToggle}
        className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {children}
      </button>

      {open && (
        <div className="space-y-3 rounded-none border border-[var(--card-border)] bg-white p-4 text-left">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-none border border-[var(--card-border)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--ink)]"
              />
            </label>
            <label className="space-y-1 text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
              Stake (SOL)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={stakeSol}
                onChange={(event) => setStakeSol(Number(event.target.value))}
                className="w-full rounded-none border border-[var(--card-border)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--ink)]"
              />
            </label>
            <label className="space-y-1 text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
              Target total
              <input
                type="number"
                min="1"
                value={targetTotal}
                onChange={(event) => setTargetTotal(Number(event.target.value))}
                className="w-full rounded-none border border-[var(--card-border)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--ink)]"
              />
            </label>
            <label className="space-y-1 text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
              Target label
              <input
                value={targetLabel}
                onChange={(event) => setTargetLabel(event.target.value)}
                className="w-full rounded-none border border-[var(--card-border)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--ink)]"
              />
            </label>
            <label className="space-y-1 text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
              Duration (days)
              <input
                type="number"
                min="1"
                value={durationDays}
                onChange={(event) => setDurationDays(Number(event.target.value))}
                className="w-full rounded-none border border-[var(--card-border)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--ink)]"
              />
            </label>
            <label className="space-y-1 text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
              Charity / franchise
              <select
                value={recipientWallet || defaultRecipient}
                onChange={(event) => setRecipientWallet(event.target.value)}
                className="w-full rounded-none border border-[var(--card-border)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--ink)]"
              >
                {activeRecipients.map((recipient) => (
                  <option key={recipient.walletBase58} value={recipient.walletBase58}>
                    {recipient.label} · {recipient.kindLabel}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-1 text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full rounded-none border border-[var(--card-border)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--ink)]"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="rounded-none bg-[var(--brand)] px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Create on-chain goal"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-none border border-[var(--card-border)] px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em]"
            >
              Close
            </button>
          </div>

          {!platformReady && (
            <p className="text-[0.6rem] text-[var(--ink)]/60">
              Initialize the program first in <Link href="/verifiers" className="underline">Admin</Link>.
            </p>
          )}
          {platformReady && activeRecipients.length === 0 && (
            <p className="text-[0.6rem] text-[var(--ink)]/60">
              Register at least one charity or franchise in{" "}
              <Link href="/verifiers" className="underline">
                Admin
              </Link>
              .
            </p>
          )}
        </div>
      )}

      {message && <p className="text-[0.6rem] text-[var(--ink)]/60">{message}</p>}
    </div>
  );
}
