"use client";

import { BN } from "@coral-xyz/anchor";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";

import { useOnchainProgram } from "./anchor";
import {
  getConfigPda,
  getGoalPda,
  getGoalMetadataPda,
  getRecipientPda,
  getVaultPda,
  getVerifiedProgressPda,
} from "./pdas";

type ConfigAccount = {
  admin: PublicKey;
  verifier: PublicKey;
  bump: number;
};

type RecipientRegistryAccount = {
  wallet: PublicKey;
  kind: number;
  active: boolean;
  bump: number;
};

type GoalAccount = {
  owner: PublicKey;
  goalId: BN;
  stakeLamports: BN;
  targetTotal: BN;
  currentProgress: BN;
  checkInCount: number;
  lastCheckInAt: BN;
  deadlineTs: BN;
  claimWindowSecs: BN;
  status: number;
  verifiedAt: BN;
  settled: boolean;
  settledAt: BN;
  recipientWallet: PublicKey;
  vault: PublicKey;
  finalDestination: PublicKey;
  bump: number;
};

type VerifiedProgressAccount = {
  goal: PublicKey;
  verifiedProgress: BN;
  verifiedCheckInCount: number;
  lastVerifiedAt: BN;
  lastSource: number;
  lastProofHash: number[];
  bump: number;
};

type GoalMetadataAccount = {
  goal: PublicKey;
  title: string;
  slug: string;
  description: string;
  targetLabel: string;
  durationDays: number;
  bump: number;
};

type ProgramRow<TAccount> = {
  publicKey: PublicKey;
  account: TAccount;
};

type RpcBuilder = {
  accounts(accounts: Record<string, PublicKey>): {
    rpc(): Promise<string>;
  };
};

type AnchorProgramLike = {
  account: {
    config: {
      fetch(address: PublicKey): Promise<unknown>;
    };
    recipientRegistry: {
      fetch(address: PublicKey): Promise<unknown>;
      all(): Promise<unknown>;
    };
    goal: {
      all(): Promise<unknown>;
    };
    goalMetadata: {
      fetch(address: PublicKey): Promise<unknown>;
    };
    verifiedProgress: {
      fetch(address: PublicKey): Promise<unknown>;
    };
  };
  methods: {
    initializePlatform(verifier: PublicKey): RpcBuilder;
    registerRecipient(kind: number): RpcBuilder;
    updateVerifier(newVerifier: PublicKey): RpcBuilder;
    setRecipientActive(active: boolean): RpcBuilder;
    archiveRecipient(): RpcBuilder;
    createGoal(
      goalId: BN,
      stakeLamports: BN,
      targetTotal: BN,
      deadlineTs: BN,
      claimWindowSecs: BN,
      durationDays: number,
      title: string,
      slug: string,
      description: string,
      targetLabel: string,
    ): RpcBuilder;
    submitProgress(progressAmount: BN): RpcBuilder;
    submitVerifiedProgress(
      progressAmount: BN,
      proofHash: number[],
      sourceType: number,
    ): RpcBuilder;
    verifyGoal(completed: boolean): RpcBuilder;
    settleGoal(): RpcBuilder;
  };
};

type GoalMetadataRecord = {
  title: string;
  slug: string;
  description: string;
  targetLabel: string;
  targetTotal: number;
  durationDays: number;
};

type RecipientMetadataRecord = {
  wallet: string;
  label: string;
  kind: number;
  createdAt: string;
};

export type GoalStatus = "Pending" | "Completed" | "Failed";

export type ActiveRecipient = {
  label: string;
  wallet: PublicKey;
  walletBase58: string;
  active: boolean;
  archived: boolean;
  kind: number;
  kindLabel: string;
  pda: PublicKey;
};

