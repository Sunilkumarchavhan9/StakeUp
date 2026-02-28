import "server-only";

import { createHash } from "crypto";

import { AnchorProvider, BN, Program, type Idl } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
  clusterApiUrl,
} from "@solana/web3.js";

import onchainIdl from "../onchain-idl.json";

const PROGRAM_ID = new PublicKey(
  "3HfJzm3qJawEJJhrFFn8aYSVYS8qT2B4s5JviAAyE6MB",
);

const idl = onchainIdl as Idl;

type ServerWallet = {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T,
  ): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[],
  ): Promise<T[]>;
};

const loadVerifierKeypair = () => {
  const raw = process.env.STAKEUP_VERIFIER_SECRET_KEY;

  if (!raw) {
    throw new Error("Missing STAKEUP_VERIFIER_SECRET_KEY");
  }

  const bytes = JSON.parse(raw) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(bytes));
};

const createServerWallet = (keypair: Keypair): ServerWallet => ({
  publicKey: keypair.publicKey,
  async signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T,
  ) {
    if (transaction instanceof VersionedTransaction) {
      transaction.sign([keypair]);
      return transaction;
    }

    transaction.partialSign(keypair);
    return transaction;
  },
  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[],
  ) {
    return Promise.all(transactions.map((transaction) => this.signTransaction(transaction)));
  },
});

const getConnection = () =>
  new Connection(
    process.env.SOLANA_RPC_URL ?? clusterApiUrl("devnet"),
    "confirmed",
  );

const getProvider = () => {
  const keypair = loadVerifierKeypair();
  const wallet = createServerWallet(keypair);
  const connection = getConnection();

  return {
    keypair,
    provider: new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    }),
  };
};

const getConfigPda = () =>
  PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);

const getVerifiedProgressPda = (goal: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("verified-progress"), goal.toBuffer()],
    PROGRAM_ID,
  );

const sourceTypeMap = {
  device_app: 1,
  wearable: 2,
  official_api: 3,
} as const;

export type VerifiedProgressSource = keyof typeof sourceTypeMap;

export const parseSourceType = (value: string) => {
  if (value in sourceTypeMap) {
    return sourceTypeMap[value as VerifiedProgressSource];
  }

  throw new Error("Invalid sourceType");
};

export const buildProofHash = (input: {
  goalAddress: string;
  progressAmount: number;
  sourceType: string;
  proofUri: string;
  activityId?: string;
}) => {
  const digest = createHash("sha256")
    .update(
      JSON.stringify({
        activityId: input.activityId ?? "",
        goalAddress: input.goalAddress,
        progressAmount: input.progressAmount,
        proofUri: input.proofUri,
        sourceType: input.sourceType,
      }),
    )
    .digest();

  return Array.from(digest);
};

export const submitVerifiedProgressOnchain = async (input: {
  goalAddress: string;
  progressAmount: number;
  proofHash: number[];
  sourceType: number;
}) => {
  const { keypair, provider } = getProvider();
  const program = new Program(idl, provider);
  const anchorProgram = program as Program<Idl> & {
    account: Record<string, { fetch(address: PublicKey): Promise<unknown> }>;
    methods: Record<string, (...args: unknown[]) => { accounts(accounts: Record<string, PublicKey>): { rpc(): Promise<string> } }>;
  };
  const [configPda] = getConfigPda();
  const goal = new PublicKey(input.goalAddress);
  const [verifiedProgressPda] = getVerifiedProgressPda(goal);

  const configAccount = (await anchorProgram.account.config.fetch(configPda)) as {
    verifier: PublicKey;
  };

  if (!configAccount.verifier.equals(keypair.publicKey)) {
    throw new Error("Configured backend verifier does not match on-chain verifier");
  }

  const signature = await anchorProgram.methods
    .submitVerifiedProgress(
      new BN(input.progressAmount),
      input.proofHash,
      input.sourceType,
    )
    .accounts({
      verifier: keypair.publicKey,
      config: configPda,
      goal,
      verifiedProgress: verifiedProgressPda,
    })
    .rpc();

  return {
    proofHashHex: Buffer.from(input.proofHash).toString("hex"),
    signature,
    verifier: keypair.publicKey.toBase58(),
  };
};
