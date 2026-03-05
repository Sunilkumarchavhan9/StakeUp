import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";

import { Onchain } from "../target/types/onchain";

if (!process.env.ANCHOR_PROVIDER_URL) {
  process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const goalMetadataArgs = (suffix: string) => ({
  title: `Goal ${suffix}`,
  slug: `goal-${suffix.toLowerCase().replace(/\s+/g, "-")}`,
  description: `Live metadata for ${suffix}`,
  targetLabel: "km",
  durationDays: 7,
});

const waitUntilAfter = async (
  provider: anchor.AnchorProvider,
  targetTs: number
) => {
  for (;;) {
    const slot = await provider.connection.getSlot("confirmed");
    const blockTime = await provider.connection.getBlockTime(slot);
    if (blockTime !== null && blockTime >= targetTs) {
      return;
    }
    await sleep(500);
  }
};

describe("onchain", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Onchain as Program<Onchain>;

  const owner1 = anchor.web3.Keypair.generate();
  const owner2 = anchor.web3.Keypair.generate();
  const randomCaller = anchor.web3.Keypair.generate();

  const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  let recipientWallet: anchor.web3.PublicKey;
  let recipientPda: anchor.web3.PublicKey;

  const fundWallet = async (pk: anchor.web3.PublicKey, sol = 0.02) => {
    const payer = (provider.wallet as { payer?: anchor.web3.Keypair }).payer;
    if (!payer) {
      throw new Error("Provider wallet payer is unavailable for test funding");
    }

    const tx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: pk,
        lamports: Math.round(sol * anchor.web3.LAMPORTS_PER_SOL),
      })
    );

    let lastError: unknown;
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      try {
        await anchor.web3.sendAndConfirmTransaction(provider.connection, tx, [payer], {
          commitment: "confirmed",
        });
        return;
      } catch (error) {
        lastError = error;
        await sleep(500 * attempt);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Unable to fund wallet after retries");
  };

  before(async () => {
    await fundWallet(owner1.publicKey, 0.08);
    await fundWallet(owner2.publicKey, 0.08);
    await fundWallet(randomCaller.publicKey, 0.01);

    await program.account.config.fetch(configPda);

    const registries = await program.account.recipientRegistry.all();
    const active = registries.find((entry) => entry.account.active);
    if (!active) {
      throw new Error("No active recipient registry found on devnet");
    }

    recipientWallet = active.account.wallet;
    recipientPda = active.publicKey;
  });

  it("creates a goal and accumulates owner progress", async () => {
    const goalId = new anchor.BN(1);
    const stake = new anchor.BN(0.003 * anchor.web3.LAMPORTS_PER_SOL);
    const targetTotal = new anchor.BN(100);
    const now = Math.floor(Date.now() / 1000);
    const deadline = new anchor.BN(now + 15);
    const claimWindow = new anchor.BN(6);

    const [goalPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("goal"),
        owner1.publicKey.toBuffer(),
        goalId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );
    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), goalPda.toBuffer()],
      program.programId
    );
    const [verifiedProgressPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("verified-progress"), goalPda.toBuffer()],
      program.programId
    );
    const [goalMetadataPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("goal-metadata"), goalPda.toBuffer()],
      program.programId
    );
    const metadata = goalMetadataArgs("Devnet progress");

    await program.methods
      .createGoal(
        goalId,
        stake,
        targetTotal,
        deadline,
        claimWindow,
        metadata.durationDays,
        metadata.title,
        metadata.slug,
        metadata.description,
        metadata.targetLabel
      )
      .accounts({
        owner: owner1.publicKey,
        config: configPda,
        recipientWallet,
        recipientRegistry: recipientPda,
        goal: goalPda,
        vault: vaultPda,
        verifiedProgress: verifiedProgressPda,
        goalMetadata: goalMetadataPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner1])
      .rpc();

    await program.methods
      .submitProgress(new anchor.BN(30))
      .accounts({
        owner: owner1.publicKey,
        goal: goalPda,
      })
      .signers([owner1])
      .rpc();

    await program.methods
      .submitProgress(new anchor.BN(20))
      .accounts({
        owner: owner1.publicKey,
        goal: goalPda,
      })
      .signers([owner1])
      .rpc();

    const goal = await program.account.goal.fetch(goalPda);
    assert.equal(goal.currentProgress.toNumber(), 50);
    assert.equal(goal.checkInCount, 2);
    assert.isFalse(goal.settled);
  });

  it("settles a pending goal to recipient after deadline + claim window", async () => {
    const goalId = new anchor.BN(2);
    const stakeLamports = Math.round(0.003 * anchor.web3.LAMPORTS_PER_SOL);
    const stake = new anchor.BN(stakeLamports);
    const targetTotal = new anchor.BN(50);
    const now = Math.floor(Date.now() / 1000);
    const deadline = new anchor.BN(now + 3);
    const claimWindow = new anchor.BN(3);

    const [goalPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("goal"),
        owner2.publicKey.toBuffer(),
        goalId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );
    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), goalPda.toBuffer()],
      program.programId
    );
    const [verifiedProgressPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("verified-progress"), goalPda.toBuffer()],
      program.programId
    );
    const [goalMetadataPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("goal-metadata"), goalPda.toBuffer()],
      program.programId
    );
    const metadata = goalMetadataArgs("Forced settle");

    await program.methods
      .createGoal(
        goalId,
        stake,
        targetTotal,
        deadline,
        claimWindow,
        metadata.durationDays,
        metadata.title,
        metadata.slug,
        metadata.description,
        metadata.targetLabel
      )
      .accounts({
        owner: owner2.publicKey,
        config: configPda,
        recipientWallet,
        recipientRegistry: recipientPda,
        goal: goalPda,
        vault: vaultPda,
        verifiedProgress: verifiedProgressPda,
        goalMetadata: goalMetadataPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner2])
      .rpc();

    await waitUntilAfter(provider, deadline.toNumber() + claimWindow.toNumber() + 1);

    const recipientBefore = await provider.connection.getBalance(recipientWallet);

    await program.methods
      .settleGoal()
      .accounts({
        caller: randomCaller.publicKey,
        owner: owner2.publicKey,
        recipientWallet,
        goal: goalPda,
        vault: vaultPda,
      })
      .signers([randomCaller])
      .rpc();

    const recipientAfter = await provider.connection.getBalance(recipientWallet);
    assert.isTrue(recipientAfter >= recipientBefore);

    const goal = await program.account.goal.fetch(goalPda);
    assert.equal(Number(goal.status), 2);
    assert.isTrue(goal.settled);
    assert.isTrue(goal.finalDestination.equals(recipientWallet));
  });

  it("blocks double settlement on the same goal", async () => {
    const goalId = new anchor.BN(2);
    const [goalPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("goal"),
        owner2.publicKey.toBuffer(),
        goalId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );
    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), goalPda.toBuffer()],
      program.programId
    );

    let threw = false;
    try {
      await program.methods
        .settleGoal()
        .accounts({
          caller: randomCaller.publicKey,
          owner: owner2.publicKey,
          recipientWallet,
          goal: goalPda,
          vault: vaultPda,
        })
        .signers([randomCaller])
        .rpc();
    } catch {
      threw = true;
    }

    assert.isTrue(threw, "second settlement must fail");
  });
});
