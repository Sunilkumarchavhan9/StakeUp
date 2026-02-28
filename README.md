# Sports Goal Stake Vault

Custom Anchor vault program for a sports commitment product where a player stakes SOL against a goal.

If the goal is completed and verified, the player can reclaim the stake. If the goal fails, or a completed goal is not claimed within the claim window, the stake is routed to a pre-registered charity or franchise wallet. Settlement can happen only once.

## Program

- Program name: `onchain`
- Devnet Program ID: `3HfJzm3qJawEJJhrFFn8aYSVYS8qT2B4s5JviAAyE6MB`
- Deploy signature: `2XpQWzn39dpmmMHmE5M36sZyD2Fb5qQgSuajzYnNc7yc3v493R1AMmFoiRb8gaBgBVXKvFBcwciQUVAS4RsbQ83T`

## Core Constraint Logic

This vault combines three constraints:

1. Time-based restriction
   - A goal cannot be verified before `deadline_ts`.

2. Condition-based release
   - `Completed` -> stake is refunded to the owner if claimed before `verified_at + claim_window_secs`.
   - `Failed` -> stake is sent to the registered recipient wallet.
   - `Pending` after `deadline_ts + claim_window_secs` -> the goal can be force-settled as failed and routed to the recipient wallet.

3. One-time settlement
   - Once `settled = true`, no future settlement is allowed.

## PDA Design

The program uses multiple PDAs:

- `config`
  - Seeds: `["config"]`
  - Stores admin and verifier authority.

- `recipient_registry`
  - Seeds: `["recipient", recipient_wallet]`
  - Stores approved charity or franchise recipients.

- `goal`
  - Seeds: `["goal", owner, goal_id]`
  - Stores goal state, deadline, stake, status, settlement state, and recipient mapping.

- `vault`
  - Seeds: `["vault", goal]`
  - Holds the lamports locked for the goal.

## Instructions

- `initialize_platform`
  - Initializes platform config and verifier authority.

- `register_recipient`
  - Registers an allowed recipient wallet as either charity or franchise.

- `create_goal`
  - Creates a goal account and vault PDA, then transfers the player's stake into the vault.

- `verify_goal`
  - Verifier marks the goal as completed or failed after the deadline.

- `settle_goal`
  - Moves the vault funds according to status and claim-window rules.

- `close_vault`
  - Closes the vault account after settlement.

## Tests

Passing test coverage:

- refunds the owner for a completed goal
- routes failed goal funds to the recipient and blocks double settlement
- rotates the verifier and archives recipients after deactivation

Run:

```bash
anchor test
```

Latest passing output:

```text
onchain
  ✔ refunds the owner for a completed goal
  ✔ routes failed goal funds to the recipient and blocks double settlement
  ✔ rotates the verifier and archives recipients after deactivation

3 passing
```

Passing test screenshot:

![Passing Anchor tests](../stakeup.png)

## Build and Deploy

Build:

```bash
anchor build
```

Deploy to devnet:

```bash
solana config set --url devnet
anchor deploy --provider.cluster devnet
```

## Files

- Program: `programs/onchain/src/lib.rs`
- Tests: `tests/onchain.ts`
- Config: `Anchor.toml`
