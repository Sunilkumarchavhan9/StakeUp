"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

type ProviderConnection = {
  wallet: string;
  provider: string;
  externalUserId: string;
  displayName: string;
  status: "connected" | "revoked" | "expired";
  accessToken?: string | null;
  refreshToken?: string | null;
  scopes?: string | null;
  connectedAt: string;
  updatedAt: string;
  lastSyncedAt?: string | null;
};

type ProviderActivity = {
  provider: string;
  wallet: string;
  goalAddress: string;
  providerActivityId: string;
  sourceType: string;
  progressAmount: number;
  distanceMeters?: number | null;
  durationSeconds?: number | null;
  proofUri: string;
  routeGeoJson?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  proofHashHex: string;
  onchainSignature?: string | null;
  createdAt: string;
};

export default function ProviderBackendPage() {
  const { connected, publicKey } = useStakeupProgram();
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [activities, setActivities] = useState<ProviderActivity[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [provider, setProvider] = useState("strava");
  const [externalUserId, setExternalUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<"connected" | "revoked" | "expired">("connected");
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [scopes, setScopes] = useState("activity:read");

  const loadBackendState = async () => {
    setLoading(true);
    try {
      const [connectionsResponse, activitiesResponse] = await Promise.all([
        fetch("/api/providers/connections", { cache: "no-store" }),
        fetch("/api/providers/activities", { cache: "no-store" }),
      ]);

      const [connectionsPayload, activitiesPayload] = await Promise.all([
        connectionsResponse.json(),
        activitiesResponse.json(),
      ]);

      setConnections(connectionsPayload as ProviderConnection[]);
      setActivities(activitiesPayload as ProviderActivity[]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load provider backend state");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBackendState();
  }, []);

  useEffect(() => {
    if (connected && publicKey && !displayName) {
      setDisplayName(`Wallet ${publicKey.toBase58().slice(0, 4)}`);
    }
  }, [connected, displayName, publicKey]);

  const handleSaveConnection = async () => {
    if (!connected || !publicKey) {
      setMessage("Connect a wallet first.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/providers/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          provider,
          externalUserId,
          displayName,
          status,
          accessToken: accessToken || null,
          refreshToken: refreshToken || null,
          scopes: scopes || null,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save provider connection");
      }

      setMessage("Provider connection saved.");
      await loadBackendState();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save provider connection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-[var(--surface)] text-[var(--ink)]">
      <div className="grid h-screen grid-cols-[240px_1fr]">
        <aside className="hide-scrollbar flex h-screen flex-col justify-between overflow-y-auto border-r border-[var(--card-border)] bg-white px-5 py-6 text-[var(--ink)]">
          <div>
            <SidebarBrand sectionLabel="Providers" />
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

        <main className="hide-scrollbar h-screen overflow-y-auto mx-auto w-full max-w-6xl space-y-6 px-4 py-10">
          <header className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-6 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">Backend</p>
                <h1 className="text-4xl font-semibold">Provider Integration Hub</h1>
                <p className="mt-2 text-base text-slate-600">
                  Store provider connections and inspect activity/location payloads before wiring a real fitness app.
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/verifiers"
                  className="rounded-none border border-[var(--card-border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em]"
                >
                  Admin
                </Link>
                <Link
                  href="/verifiers/sync"
                  className="rounded-none border border-[var(--card-border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em]"
                >
                  Sync lab
                </Link>
              </div>
            </div>
          </header>

          {message && (
            <section className="rounded-none border border-[var(--card-border)] bg-white px-6 py-4 text-sm text-slate-600">
              {message}
            </section>
          )}

          <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <article className="space-y-4 rounded-none border border-[var(--card-border)] bg-white px-6 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Provider connection</p>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                  Provider
                  <input
                    value={provider}
                    onChange={(event) => setProvider(event.target.value)}
                    className="mt-1 w-full rounded-none border border-[var(--card-border)] px-3 py-2 text-sm normal-case tracking-normal"
                  />
                </label>
                <label className="block text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                  External user ID
                  <input
                    value={externalUserId}
                    onChange={(event) => setExternalUserId(event.target.value)}
                    className="mt-1 w-full rounded-none border border-[var(--card-border)] px-3 py-2 text-sm normal-case tracking-normal"
                  />
                </label>
                <label className="block text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                  Display name
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="mt-1 w-full rounded-none border border-[var(--card-border)] px-3 py-2 text-sm normal-case tracking-normal"
                  />
                </label>
                <label className="block text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                  Status
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as "connected" | "revoked" | "expired")}
                    className="mt-1 w-full rounded-none border border-[var(--card-border)] px-3 py-2 text-sm normal-case tracking-normal"
                  >
                    <option value="connected">connected</option>
                    <option value="revoked">revoked</option>
                    <option value="expired">expired</option>
                  </select>
                </label>
                <label className="block text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                  Access token
                  <input
                    value={accessToken}
                    onChange={(event) => setAccessToken(event.target.value)}
                    className="mt-1 w-full rounded-none border border-[var(--card-border)] px-3 py-2 text-sm normal-case tracking-normal"
                  />
                </label>
                <label className="block text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                  Refresh token
                  <input
                    value={refreshToken}
                    onChange={(event) => setRefreshToken(event.target.value)}
                    className="mt-1 w-full rounded-none border border-[var(--card-border)] px-3 py-2 text-sm normal-case tracking-normal"
                  />
                </label>
              </div>
              <label className="block text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                Scopes
                <input
                  value={scopes}
                  onChange={(event) => setScopes(event.target.value)}
                  className="mt-1 w-full rounded-none border border-[var(--card-border)] px-3 py-2 text-sm normal-case tracking-normal"
                />
              </label>
              <button
                onClick={handleSaveConnection}
                disabled={loading}
                className="rounded-none bg-[var(--brand)] px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Saving..." : "Save provider connection"}
              </button>
            </article>

            <article className="space-y-4 rounded-none border border-[var(--card-border)] bg-white px-6 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Saved connections</p>
              <div className="space-y-3">
                {connections.length === 0 && (
                  <p className="text-sm text-slate-500">No provider connections stored yet.</p>
                )}
                {connections.map((connection) => (
                  <div
                    key={`${connection.wallet}-${connection.provider}`}
                    className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-3"
                  >
                    <p className="text-sm font-semibold">{connection.provider} · {connection.displayName}</p>
                    <p className="text-xs text-slate-500">{connection.wallet}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {connection.status} · last sync {connection.lastSyncedAt ?? "never"}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="rounded-none border border-[var(--card-border)] bg-white px-6 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Provider activity log</p>
              <button
                onClick={() => void loadBackendState()}
                className="rounded-none border border-[var(--card-border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em]"
              >
                Refresh
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {activities.length === 0 && (
                <p className="text-sm text-slate-500">No provider activities ingested yet.</p>
              )}
              {activities.map((activity, index) => (
                <div
                  key={`${activity.providerActivityId}-${index}`}
                  className="rounded-none border border-[var(--card-border)] bg-[var(--card)] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold">{activity.provider} · {activity.sourceType}</p>
                    <span className="text-xs text-slate-500">{activity.createdAt}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Goal {activity.goalAddress}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {activity.progressAmount} progress · {activity.distanceMeters ?? 0} meters · {activity.durationSeconds ?? 0} seconds
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Route snapshot {activity.routeGeoJson ? "available" : "not provided"} · Tx {activity.onchainSignature ?? "not submitted"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
