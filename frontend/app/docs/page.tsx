"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import BrandLogo from "../components/brand-logo";

type DocBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "code"; language: string; code: string }
  | { type: "quote"; text: string };

type DocSection = {
  id: string;
  title: string;
  summary: string;
  blocks: DocBlock[];
};

type DocGroup = {
  id: string;
  title: string;
  sections: DocSection[];
};

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Goals", href: "/goals" },
  { label: "Vaults", href: "/vaults" },
  { label: "Charities", href: "/charities" },
  { label: "Verifiers", href: "/verifiers" },
  { label: "Docs", href: "/docs" },
];

const docGroups: DocGroup[] = [
  {
    id: "overview",
    title: "Overview",
    sections: [
      {
        id: "welcome",
        title: "Welcome to StakeUp",
        summary:
          "StakeUp is a Solana commitment product where users lock SOL against real-world goals and resolve outcomes through on-chain vault rules.",
        blocks: [
          {
            type: "paragraph",
            text: "StakeUp combines a SaaS-style product interface with an Anchor program. The web app is the control surface; the program is the custody and settlement layer.",
          },
          {
            type: "list",
            items: [
              "Create a goal and lock stake into a vault PDA",
              "Track progress through manual and backend-verified updates",
              "Route successful goals back to the user",
              "Route failed goals to a registered charity or franchise wallet",
            ],
          },
          {
            type: "quote",
            text: "The product goal is accountability with financial consequences, not just habit tracking.",
          },
        ],
      },
      {
        id: "product-system",
        title: "Product System",
        summary:
          "The platform is organized into goal creation, on-chain custody, progress sync, verification, and settlement.",
        blocks: [
          {
            type: "paragraph",
            text: "Each live goal coordinates multiple accounts: Goal, Vault, GoalMetadata, VerifiedProgress, and recipient registry state.",
          },
          {
            type: "code",
            language: "text",
            code: "User -> Create Goal -> Goal PDA + Vault PDA + GoalMetadata PDA + VerifiedProgress PDA\nVerifier -> Review -> verify_goal\nProgram -> settle_goal -> Refund or Fallback Route",
          },
          {
            type: "paragraph",
            text: "This separation keeps the app understandable: metadata is readable, custody is isolated, and verification stays explicit.",
          },
        ],
      },
    ],
  },
  {
    id: "app-modules",
    title: "App Modules",
    sections: [
      {
        id: "dashboard",
        title: "Dashboard",
        summary:
          "The dashboard is the live operational homepage for the connected wallet.",
        blocks: [
          {
            type: "list",
            items: [
              "Shows current goal, verified progress, stake, route target, and calendar state",
              "Search filters the live wallet goal set",
              "View sends the user to the goals table, not a static card route",
            ],
          },
          {
            type: "paragraph",
            text: "The dashboard should never be treated as a mock-only page. It is driven by the shared Solana state hook and refreshes from devnet.",
          },
        ],
      },
      {
        id: "goals",
        title: "Goals",
        summary:
          "Goals are the primary product entities and now render as a live table plus per-goal detail routes.",
        blocks: [
          {
            type: "paragraph",
            text: "The goals page lists each goal with status, progress, stake, deadline, route, and action controls. Each row links to a dedicated detail page resolved by slug.",
          },
          {
            type: "code",
            language: "text",
            code: "/goals -> live goal table\n/goals/[slug] -> detail page resolved from GoalMetadata on-chain",
          },
          {
            type: "list",
            items: [
              "Manual check-ins update owner-reported progress",
              "Verified progress updates the trusted progress state",
              "Settlement actions remain constrained by status and timing",
            ],
          },
        ],
      },
      {
        id: "vaults",
        title: "Vaults",
        summary:
          "Vaults are the on-chain custody layer and are the source of truth for locked stake.",
        blocks: [
          {
            type: "paragraph",
            text: "Each goal creates a dedicated vault PDA. Funds remain there until the program resolves the outcome.",
          },
          {
            type: "list",
            items: [
              "Completed + verified -> owner refund path",
              "Failed -> recipient routing path",
              "Unclaimed completed goals can still route after the refund window",
            ],
          },
        ],
      },
      {
        id: "charities",
        title: "Charities",
        summary:
          "Charity routing is a live operating surface, not a static configuration page.",
        blocks: [
          {
            type: "paragraph",
            text: "Recipients are registered on-chain and can be active, inactive, or archived. The charities page shows live recipients plus routed failed-goal settlements.",
          },
          {
            type: "list",
            items: [
              "Registered charity wallets",
              "Settled failed-goal donation feed",
              "Routing coverage and total donated metrics",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "trust-ops",
    title: "Trust and Operations",
    sections: [
      {
        id: "verification",
        title: "Verification Model",
        summary:
          "StakeUp treats manual progress and verified progress differently so fake self-reported updates cannot directly unlock success.",
        blocks: [
          {
            type: "paragraph",
            text: "Manual progress is useful for tracking but does not count as sufficient proof for a successful outcome. Verified progress is the trust gate.",
          },
          {
            type: "list",
            items: [
              "submit_progress -> manual check-in",
              "submit_verified_progress -> backend-signed verified update",
              "verify_goal(completed) -> requires verified evidence",
            ],
          },
          {
            type: "quote",
            text: "The system intentionally separates momentum tracking from trust-grade evidence.",
          },
        ],
      },
      {
        id: "verifiers",
        title: "Verifiers",
        summary:
          "Verifier tools are the operator layer for recipient management, sync flows, and outcome review.",
        blocks: [
          {
            type: "paragraph",
            text: "Admin and verifier controls allow platform initialization, verifier rotation, recipient registration, recipient lifecycle changes, and testing backend syncs.",
          },
          {
            type: "list",
            items: [
              "Initialize platform",
              "Rotate verifier",
              "Register / deactivate / archive recipient",
              "Use verifier sync page to submit backend-style updates",
            ],
          },
        ],
      },
      {
        id: "provider-sync",
        title: "Provider Sync",
        summary:
          "Devices and fitness apps should not write directly to chain. They sync through the backend verifier path.",
        blocks: [
          {
            type: "code",
            language: "text",
            code: "Device or App -> Backend verification -> /api/verified-progress -> submit_verified_progress -> VerifiedProgress PDA",
          },
          {
            type: "paragraph",
            text: "This design makes it possible to support Strava, wearables, GPS route verification, or official score feeds without trusting raw client input.",
          },
        ],
      },
    ],
  },
];

const copyToClipboard = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // ignore clipboard failures
  }
};

const allSections = docGroups.flatMap((group) => group.sections);

export default function DocsPage() {
  const [search, setSearch] = useState("");
  const [activeSectionId, setActiveSectionId] = useState(allSections[0].id);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    overview: true,
    "app-modules": true,
    "trust-ops": true,
  });

  const visibleGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return docGroups;
    }

    return docGroups
      .map((group) => ({
        ...group,
        sections: group.sections.filter((section) =>
          [section.title, section.summary, ...section.blocks.flatMap((block) => {
            if (block.type === "list") {
              return block.items;
            }
            if (block.type === "code") {
              return [block.code];
            }
            return [block.text];
          })].some((value) => value.toLowerCase().includes(query)),
        ),
      }))
      .filter((group) => group.sections.length > 0);
  }, [search]);

  const activeSection =
    visibleGroups
      .flatMap((group) => group.sections)
      .find((section) => section.id === activeSectionId) ??
    visibleGroups[0]?.sections[0] ??
    allSections[0];

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) {
        return;
      }

      const matchingGroup = docGroups.find((group) =>
        group.sections.some((section) => section.id === hash),
      );

      if (!matchingGroup) {
        return;
      }

      setActiveSectionId(hash);
      setOpenGroups((current) => ({
        ...current,
        [matchingGroup.id]: true,
      }));
    };

    applyHash();
    window.addEventListener("hashchange", applyHash);

    return () => {
      window.removeEventListener("hashchange", applyHash);
    };
  }, []);

  const handleSectionSelect = (sectionId: string) => {
    const nextHash = `#${sectionId}`;
    setActiveSectionId(sectionId);
    window.history.replaceState(null, "", nextHash);
  };

  const toggleGroup = (groupId: string) => {
    setOpenGroups((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  };

  return (
    <div className="force-square h-screen overflow-hidden bg-[#0f1012] text-white">
      <div className="grid h-screen grid-cols-[320px_1fr]">
        <aside className="flex h-screen flex-col border-r border-white/8 bg-[#131416]">
          <div className="border-b border-white/8 px-5 py-5">
            <Link href="/" className="block text-white">
              <BrandLogo className="h-auto w-full max-w-[190px]" />
            </Link>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.35em] text-white/35">
              Product Docs
            </p>
          </div>

          <div className="border-b border-white/8 px-5 py-4">
            <div className="rounded-none border border-white/8 bg-[#1a1b1f] px-4 py-3">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search docs..."
                className="w-full border-0 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
              />
            </div>
          </div>

          <div className="hide-scrollbar flex-1 space-y-3 overflow-y-auto px-3 py-4">
            {visibleGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-none border border-white/6 bg-[#17181b]"
              >
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold text-white/85">{group.title}</span>
                  <span className="text-white/35">{openGroups[group.id] ? "-" : "+"}</span>
                </button>

                {openGroups[group.id] && (
                  <div className="space-y-1 px-2 pb-2">
                    {group.sections.map((section) => {
                      const active = section.id === activeSection.id;
                      return (
                        <button
                          key={section.id}
                          onClick={() => handleSectionSelect(section.id)}
                          className={`flex w-full items-center justify-between rounded-none px-3 py-3 text-left transition ${
                            active
                              ? "bg-[var(--brand)]/12 text-[var(--brand)]"
                              : "text-white/68 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span className="text-[15px] font-medium">{section.title}</span>
                          <span className="text-white/25">{">"}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-white/8 px-4 py-4">
            <div className="rounded-none border border-white/8 bg-[#17181b] px-4 py-4">
              <p className="text-sm font-semibold">Website modules</p>
              <div className="mt-3 space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="block text-xs uppercase tracking-[0.25em] text-white/42 transition hover:text-[var(--brand)]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="flex h-screen flex-col overflow-hidden bg-[#101113]">
          <header className="flex items-center justify-between border-b border-white/8 px-8 py-5">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/35">StakeUp Documentation</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight">{activeSection.title}</h1>
            </div>
            <button
              onClick={() =>
                copyToClipboard(
                  `${window.location.origin}/docs#${activeSection.id}`,
                )
              }
              className="rounded-none border border-white/8 bg-[#17181b] px-4 py-2 text-sm font-medium text-white/78 transition hover:border-white/15 hover:text-white"
            >
              Copy deep link
            </button>
          </header>

          <div className="hide-scrollbar mx-auto flex w-full max-w-7xl flex-1 gap-8 overflow-y-auto px-8 py-8">
            <section className="min-w-0 flex-1">
              <article className="rounded-none border border-white/8 bg-[#17181b] px-7 py-7 shadow-[0_18px_40px_rgba(0,0,0,0.25)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-white/35">Section</p>
                    <h2 className="mt-4 text-4xl font-semibold tracking-tight">
                      {activeSection.title}
                    </h2>
                  </div>
                  <span className="rounded-none border border-white/10 px-3 py-2 text-[0.65rem] uppercase tracking-[0.3em] text-[var(--brand)]">
                    #{activeSection.id}
                  </span>
                </div>

                <p className="mt-6 max-w-4xl text-xl leading-relaxed text-white/75">
                  {activeSection.summary}
                </p>

                <div className="mt-8 space-y-5">
                  {activeSection.blocks.map((block, index) => {
                    if (block.type === "paragraph") {
                      return (
                        <div
                          key={`${activeSection.id}-${index}`}
                          className="rounded-none border border-white/7 bg-[#111215] px-5 py-4"
                        >
                          <p className="text-base leading-8 text-white/82">{block.text}</p>
                        </div>
                      );
                    }

                    if (block.type === "quote") {
                      return (
                        <div
                          key={`${activeSection.id}-${index}`}
                          className="rounded-none border border-[var(--brand)]/20 bg-[var(--brand)]/6 px-5 py-4"
                        >
                          <p className="text-base leading-8 text-white/85">{block.text}</p>
                        </div>
                      );
                    }

                    if (block.type === "list") {
                      return (
                        <div
                          key={`${activeSection.id}-${index}`}
                          className="rounded-none border border-white/7 bg-[#111215] px-5 py-4"
                        >
                          <ul className="space-y-3">
                            {block.items.map((item) => (
                              <li
                                key={item}
                                className="flex gap-3 text-base leading-8 text-white/82"
                              >
                                <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-none bg-[var(--brand)]" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`${activeSection.id}-${index}`}
                        className="overflow-hidden rounded-none border border-white/7 bg-[#111215]"
                      >
                        <div className="border-b border-white/7 px-4 py-3 text-[0.65rem] uppercase tracking-[0.35em] text-white/35">
                          {block.language}
                        </div>
                        <pre className="overflow-x-auto px-5 py-4 text-sm leading-7 text-white/75">
                          <code>{block.code}</code>
                        </pre>
                      </div>
                    );
                  })}
                </div>
              </article>
            </section>

            <aside className="hidden w-[300px] shrink-0 2xl:block">
              <div className="sticky top-8 space-y-4">
                <div className="rounded-none border border-white/8 bg-[#17181b] px-5 py-5 shadow-[0_18px_40px_rgba(0,0,0,0.25)]">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/35">Deep links</p>
                  <div className="mt-4 space-y-3">
                    {allSections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => handleSectionSelect(section.id)}
                        className="block w-full text-left text-sm text-white/68 transition hover:text-[var(--brand)]"
                      >
                        /docs#{section.id}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-none border border-white/8 bg-[#17181b] px-5 py-5 shadow-[0_18px_40px_rgba(0,0,0,0.25)]">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/35">Visible sections</p>
                  <p className="mt-3 text-4xl font-semibold">
                    {visibleGroups.reduce((sum, group) => sum + group.sections.length, 0)}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white/55">
                    The sidebar updates live as you search and preserves collapsible groups.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

