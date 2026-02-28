"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

export default function VerifiersPage() {
  const {
    archiveRecipient,
    config,
    connected,
    error,
    initializePlatform,
    isAdmin,
    platformReady,
    publicKey,
    recipients,
    registerRecipient,
    setRecipientActive,
    updateVerifier,
  } = useStakeupProgram();

  const [verifierAddress, setVerifierAddress] = useState(
    publicKey?.toBase58() ?? "",
  );
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientLabel, setRecipientLabel] = useState("");
  const [recipientKind, setRecipientKind] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<
    "init" | "recipient" | "verifier" | string | null
  >(null);

  useEffect(() => {
    if (!verifierAddress && publicKey) {
      setVerifierAddress(publicKey.toBase58());
    }
  }, [publicKey, verifierAddress]);

  const handleInitialize = async () => {
    setSubmitting("init");
    setMessage(null);

    try {
      await initializePlatform(verifierAddress);
      setMessage("Platform initialized");
    } catch (nextError) {
      setMessage(
        nextError instanceof Error ? nextError.message : "Unable to initialize platform",
      );
    } finally {
      setSubmitting(null);
    }
  };

  const handleRegisterRecipient = async () => {
    setSubmitting("recipient");
    setMessage(null);

    try {
      await registerRecipient({
        walletAddress: recipientAddress,
        label: recipientLabel,
        kind: recipientKind,
      });
      setRecipientAddress("");
      setRecipientLabel("");
      setMessage("Recipient registered");
    } catch (nextError) {
      setMessage(
        nextError instanceof Error ? nextError.message : "Unable to register recipient",
      );
    } finally {
      setSubmitting(null);
    }
  };

  const handleRotateVerifier = async () => {
    setSubmitting("verifier");
    setMessage(null);

    try {
      await updateVerifier(verifierAddress);
      setMessage("Verifier updated");
    } catch (nextError) {
      setMessage(
        nextError instanceof Error ? nextError.message : "Unable to update verifier",
      );
    } finally {
      setSubmitting(null);
    }
  };

  const handleToggleRecipient = async (walletAddress: string, active: boolean) => {
    const actionKey = `recipient:${walletAddress}`;
    setSubmitting(actionKey);
    setMessage(null);

    try {
      await setRecipientActive(walletAddress, active);
      setMessage(active ? "Recipient activated" : "Recipient deactivated");
    } catch (nextError) {
      setMessage(
        nextError instanceof Error ? nextError.message : "Unable to update recipient",
      );
    } finally {
      setSubmitting(null);
    }
  };

  const handleArchiveRecipient = async (walletAddress: string) => {
    const actionKey = `archive:${walletAddress}`;
    setSubmitting(actionKey);
    setMessage(null);

    try {
      await archiveRecipient(walletAddress);
      setMessage("Recipient archived");
    } catch (nextError) {
      setMessage(
        nextError instanceof Error ? nextError.message : "Unable to archive recipient",
      );
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-[var(--surface)] text-[var(--ink)]">
      <div className="grid h-screen grid-cols-[240px_1fr]">
        <aside className="hide-scrollbar flex h-screen flex-col justify-between overflow-y-auto border-r border-[var(--card-border)] bg-white px-5 py-6 text-[var(--ink)]">
          <div>
            <SidebarBrand sectionLabel="Admin" />
            <nav className="mt-6 space-y-2 text-sm">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex w-full items-center justify-between rounded-none border border-transparent px-4 py-3 text-left text-xs uppercase tracking-[0.35em] transition hover:border-[var(--brand)] hover:bg-white/80 hover:text-[var(--ink)] ${
                    item.label === "Verifiers"
                      ? "text-[var(--ink)]"
                      : "text-[var(--ink)]/70"
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
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">
                  Verifiers
                </p>
                <h1 className="text-4xl font-semibold">Admin & Verifier Control</h1>
                <p className="mt-2 text-base text-slate-600">
                  Initialize the platform with a verifier and manage registered
                  charity or franchise recipients.
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/verifiers/sync"
                  className="rounded-none border border-[var(--card-border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em]"
                >
                  Open sync lab
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

          {error && (
            <section className="rounded-none border border-rose-300 bg-rose-50 px-6 py-4 text-sm text-rose-700">
              {error}
            </section>
          )}

          {message && (
            <section className="rounded-none border border-[var(--card-border)] bg-white px-6 py-4 text-sm text-slate-600">
              {message}
            </section>
          )}

          <section className="grid gap-4 lg:grid-cols-2">
            <article className="space-y-4 rounded-none border border-[var(--card-border)] bg-white px-6 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">
                Platform status
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-3">
                  <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-500">
                    Program
                  </p>
                  <p className="text-lg font-semibold">
                    {platformReady ? "Initialized" : "Awaiting init"}
                  </p>
                </div>
                <div className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-3">
                  <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-500">
                    Active recipients
                  </p>
                  <p className="text-lg font-semibold">
                    {recipients.filter((recipient) => recipient.active && !recipient.archived).length}
                  </p>
                </div>
              </div>

              <div className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-4 text-sm text-slate-600">
                {config ? (
                  <div className="space-y-2">
                    <p>
                      <span className="font-semibold">Admin:</span>{" "}
                      {config.admin.toBase58()}
                    </p>
                    <p>
                      <span className="font-semibold">Verifier:</span>{" "}
                      {config.verifier.toBase58()}
                    </p>
                  </div>
                ) : (
                  <p>No config account exists yet.</p>
                )}
              </div>

              <div className="space-y-3">
                <label className="block text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                  {platformReady ? "Verifier wallet" : "Initial verifier wallet"}
                  <input
                    value={verifierAddress}
                    onChange={(event) => setVerifierAddress(event.target.value)}
                    className="mt-1 w-full rounded-none border border-[var(--card-border)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--ink)]"
                  />
                </label>
                <button
                  onClick={platformReady ? handleRotateVerifier : handleInitialize}
                  disabled={!connected || submitting !== null || (platformReady && !isAdmin)}
                  className="rounded-none bg-[var(--brand)] px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting === "init"
                    ? "Initializing..."
                    : submitting === "verifier"
                      ? "Updating..."
                      : platformReady
                        ? "Rotate verifier"
                        : "Initialize platform"}
                </button>
                {platformReady && !isAdmin && (
                  <p className="text-[0.65rem] text-slate-500">
                    Only the admin wallet can rotate the verifier.
                  </p>
                )}
              </div>
            </article>

            <article className="space-y-4 rounded-none border border-[var(--card-border)] bg-white px-6 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">
                Register recipient
              </p>
              <label className="block text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                Wallet address
                <input
                  value={recipientAddress}
                  onChange={(event) => setRecipientAddress(event.target.value)}
                  className="mt-1 w-full rounded-none border border-[var(--card-border)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--ink)]"
                />
              </label>
              <label className="block text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                Label
                <input
                  value={recipientLabel}
                  onChange={(event) => setRecipientLabel(event.target.value)}
                  className="mt-1 w-full rounded-none border border-[var(--card-border)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--ink)]"
                />
              </label>
              <label className="block text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                Kind
                <select
                  value={recipientKind}
                  onChange={(event) => setRecipientKind(Number(event.target.value))}
                  className="mt-1 w-full rounded-none border border-[var(--card-border)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--ink)]"
                >
                  <option value={0}>Charity</option>
                  <option value={1}>Franchise</option>
                </select>
              </label>
              <button
                onClick={handleRegisterRecipient}
                disabled={!connected || !isAdmin || !platformReady || submitting !== null}
                className="rounded-none bg-[var(--brand)] px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting === "recipient" ? "Registering..." : "Register recipient"}
              </button>
              <p className="text-[0.65rem] text-slate-500">
                Reusing an active/inactive wallet updates its label. Deleting an inactive recipient frees the same wallet for reuse.
              </p>
              {!isAdmin && platformReady && (
                <p className="text-[0.65rem] text-slate-500">
                  Only the admin wallet can register recipients.
                </p>
              )}
            </article>
          </section>

          <section className="rounded-none border border-[var(--card-border)] bg-white px-6 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">
                Registered recipients
              </p>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Multi-recipient goal routing
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {recipients.map((recipient) => (
                <div
                  key={recipient.walletBase58}
                  className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{recipient.label}</p>
                      <p className="text-xs uppercase tracking-[0.3em] text-[var(--brand)]">
                        {recipient.kindLabel}
                      </p>
                    </div>
                    <span
                      className={`text-[0.6rem] font-semibold uppercase tracking-[0.3em] ${
                        recipient.archived
                          ? "text-slate-500"
                          : recipient.active
                            ? "text-emerald-600"
                            : "text-amber-600"
                      }`}
                    >
                      {recipient.archived
                        ? "Archived"
                        : recipient.active
                          ? "Active"
                          : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {recipient.walletBase58}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        handleToggleRecipient(
                          recipient.walletBase58,
                          !recipient.active,
                        )
                      }
                      disabled={!isAdmin || submitting !== null || recipient.archived}
                      className="rounded-none border border-[var(--card-border)] px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting === `recipient:${recipient.walletBase58}`
                        ? "Updating..."
                        : recipient.active
                          ? "Deactivate"
                          : "Activate"}
                    </button>
                    <button
                      onClick={() => handleArchiveRecipient(recipient.walletBase58)}
                      disabled={
                        !isAdmin ||
                        submitting !== null ||
                        recipient.active
                      }
                      className="rounded-none border border-[var(--card-border)] px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting === `archive:${recipient.walletBase58}`
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                  {!recipient.archived && recipient.active && (
                    <p className="mt-2 text-[0.6rem] text-slate-500">
                      Deactivate before deleting.
                    </p>
                  )}
                  {recipient.archived && (
                    <p className="mt-2 text-[0.6rem] text-slate-500">
                      This is a legacy archived record. Delete it to free the wallet for reuse.
                    </p>
                  )}
                </div>
              ))}
            </div>
            {recipients.length === 0 && (
              <p className="mt-4 text-sm text-slate-500">
                No recipients registered yet.
              </p>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
