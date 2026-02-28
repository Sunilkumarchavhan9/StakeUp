import { PublicKey } from "@solana/web3.js";

import { ONCHAIN_PROGRAM_ID } from "./anchor";

const encoder = new TextEncoder();

const seed = (value: string) => encoder.encode(value);

const toGoalIdBuffer = (goalId: bigint | number) => {
  const value = BigInt(goalId);
  const bytes = new Uint8Array(8);
  const view = new DataView(bytes.buffer);
  view.setBigUint64(0, value, true);
  return bytes;
};

export const getConfigPda = () =>
  PublicKey.findProgramAddressSync([seed("config")], ONCHAIN_PROGRAM_ID);

export const getRecipientPda = (recipientWallet: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [seed("recipient"), recipientWallet.toBytes()],
    ONCHAIN_PROGRAM_ID,
  );

export const getGoalPda = (owner: PublicKey, goalId: bigint | number) =>
  PublicKey.findProgramAddressSync(
    [seed("goal"), owner.toBytes(), toGoalIdBuffer(goalId)],
    ONCHAIN_PROGRAM_ID,
  );

export const getVaultPda = (goal: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [seed("vault"), goal.toBytes()],
    ONCHAIN_PROGRAM_ID,
  );

export const getVerifiedProgressPda = (goal: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [seed("verified-progress"), goal.toBytes()],
    ONCHAIN_PROGRAM_ID,
  );

export const getGoalMetadataPda = (goal: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [seed("goal-metadata"), goal.toBytes()],
    ONCHAIN_PROGRAM_ID,
  );