export type LiveGoal = {
  publicKey: PublicKey;
  owner: PublicKey;
  goalId: number;
  title: string;
  slug: string;
  detail: string;
  description: string;
  deadlineLabel: string;
  stakeSol: number;
  stakeLamports: number;
  targetTotalOnchain: number;
  currentProgress: number;
  verifiedProgress: number;
  progressPercent: number;
  progressLabel: string;
  checkInCount: number;
  lastCheckInAt: number;
  verifiedCheckInCount: number;
  lastVerifiedAt: number;
  verifiedSource: number;
  verifiedProofHash: number[];
  deadlineTs: number;
  claimWindowSecs: number;
  statusCode: number;
  status: GoalStatus;
  settled: boolean;
  verifiedAt: number;
  settledAt: number;
  recipientWallet: PublicKey;
  recipientLabel: string;
  vault: PublicKey;
  vaultBalanceSol: number;
  deadlinePassed: boolean;
  settleableNow: boolean;
  targetLabel: string;
  targetTotal: number;
  durationDays: number;
};

type CreateGoalInput = {
  title: string;
  slug?: string;
  description: string;
  targetLabel: string;
  targetTotal: number;
  durationDays: number;
  stakeSol: number;
  recipientWallet: string;
};

type RegisterRecipientInput = {
  walletAddress: string;
  label: string;
  kind: number;
};

const CLAIM_WINDOW_SECS = 24 * 60 * 60;
const MAX_GOAL_TITLE_LEN = 64;
const MAX_GOAL_DESCRIPTION_LEN = 280;
const MAX_TARGET_LABEL_LEN = 16;
const REFRESH_INTERVAL_MS = 30_000;
const MIN_REFRESH_GAP_MS = 4_000;
const RATE_LIMIT_COOLDOWN_MS = 15_000;
const ACCOUNT_CHANGE_DEBOUNCE_MS = 1_500;
// 8-byte discriminator + current Goal account payload (207 bytes).
const GOAL_ACCOUNT_DATA_SIZE = 215;
const VERIFIED_PROGRESS_ACCOUNT_DATA_SIZE = 94;

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const formatDate = (unixSeconds: number) =>
  new Date(unixSeconds * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const bnToNumber = (value: BN | number | bigint | string | null | undefined) => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string") {
    return Number(value);
  }
  if (!value) {
    return 0;
  }
  return Number(value.toString());
};

const statusFromCode = (statusCode: number): GoalStatus => {
  if (statusCode === 1) {
    return "Completed";
  }
  if (statusCode === 2) {
    return "Failed";
  }
  return "Pending";
};

const ARCHIVED_FLAG = 1 << 7;

const isArchivedKind = (kind: number) => (kind & ARCHIVED_FLAG) !== 0;

const normalizeKind = (kind: number) => kind & 1;

const kindLabel = (kind: number) =>
  normalizeKind(kind) === 1 ? "Franchise" : "Charity";

const shortenAddress = (value: string) =>
  `${value.slice(0, 4)}...${value.slice(-4)}`;

const isRpcRateLimited = (message: string) => {
  const normalized = message.toLowerCase();
  return normalized.includes("429") || normalized.includes("rate limit");
};

const createFallbackMetadata = (
  goalId: number,
): GoalMetadataRecord => ({
  title: `Goal #${goalId}`,
  slug: `goal-${goalId}`,
  description: "Goal metadata not found on-chain.",
  targetLabel: "units",
  targetTotal: 0,
  durationDays: 0,
});

async function fetchRecipientMetadata() {
  const response = await fetch("/api/recipients", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Unable to load recipient metadata");
  }

  return (await response.json()) as RecipientMetadataRecord[];
}


