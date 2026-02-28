import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";

import { Onchain } from "../target/types/onchain";

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

  const admin = provider.wallet;
  const verifier = admin.publicKey;
  const newVerifier = anchor.web3.Keypair.generate();

  const recipient = anchor.web3.Keypair.generate();
  const recipientTwo = anchor.web3.Keypair.generate();
  const owner1 = anchor.web3.Keypair.generate();
  const owner2 = anchor.web3.Keypair.generate();
  const randomCaller = anchor.web3.Keypair.generate();

  const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  const [recipientPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("recipient"), recipient.publicKey.toBuffer()],
    program.programId
  );

  const [recipientTwoPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("recipient"), recipientTwo.publicKey.toBuffer()],
    program.programId
  );

  const airdrop = async (pk: anchor.web3.PublicKey, sol = 2) => {
    const sig = await provider.connection.requestAirdrop(
      pk,
      sol * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig, "confirmed");
  };

  before(async () => {
    await airdrop(recipient.publicKey, 1);
    await airdrop(recipientTwo.publicKey, 1);
    await airdrop(newVerifier.publicKey, 2);
    await airdrop(owner1.publicKey, 3);
    await airdrop(owner2.publicKey, 3);
    await airdrop(randomCaller.publicKey, 2);

    await program.methods
      .initializePlatform(verifier)
      .accounts({
        admin: admin.publicKey,
        config: configPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .registerRecipient(0)
      .accounts({
        admin: admin.publicKey,
        config: configPda,
        recipientWallet: recipient.publicKey,
        recipientRegistry: recipientPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  });

  it("refunds the owner for a completed goal", async () => {
    const goalId = new anchor.BN(1);
    const stake = new anchor.BN(0.2 * anchor.web3.LAMPORTS_PER_SOL);
    const targetTotal = new anchor.BN(100);
    const now = Math.floor(Date.now() / 1000);
    const deadline = new anchor.BN(now + 3);
    const claimWindow = new anchor.BN(3600);

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
    const metadata = goalMetadataArgs("Owner refund");

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
        recipientWallet: recipient.publicKey,
        recipientRegistry: recipientPda,
        goal: goalPda,
        vault: vaultPda,
        verifiedProgress: verifiedProgressPda,
        goalMetadata: goalMetadataPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner1])
      .rpc();

    const goalMetadata = await program.account.goalMetadata.fetch(goalMetadataPda);
    assert.equal(goalMetadata.slug, metadata.slug, "goal metadata slug should persist");

    await program.methods
      .submitProgress(new anchor.BN(40))
      .accounts({
        owner: owner1.publicKey,
        goal: goalPda,
      })
      .signers([owner1])
      .rpc();

    await program.methods
      .submitProgress(new anchor.BN(15))
      .accounts({
        owner: owner1.publicKey,
        goal: goalPda,
      })
      .signers([owner1])
      .rpc();

    const progressedGoal = await program.account.goal.fetch(goalPda);
    assert.equal(
      progressedGoal.currentProgress.toNumber(),
      55,
      "progress should accumulate on-chain"
    );
    assert.equal(
      progressedGoal.checkInCount,
      2,
      "check-in counter should increment"
    );

    let overTargetRejected = false;
    try {
      await program.methods
        .submitProgress(new anchor.BN(46))
        .accounts({
          owner: owner1.publicKey,
          goal: goalPda,
        })
        .signers([owner1])
        .rpc();
    } catch {
      overTargetRejected = true;
    }

    assert.isTrue(overTargetRejected, "progress above target must fail");

    await program.methods
      .submitVerifiedProgress(
        new anchor.BN(55),
        Array.from(Buffer.alloc(32, 7)),
        1
      )
      .accounts({
        verifier,
        config: configPda,
        goal: goalPda,
        verifiedProgress: verifiedProgressPda,
      })
      .rpc();

    await waitUntilAfter(provider, deadline.toNumber());

    await program.methods
      .verifyGoal(true)
      .accounts({
        verifier,
        config: configPda,
        goal: goalPda,
        verifiedProgress: verifiedProgressPda,
      })
      .rpc();

    const vaultBefore = await provider.connection.getBalance(vaultPda);

    await program.methods
      .settleGoal()
      .accounts({
        caller: owner1.publicKey,
        owner: owner1.publicKey,
        recipientWallet: recipient.publicKey,
        goal: goalPda,
        vault: vaultPda,
      })
      .signers([owner1])
      .rpc();

    const vaultAfter = await provider.connection.getBalance(vaultPda);
    assert.isTrue(vaultAfter < vaultBefore, "stake should leave the vault");
  });

  it("routes failed goal funds to the recipient and blocks double settlement", async () => {
    const goalId = new anchor.BN(2);
    const stake = new anchor.BN(0.15 * anchor.web3.LAMPORTS_PER_SOL);
    const targetTotal = new anchor.BN(50);
    const now = Math.floor(Date.now() / 1000);
    const deadline = new anchor.BN(now + 3);
    const claimWindow = new anchor.BN(3600);

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
    const metadata = goalMetadataArgs("Failed route");

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
        recipientWallet: recipient.publicKey,
        recipientRegistry: recipientPda,
        goal: goalPda,
        vault: vaultPda,
        verifiedProgress: verifiedProgressPda,
        goalMetadata: goalMetadataPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner2])
      .rpc();

    await waitUntilAfter(provider, deadline.toNumber());

    await program.methods
      .verifyGoal(false)
      .accounts({
        verifier,
        config: configPda,
        goal: goalPda,
        verifiedProgress: verifiedProgressPda,
      })
      .rpc();

    const recipientBefore = await provider.connection.getBalance(
      recipient.publicKey
    );

    await program.methods
      .settleGoal()
      .accounts({
        caller: randomCaller.publicKey,
        owner: owner2.publicKey,
        recipientWallet: recipient.publicKey,
        goal: goalPda,
        vault: vaultPda,
      })
      .signers([randomCaller])
      .rpc();

    const recipientAfter = await provider.connection.getBalance(
      recipient.publicKey
    );
    assert.isTrue(
      recipientAfter > recipientBefore,
      "recipient should receive funds"
    );

    let threw = false;
    try {
      await program.methods
        .settleGoal()
        .accounts({
          caller: randomCaller.publicKey,
          owner: owner2.publicKey,
          recipientWallet: recipient.publicKey,
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

  it("rotates the verifier and archives recipients after deactivation", async () => {
    await program.methods
      .updateVerifier(newVerifier.publicKey)
      .accounts({
        admin: admin.publicKey,
        config: configPda,
      })
      .rpc();

    const configAccount = await program.account.config.fetch(configPda);
    assert.isTrue(
      configAccount.verifier.equals(newVerifier.publicKey),
      "verifier should rotate"
    );

    const goalId = new anchor.BN(3);
    const stake = new anchor.BN(0.1 * anchor.web3.LAMPORTS_PER_SOL);
    const targetTotal = new anchor.BN(12);
    const now = Math.floor(Date.now() / 1000);
    const deadline = new anchor.BN(now + 3);
    const claimWindow = new anchor.BN(3600);

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
    const metadata = goalMetadataArgs("Verifier rotation");

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
        recipientWallet: recipient.publicKey,
        recipientRegistry: recipientPda,
        goal: goalPda,
        vault: vaultPda,
        verifiedProgress: verifiedProgressPda,
        goalMetadata: goalMetadataPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner1])
      .rpc();

    await waitUntilAfter(provider, deadline.toNumber());

    let oldVerifierRejected = false;
    try {
      await program.methods
        .verifyGoal(true)
        .accounts({
          verifier,
          config: configPda,
          goal: goalPda,
          verifiedProgress: verifiedProgressPda,
        })
        .rpc();
    } catch {
      oldVerifierRejected = true;
    }

    assert.isTrue(oldVerifierRejected, "old verifier must be rejected");

    await program.methods
      .submitVerifiedProgress(
        new anchor.BN(12),
        Array.from(Buffer.alloc(32, 3)),
        2
      )
      .accounts({
        verifier: newVerifier.publicKey,
        config: configPda,
        goal: goalPda,
        verifiedProgress: verifiedProgressPda,
      })
      .signers([newVerifier])
      .rpc();

    await program.methods
      .verifyGoal(true)
      .accounts({
        verifier: newVerifier.publicKey,
        config: configPda,
        goal: goalPda,
        verifiedProgress: verifiedProgressPda,
      })
      .signers([newVerifier])
      .rpc();

    await program.methods
      .registerRecipient(1)
      .accounts({
        admin: admin.publicKey,
        config: configPda,
        recipientWallet: recipientTwo.publicKey,
        recipientRegistry: recipientTwoPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .setRecipientActive(false)
      .accounts({
        admin: admin.publicKey,
        config: configPda,
        recipientWallet: recipientTwo.publicKey,
        recipientRegistry: recipientTwoPda,
      })
      .rpc();

    const goalIdBlocked = new anchor.BN(4);
    const [blockedGoalPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("goal"),
        owner2.publicKey.toBuffer(),
        goalIdBlocked.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );
    const [blockedVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), blockedGoalPda.toBuffer()],
      program.programId
    );
    const [blockedVerifiedProgressPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("verified-progress"), blockedGoalPda.toBuffer()],
      program.programId
    );
    const [blockedGoalMetadataPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("goal-metadata"), blockedGoalPda.toBuffer()],
      program.programId
    );
    const blockedMetadata = goalMetadataArgs("Inactive recipient");

    let inactiveRejected = false;
    try {
      await program.methods
        .createGoal(
          goalIdBlocked,
          stake,
          targetTotal,
          deadline,
          claimWindow,
          blockedMetadata.durationDays,
          blockedMetadata.title,
          blockedMetadata.slug,
          blockedMetadata.description,
          blockedMetadata.targetLabel
        )
        .accounts({
          owner: owner2.publicKey,
          config: configPda,
          recipientWallet: recipientTwo.publicKey,
          recipientRegistry: recipientTwoPda,
          goal: blockedGoalPda,
          vault: blockedVaultPda,
          verifiedProgress: blockedVerifiedProgressPda,
          goalMetadata: blockedGoalMetadataPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner2])
        .rpc();
    } catch {
      inactiveRejected = true;
    }

    assert.isTrue(inactiveRejected, "inactive recipient should block deposits");

    await program.methods
      .archiveRecipient()
      .accounts({
        admin: admin.publicKey,
        config: configPda,
        recipientWallet: recipientTwo.publicKey,
        recipientRegistry: recipientTwoPda,
      })
      .rpc();

    const archivedRecipient = await program.account.recipientRegistry.fetch(
      recipientTwoPda
    );
    assert.isFalse(archivedRecipient.active, "archived recipient should stay inactive");
    assert.isAtLeast(Number(archivedRecipient.kind), 128, "archive flag should be set");

    await program.methods
      .registerRecipient(1)
      .accounts({
        admin: admin.publicKey,
        config: configPda,
        recipientWallet: recipientTwo.publicKey,
        recipientRegistry: recipientTwoPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const reRegisteredRecipient = await program.account.recipientRegistry.fetch(
      recipientTwoPda
    );
    assert.isTrue(
      reRegisteredRecipient.wallet.equals(recipientTwo.publicKey),
      "same wallet should be reusable after archive",
    );
    assert.isTrue(reRegisteredRecipient.active, "re-registered recipient should be active");
    assert.equal(Number(reRegisteredRecipient.kind), 1, "archive flag should clear on re-register");
  });
});
