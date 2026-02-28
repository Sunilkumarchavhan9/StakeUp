"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import SidebarBrand from "../../components/sidebar-brand";
import WalletSidebarPanel from "../../components/wallet-sidebar-panel";
import { useStakeupProgram } from "../../lib/use-stakeup-program";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Goals", href: "/goals" },
  { label: "Vaults", href: "/vaults" },
  { label: "Charities", href: "/charities" },
  { label: "Verifiers", href: "/verifiers" },
  { label: "Docs", href: "/docs" },
];

type SyncResponse = {
  signature: string;
  proofHashHex: string;
  verifier: string;
  mode: string;
};

export default function VerifierSyncPage() {
  const { connected, goals, isVerifier, loading } = useStakeupProgram();
  const [goalAddress, setGoalAddress] = useState("");
  const [progressAmount, setProgressAmount] = useState("1");
  const [proofUri, setProofUri] = useState("https://example.com/activity/demo");
  const [sourceType, setSourceType] = useState<"device_app" | "wearable" | "official_api">(
    "device_app",
  );
  const [activityId, setActivityId] = useState("");
  const [syncToken, setSyncToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<SyncResponse | null>(null);

  const selectableGoals = useMemo(
    () =>
      goals.filter((goal) => !goal.settled).sort((left, right) => right.goalId - left.goalId),
    [goals],
  );

  const resolvedGoalAddress = goalAddress || selectableGoals[0]?.publicKey.toBase58() || "";

  const handleSubmit = async () => {
    const parsedProgress = Number(progressAmount);

    if (!resolvedGoalAddress) {
      setMessage("Select a live goal first.");
      return;
    }
    if (!Number.isFinite(parsedProgress) || parsedProgress <= 0) {
      setMessage("Enter a valid progress amount.");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setResult(null);

    try {
      const response = await fetch("/api/verified-progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(syncToken ? { "x-stakeup-sync-token": syncToken } : {}),
        },
        body: JSON.stringify({
          activityId: activityId || undefined,
          goalAddress: resolvedGoalAddress,
          progressAmount: Math.floor(parsedProgress),
          proofUri,
          sourceType,
        }),
      });

      const payload = (await response.json()) as Partial<SyncResponse> & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Verified sync failed");
      }

      setResult(payload as SyncResponse);
      setMessage("Backend verifier sync submitted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Verified sync failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-[var(--surface)] text-[var(--ink)]">
      <div className="grid h-screen grid-cols-[240px_1fr]">
        <aside className="hide-scrollbar flex h-screen flex-col justify-between overflow-y-auto border-r border-[var(--card-border)] bg-white px-5 py-6 text-[var(--ink)]">
          <div>
            <SidebarBrand sectionLabel="Verifier Sync" />
            <nav className="mt-6 space-y-2 text-sm">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex w-full items-center justify-between rounded-none border border-transparent px-4 py-3 text-left text-xs uppercase tracking-[0.35em] transition hover:border-[var(--brand)] hover:bg-white/80 hover:text-[var(--ink)] text-[var(--ink)]/70"
                >
                  {item.label}
                  <span className="text-[0.55rem] text-[var(--ink)]/60">→</span>
                </Link>
              ))}
            </nav>
          </div>
          <WalletSidebarPanel />
        </aside>

        <main className="hide-scrollbar h-screen overflow-y-auto mx-auto w-full max-w-5xl space-y-6 px-4 py-10">
          <header className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-6 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">Verifiers</p>
                <h1 className="text-4xl font-semibold">Verified Progress Sync</h1>
                <p className="mt-2 text-base text-slate-600">
                  Simulate a device or provider webhook and submit backend-signed verified progress.
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/verifiers"
                  className="rounded-none border border-[var(--card-border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em]"
                >
                  Back to admin
                </Link>
                <Link
                  href="/verifiers/providers"
                  className="rounded-none border border-[var(--card-border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em]"
                >
                  Provider hub
                </Link>
              </div>
            </div>
          </header>

          {message && (
            <section className="rounded-none border border-[var(--card-border)] bg-white px-6 py-4 text-sm text-slate-600">
              {message}
            </section>
          )}

          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="space-y-4 rounded-none border border-[var(--card-border)] bg-white px-6 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Sync payload</p>

              {!connected && (
                <p className="text-sm text-slate-500">Connect a wallet to inspect live goals.</p>
              )}

              {connected && !isVerifier && (
                <p className="text-sm text-amber-700">
                  The connected wallet is not the on-chain verifier. You can still test the API, but the backend verifier key must match the configured verifier.
                </p>
              )}

              <label className="block text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                Goal
                <select
                  value={resolvedGoalAddress}
                  onChange={(event) => setGoalAddress(event.target.value)}
                  className="mt-1 w-full rounded-none border border-[var(--card-border)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--ink)]"
                >
                  {selectableGoals.map((goal) => (
                    <option key={goal.publicKey.toBase58()} value={goal.publicKey.toBase58()}>
                      {goal.title} · {goal.progressLabel}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                  Progress amount
                  <input
                    type="number"
                    min="1"
                    value={progressAmount}
                    onChange={(event) => setProgressAmount(event.target.value)}
                    className="mt-1 w-full rounded-none border border-[var(--card-border)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--ink)]"
                  />
                </label>
                <label className="block text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                  Source type
                  <select
                    value={sourceType}
                    onChange={(event) =>
                      setSourceType(event.target.value as "device_app" | "wearable" | "official_api")
                    }
                    className="mt-1 w-full rounded-none border border-[var(--card-border)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--ink)]"
                  >
                    <option value="device_app">device_app</option>
                    <option value="wearable">wearable</option>
                    <option value="official_api">official_api</option>
                  </select>
                </label>
              </div>

              <label className="block text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                Proof URI
                <input
                  value={proofUri}
                  onChange={(event) => setProofUri(event.target.value)}
                  className="mt-1 w-full rounded-none border border-[var(--card-border)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--ink)]"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                  Activity ID (optional)
                  <input
                    value={activityId}
                    onChange={(event) => setActivityId(event.target.value)}
                    className="mt-1 w-full rounded-none border border-[var(--card-border)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--ink)]"
                  />
                </label>
                <label className="block text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                  Sync token (optional)
                  <input
                    value={syncToken}
                    onChange={(event) => setSyncToken(event.target.value)}
                    className="mt-1 w-full rounded-none border border-[var(--card-border)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--ink)]"
                  />
                </label>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || loading || selectableGoals.length === 0}
                className="rounded-none bg-[var(--brand)] px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit verified sync"}
              </button>
            </article>

            <article className="space-y-4 rounded-none border border-[var(--card-border)] bg-white px-6 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Latest response</p>
              {result ? (
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-3">
                    <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-500">Signature</p>
                    <p className="break-all">{result.signature}</p>
                  </div>
                  <div className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-3">
                    <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-500">Proof hash</p>
                    <p className="break-all">{result.proofHashHex}</p>
                  </div>
                  <div className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-3">
                    <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-500">Verifier</p>
                    <p className="break-all">{result.verifier}</p>
                  </div>
                  <div className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-3">
                    <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-500">Mode</p>
                    <p>{result.mode}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Submit a payload to inspect the backend verifier response.
                </p>
              )}
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}