async function saveRecipientMetadata(record: RecipientMetadataRecord) {
  const response = await fetch("/api/recipients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });

  if (!response.ok) {
    throw new Error("Unable to persist recipient metadata");
  }
}

function useStakeupProgramState() {
  const program = useOnchainProgram();
  const { connection } = useConnection();
  const { connected, publicKey } = useWallet();

  const [config, setConfig] = useState<ConfigAccount | null>(null);
  const [recipients, setRecipients] = useState<ActiveRecipient[]>([]);
  const [goals, setGoals] = useState<LiveGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshInFlightRef = useRef(false);
  const queuedRefreshRef = useRef(false);
  const lastRefreshAtRef = useRef(0);
  const rateLimitedUntilRef = useRef(0);
  const accountChangeRefreshTimerRef = useRef<number | null>(null);

  const refresh = useCallback(async (force = false) => {
    if (!program) {
      setConfig(null);
      setRecipients([]);
      setGoals([]);
      return;
    }

    const nowMs = Date.now();
    if (!force && nowMs < rateLimitedUntilRef.current) {
      return;
    }
    if (!force && nowMs - lastRefreshAtRef.current < MIN_REFRESH_GAP_MS) {
      return;
    }
    if (refreshInFlightRef.current) {
      queuedRefreshRef.current = true;
      return;
    }

    refreshInFlightRef.current = true;
    lastRefreshAtRef.current = nowMs;

    const anchorProgram = program as unknown as AnchorProgramLike;

    setLoading(true);
    setError(null);

    try {
      const [configPda] = getConfigPda();

      let nextConfig: ConfigAccount | null = null;
      try {
        nextConfig = (await anchorProgram.account.config.fetch(configPda)) as ConfigAccount;
      } catch {
        nextConfig = null;
      }

      const [recipientRows, rawGoalRows, recipientMetadata] =
        await Promise.all([
          (anchorProgram.account.recipientRegistry.all() as Promise<
            ProgramRow<RecipientRegistryAccount>[]
          >).catch(() => []),
          connection.getProgramAccounts(program.programId, {
            filters: [{ dataSize: GOAL_ACCOUNT_DATA_SIZE }],
          }),
          fetchRecipientMetadata().catch(() => []),
        ]);

      const goalRows = rawGoalRows
        .map((row) => {
          try {
            const decoded = program.coder.accounts.decode(
              "goal",
              row.account.data,
            ) as GoalAccount;

            return {
              publicKey: row.pubkey,
              account: decoded,
            } satisfies ProgramRow<GoalAccount>;
          } catch {
            return null;
          }
        })
        .filter((row): row is ProgramRow<GoalAccount> => row !== null);

      const recipientLabels = new Map(
        recipientMetadata.map((record) => [record.wallet, record]),
      );
      const nextRecipients = recipientRows
        .map((row) => {
          const walletBase58 = row.account.wallet.toBase58();
          const metadata = recipientLabels.get(walletBase58);
          const archived = isArchivedKind(row.account.kind);
          const normalizedKind = normalizeKind(row.account.kind);

          return {
            label: metadata?.label ?? shortenAddress(walletBase58),
            wallet: row.account.wallet,
            walletBase58,
            active: row.account.active,
            archived,
            kind: normalizedKind,
            kindLabel: kindLabel(row.account.kind),
            pda: row.publicKey,
          } satisfies ActiveRecipient;
        })
        .filter((recipient) => !recipient.archived);

      const mappedGoals = await Promise.all(
        goalRows.map(async (goalRow) => {
          const account = goalRow.account;
          const goalId = bnToNumber(account.goalId);
          const stakeLamports = bnToNumber(account.stakeLamports);
          const stakeSol = stakeLamports / LAMPORTS_PER_SOL;
          const targetTotalOnchain = bnToNumber(account.targetTotal);
          const currentProgress = bnToNumber(account.currentProgress);
          const deadlineTs = bnToNumber(account.deadlineTs);
          const claimWindowSecs = bnToNumber(account.claimWindowSecs);
          const verifiedAt = bnToNumber(account.verifiedAt);
          const settledAt = bnToNumber(account.settledAt);
          const lastCheckInAt = bnToNumber(account.lastCheckInAt);
          const statusCode = Number(account.status);
          const now = Math.floor(Date.now() / 1000);
          const vaultBalanceLamports = await connection.getBalance(account.vault);
          const [verifiedProgressPda] = getVerifiedProgressPda(goalRow.publicKey);
          const [goalMetadataPda] = getGoalMetadataPda(goalRow.publicKey);
          let verifiedProgressAccount: VerifiedProgressAccount | null = null;
          let goalMetadataAccount: GoalMetadataAccount | null = null;

          try {
            verifiedProgressAccount = (await anchorProgram.account.verifiedProgress.fetch(
              verifiedProgressPda,
            )) as VerifiedProgressAccount;
          } catch {
            verifiedProgressAccount = null;
          }

          try {
            goalMetadataAccount = (await anchorProgram.account.goalMetadata.fetch(
              goalMetadataPda,
            )) as GoalMetadataAccount;
          } catch {
            goalMetadataAccount = null;
          }

          const verifiedProgress = verifiedProgressAccount
            ? bnToNumber(verifiedProgressAccount.verifiedProgress)
            : 0;
          const verifiedCheckInCount = verifiedProgressAccount
            ? Number(verifiedProgressAccount.verifiedCheckInCount)
            : 0;
          const lastVerifiedAt = verifiedProgressAccount
            ? bnToNumber(verifiedProgressAccount.lastVerifiedAt)
            : 0;
          const verifiedSource = verifiedProgressAccount
            ? Number(verifiedProgressAccount.lastSource)
            : 0;
          const verifiedProofHash = verifiedProgressAccount
            ? verifiedProgressAccount.lastProofHash
            : [];
          const metadata: GoalMetadataRecord = goalMetadataAccount
            ? {
                title: goalMetadataAccount.title,
                slug: goalMetadataAccount.slug,
                description: goalMetadataAccount.description,
                targetLabel: goalMetadataAccount.targetLabel,
                targetTotal: targetTotalOnchain,
                durationDays: Number(goalMetadataAccount.durationDays),
              }
            : createFallbackMetadata(goalId);
          const targetTotal = targetTotalOnchain || metadata.targetTotal;
          const displayProgress = verifiedProgress > 0 ? verifiedProgress : currentProgress;
          const displayCheckInCount =
            verifiedCheckInCount > 0 ? verifiedCheckInCount : Number(account.checkInCount);
          const progressPercent =
            targetTotal > 0
              ? Math.min(100, Math.round((displayProgress / targetTotal) * 100))
              : 0;

          return {
            publicKey: goalRow.publicKey,
            owner: account.owner,
            goalId,
            title: metadata.title,
            slug: metadata.slug,
            detail: `Stake ${stakeSol.toFixed(2)} SOL · Deadline ${formatDate(deadlineTs)}`,
            description: metadata.description,
            deadlineLabel: formatDate(deadlineTs),
            stakeSol,
            stakeLamports,
            targetTotalOnchain,
            currentProgress,
            verifiedProgress,
            progressPercent,
            progressLabel:
              targetTotal > 0
                ? `${displayProgress}/${targetTotal} ${metadata.targetLabel}${
                    verifiedProgress > 0 ? " verified" : " manual"
                  }`
                : "No target set",
            checkInCount: displayCheckInCount,
            lastCheckInAt,
            verifiedCheckInCount,
            lastVerifiedAt,
            verifiedSource,
            verifiedProofHash,
            deadlineTs,
            claimWindowSecs,
            statusCode,
            status: statusFromCode(statusCode),
            settled: account.settled,
            verifiedAt,
            settledAt,
            recipientWallet: account.recipientWallet,
            recipientLabel:
              recipientLabels.get(account.recipientWallet.toBase58())?.label ??
              shortenAddress(account.recipientWallet.toBase58()),
            vault: account.vault,
            vaultBalanceSol: vaultBalanceLamports / LAMPORTS_PER_SOL,
            deadlinePassed: now >= deadlineTs,
            settleableNow: now >= deadlineTs + claimWindowSecs,
            targetLabel: metadata.targetLabel,
            targetTotal,
            durationDays: metadata.durationDays,
          } satisfies LiveGoal;
        }),
      );

      mappedGoals.sort((left, right) => right.goalId - left.goalId);

      setConfig(nextConfig);
      setRecipients(nextRecipients);
      setGoals(mappedGoals);
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : "Unable to refresh on-chain state";
      if (isRpcRateLimited(message)) {
        rateLimitedUntilRef.current = Date.now() + RATE_LIMIT_COOLDOWN_MS;
        setError("Devnet RPC rate limit reached. Retrying shortly.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
      refreshInFlightRef.current = false;
      if (queuedRefreshRef.current) {
        queuedRefreshRef.current = false;
        window.setTimeout(() => {
          void refresh();
        }, 500);
      }
    }
  }, [connection, program]);

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  useEffect(() => {
    if (!program) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);

    const handleFocus = () => {
      void refresh(true);
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [program, refresh]);

  useEffect(() => {
    if (!program) {
      return;
    }

    const goalSubscription = connection.onProgramAccountChange(
      program.programId,
      () => {
        if (accountChangeRefreshTimerRef.current !== null) {
          return;
        }
        accountChangeRefreshTimerRef.current = window.setTimeout(() => {
          accountChangeRefreshTimerRef.current = null;
          void refresh();
        }, ACCOUNT_CHANGE_DEBOUNCE_MS);
      },
      "confirmed",
      [{ dataSize: GOAL_ACCOUNT_DATA_SIZE }],
    );

    const verifiedProgressSubscription = connection.onProgramAccountChange(
      program.programId,
      () => {
        if (accountChangeRefreshTimerRef.current !== null) {
          return;
        }
        accountChangeRefreshTimerRef.current = window.setTimeout(() => {
          accountChangeRefreshTimerRef.current = null;
          void refresh();
        }, ACCOUNT_CHANGE_DEBOUNCE_MS);
      },
      "confirmed",
      [{ dataSize: VERIFIED_PROGRESS_ACCOUNT_DATA_SIZE }],
    );

    return () => {
      if (accountChangeRefreshTimerRef.current !== null) {
        window.clearTimeout(accountChangeRefreshTimerRef.current);
        accountChangeRefreshTimerRef.current = null;
      }
      void connection.removeProgramAccountChangeListener(goalSubscription);
      void connection.removeProgramAccountChangeListener(
        verifiedProgressSubscription,
      );
    };
  }, [connection, program, refresh]);

  const ownerGoals = useMemo(
    () => (publicKey ? goals.filter((goal) => goal.owner.equals(publicKey)) : []),
    [goals, publicKey],
  );

  const isAdmin = useMemo(
    () => Boolean(config && publicKey && config.admin.equals(publicKey)),
    [config, publicKey],
  );

  const isVerifier = useMemo(
    () => Boolean(config && publicKey && config.verifier.equals(publicKey)),
    [config, publicKey],
  );

  const initializePlatform = useCallback(
    async (verifierAddress: string) => {
      if (!program || !publicKey) {
        throw new Error("Connect a wallet first");
      }
      if (config) {
        throw new Error("Platform is already initialized");
      }

      const anchorProgram = program as unknown as AnchorProgramLike;
      const [configPda] = getConfigPda();
      const verifier = new PublicKey(verifierAddress);

      await anchorProgram.methods
        .initializePlatform(verifier)
        .accounts({
          admin: publicKey,
          config: configPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await refresh();
    },
    [config, program, publicKey, refresh],
  );

  const registerRecipient = useCallback(
    async ({ kind, label, walletAddress }: RegisterRecipientInput) => {
      if (!program || !publicKey) {
        throw new Error("Connect a wallet first");
      }
      if (!config) {
        throw new Error("Initialize the platform first");
      }

      const nextLabel = label.trim();
      if (!nextLabel) {
        throw new Error("Recipient label is required");
      }

      const anchorProgram = program as unknown as AnchorProgramLike;
      let recipientWallet: PublicKey;
      try {
        recipientWallet = new PublicKey(walletAddress.trim());
      } catch {
        throw new Error("Enter a valid Solana wallet address");
      }

      const existingRecipient = recipients.find(
        (recipient) => recipient.walletBase58 === recipientWallet.toBase58(),
      );

      if (existingRecipient) {
        if (existingRecipient.archived) {
          throw new Error(
            "This wallet is still present as an archived recipient. Delete it from the list first, then register it again.",
          );
        }

        if (existingRecipient.kind !== kind) {
          throw new Error(
            `This wallet is already registered on-chain as a ${existingRecipient.kindLabel.toLowerCase()}. Use a new wallet to change the recipient type.`,
          );
        }

        await saveRecipientMetadata({
          wallet: recipientWallet.toBase58(),
          label: nextLabel,
          kind,
          createdAt: new Date().toISOString(),
        });

        await refresh();
        return;
      }

      const [configPda] = getConfigPda();
      const [recipientRegistryPda] = getRecipientPda(recipientWallet);

      await anchorProgram.methods
        .registerRecipient(kind)
        .accounts({
          admin: publicKey,
          config: configPda,
          recipientWallet,
          recipientRegistry: recipientRegistryPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await saveRecipientMetadata({
        wallet: recipientWallet.toBase58(),
        label: nextLabel,
        kind,
        createdAt: new Date().toISOString(),
      });

      await refresh();
    },
    [config, program, publicKey, recipients, refresh],
  );

  const updateVerifier = useCallback(
    async (verifierAddress: string) => {
      if (!program || !publicKey) {
        throw new Error("Connect a wallet first");
      }
      if (!config) {
        throw new Error("Initialize the platform first");
      }

      const anchorProgram = program as unknown as AnchorProgramLike;
      const [configPda] = getConfigPda();
      const verifier = new PublicKey(verifierAddress);

      await anchorProgram.methods
        .updateVerifier(verifier)
        .accounts({
          admin: publicKey,
          config: configPda,
        })
        .rpc();

      await refresh();
    },
    [config, program, publicKey, refresh],
  );

  const setRecipientActive = useCallback(
    async (walletAddress: string, active: boolean) => {
      if (!program || !publicKey) {
        throw new Error("Connect a wallet first");
      }
      if (!config) {
        throw new Error("Initialize the platform first");
      }

      const anchorProgram = program as unknown as AnchorProgramLike;
      const recipientWallet = new PublicKey(walletAddress);
      const [configPda] = getConfigPda();
      const [recipientRegistryPda] = getRecipientPda(recipientWallet);

      await anchorProgram.methods
        .setRecipientActive(active)
        .accounts({
          admin: publicKey,
          config: configPda,
          recipientWallet,
          recipientRegistry: recipientRegistryPda,
        })
        .rpc();

      await refresh();
    },
    [config, program, publicKey, refresh],
  );

  const archiveRecipient = useCallback(
    async (walletAddress: string) => {
      if (!program || !publicKey) {
        throw new Error("Connect a wallet first");
      }
      if (!config) {
        throw new Error("Initialize the platform first");
      }

      const anchorProgram = program as unknown as AnchorProgramLike;
      const recipientWallet = new PublicKey(walletAddress);
      const [configPda] = getConfigPda();
      const [recipientRegistryPda] = getRecipientPda(recipientWallet);

      await anchorProgram.methods
        .archiveRecipient()
        .accounts({
          admin: publicKey,
          config: configPda,
          recipientWallet,
          recipientRegistry: recipientRegistryPda,
        })
        .rpc();

      await refresh();
    },
    [config, program, publicKey, refresh],
  );

  const createGoal = useCallback(
    async (input: CreateGoalInput) => {
      if (!program || !publicKey) {
        throw new Error("Connect a wallet first");
      }
      if (!config) {
        throw new Error("Initialize the platform before creating goals");
      }

      const selectedRecipient = recipients.find(
        (recipient) => recipient.walletBase58 === input.recipientWallet,
      );

      if (!selectedRecipient) {
        throw new Error("Select a registered charity or franchise");
      }
      if (!selectedRecipient.active) {
        throw new Error("Selected recipient is inactive");
      }
      if (selectedRecipient.archived) {
        throw new Error("Selected recipient is archived");
      }

      const title = input.title.trim();
      const description = input.description.trim();
      const targetLabel = input.targetLabel.trim();

      if (!title || title.length > MAX_GOAL_TITLE_LEN) {
        throw new Error("Title is required and must be 64 characters or fewer");
      }
      if (!description || description.length > MAX_GOAL_DESCRIPTION_LEN) {
        throw new Error("Description is required and must be 280 characters or fewer");
      }
      if (!targetLabel || targetLabel.length > MAX_TARGET_LABEL_LEN) {
        throw new Error("Target label is required and must be 16 characters or fewer");
      }
      if (!Number.isFinite(input.targetTotal) || input.targetTotal <= 0) {
        throw new Error("Target total must be greater than 0");
      }
      if (!Number.isFinite(input.stakeSol) || input.stakeSol <= 0) {
        throw new Error("Stake must be greater than 0");
      }
      if (!Number.isFinite(input.durationDays) || input.durationDays <= 0) {
        throw new Error("Duration must be at least 1 day");
      }

      const anchorProgram = program as unknown as AnchorProgramLike;
      const goalId = Date.now();
      const stakeLamports = Math.round(input.stakeSol * LAMPORTS_PER_SOL);
      const deadlineTs =
        Math.floor(Date.now() / 1000) + input.durationDays * 24 * 60 * 60;
      const [configPda] = getConfigPda();
      const [goalPda] = getGoalPda(publicKey, goalId);
      const [vaultPda] = getVaultPda(goalPda);
      const [verifiedProgressPda] = getVerifiedProgressPda(goalPda);
      const [goalMetadataPda] = getGoalMetadataPda(goalPda);
      const goalSlug = input.slug ?? toSlug(input.title);

      await anchorProgram.methods
        .createGoal(
          new BN(goalId),
          new BN(stakeLamports),
          new BN(input.targetTotal),
          new BN(deadlineTs),
          new BN(CLAIM_WINDOW_SECS),
          input.durationDays,
          title,
          goalSlug,
          description,
          targetLabel,
        )
        .accounts({
          owner: publicKey,
          config: configPda,
          recipientWallet: selectedRecipient.wallet,
          recipientRegistry: selectedRecipient.pda,
          goal: goalPda,
          vault: vaultPda,
          verifiedProgress: verifiedProgressPda,
          goalMetadata: goalMetadataPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await refresh();
    },
    [config, program, publicKey, recipients, refresh],
  );

  const submitProgress = useCallback(
    async (goal: LiveGoal, progressAmount: number) => {
      if (!program || !publicKey) {
        throw new Error("Connect a wallet first");
      }

      const anchorProgram = program as unknown as AnchorProgramLike;

      await anchorProgram.methods
        .submitProgress(new BN(progressAmount))
        .accounts({
          owner: publicKey,
          goal: goal.publicKey,
        })
        .rpc();

      await refresh();
    },
    [program, publicKey, refresh],
  );

  const verifyGoal = useCallback(
    async (goal: LiveGoal, completed: boolean) => {
      if (!program || !publicKey) {
        throw new Error("Connect a wallet first");
      }

      const anchorProgram = program as unknown as AnchorProgramLike;
      const [configPda] = getConfigPda();
      const [verifiedProgressPda] = getVerifiedProgressPda(goal.publicKey);

      await anchorProgram.methods
        .verifyGoal(completed)
        .accounts({
          verifier: publicKey,
          config: configPda,
          goal: goal.publicKey,
          verifiedProgress: verifiedProgressPda,
        })
        .rpc();

      await refresh();
    },
    [program, publicKey, refresh],
  );

  const settleGoal = useCallback(
    async (goal: LiveGoal) => {
      if (!program || !publicKey) {
        throw new Error("Connect a wallet first");
      }

      const anchorProgram = program as unknown as AnchorProgramLike;

      await anchorProgram.methods
        .settleGoal()
        .accounts({
          caller: publicKey,
          owner: goal.owner,
          recipientWallet: goal.recipientWallet,
          goal: goal.publicKey,
          vault: goal.vault,
        })
        .rpc();

      await refresh();
    },
    [program, publicKey, refresh],
  );

  return {
    config,
    connected,
    createGoal,
    error,
    goals,
    initializePlatform,
    isAdmin,
    isVerifier,
    loading,
    ownerGoals,
    platformReady: Boolean(config),
    program,
    publicKey,
    recipients,
    refresh,
    archiveRecipient,
    registerRecipient,
    setRecipientActive,
    settleGoal,
    submitProgress,
    updateVerifier,
    verifyGoal,
  };
}

type StakeupProgramContextValue = ReturnType<typeof useStakeupProgramState>;

const StakeupProgramContext = createContext<StakeupProgramContextValue | null>(
  null,
);

type StakeupProgramProviderProps = {
  children: ReactNode;
};

export function StakeupProgramProvider({
  children,
}: StakeupProgramProviderProps) {
  const value = useStakeupProgramState();

  return (
    <StakeupProgramContext.Provider value={value}>
      {children}
    </StakeupProgramContext.Provider>
  );
}

export function useStakeupProgram() {
  const context = useContext(StakeupProgramContext);

  if (!context) {
    throw new Error("useStakeupProgram must be used inside StakeupProgramProvider");
  }

  return context;
}
