import "server-only";

import { BorshAccountsCoder, type Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";

import onchainIdl from "../onchain-idl.json";

const PROGRAM_ID = new PublicKey("3HfJzm3qJawEJJhrFFn8aYSVYS8qT2B4s5JviAAyE6MB");
const GOAL_METADATA_ACCOUNT_DATA_SIZE = 483;

type GoalMetadataAccount = {
  goal: PublicKey;
  title: string;
  slug: string;
  description: string;
  target_label: string;
  duration_days: number;
  bump: number;
};

type GoalAccount = {
  stake_lamports: unknown;
  target_total: unknown;
  deadline_ts: unknown;
  recipient_wallet: PublicKey;
};

export type OnchainGoalMetadata = {
  goalAddress: string;
  title: string;
  slug: string;
  description: string;
  targetLabel: string;
  durationDays: number;
  targetTotal: number;
  stakeSol: number;
  deadlineTs: number;
  recipientWallet: string;
};

const idl = onchainIdl as Idl;

const getConnection = () =>
  new Connection(
    process.env.SOLANA_RPC_URL ?? clusterApiUrl("devnet"),
    "confirmed",
  );

const toNumber = (value: unknown) => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (value && typeof value === "object" && "toString" in value) {
    return Number(String(value));
  }
  return 0;
};

export const listOnchainGoalMetadata = async () => {
  const connection = getConnection();
  const coder = new BorshAccountsCoder(idl);
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [{ dataSize: GOAL_METADATA_ACCOUNT_DATA_SIZE }],
  });

  const records = await Promise.all(
    accounts.map(async (account) => {
      try {
        const decoded = coder.decode(
          "GoalMetadata",
          account.account.data,
        ) as GoalMetadataAccount;
        const goalAccountInfo = await connection.getAccountInfo(decoded.goal, "confirmed");

        if (!goalAccountInfo) {
          return null;
        }

        const goalAccount = coder.decode("Goal", goalAccountInfo.data) as GoalAccount;

        return {
          goalAddress: decoded.goal.toBase58(),
          title: decoded.title,
          slug: decoded.slug,
          description: decoded.description,
          targetLabel: decoded.target_label,
          durationDays: Number(decoded.duration_days),
          targetTotal: toNumber(goalAccount.target_total),
          stakeSol: toNumber(goalAccount.stake_lamports) / 1_000_000_000,
          deadlineTs: toNumber(goalAccount.deadline_ts),
          recipientWallet: goalAccount.recipient_wallet.toBase58(),
        } satisfies OnchainGoalMetadata;
      } catch {
        return null;
      }
    }),
  );

  return records.filter(
    (account): account is OnchainGoalMetadata => account !== null,
  );
};
