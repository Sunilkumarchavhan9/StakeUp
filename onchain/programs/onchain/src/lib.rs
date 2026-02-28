use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("3HfJzm3qJawEJJhrFFn8aYSVYS8qT2B4s5JviAAyE6MB");

const STATUS_PENDING: u8 = 0;
const STATUS_COMPLETED: u8 = 1;
const STATUS_FAILED: u8 = 2;

const RECIPIENT_CHARITY: u8 = 0;
const RECIPIENT_FRANCHISE: u8 = 1;
const RECIPIENT_ARCHIVED_FLAG: u8 = 1 << 7;
const VERIFIED_SOURCE_DEVICE_APP: u8 = 1;
const VERIFIED_SOURCE_WEARABLE: u8 = 2;
const VERIFIED_SOURCE_OFFICIAL_API: u8 = 3;

#[program]
pub mod onchain {
    use super::*;

    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        verifier: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.verifier = verifier;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn register_recipient(ctx: Context<RegisterRecipient>, kind: u8) -> Result<()> {
        require!(
            kind == RECIPIENT_CHARITY || kind == RECIPIENT_FRANCHISE,
            VaultError::InvalidRecipientKind
        );

        let rec = &mut ctx.accounts.recipient_registry;
        rec.wallet = ctx.accounts.recipient_wallet.key();
        rec.kind = kind;
        rec.active = true;
        rec.bump = ctx.bumps.recipient_registry;
        Ok(())
    }

    pub fn update_verifier(
        ctx: Context<UpdateVerifier>,
        new_verifier: Pubkey,
    ) -> Result<()> {
        ctx.accounts.config.verifier = new_verifier;
        Ok(())
    }

    pub fn set_recipient_active(
        ctx: Context<SetRecipientActive>,
        active: bool,
    ) -> Result<()> {
        require!(
            !active || !recipient_is_archived(ctx.accounts.recipient_registry.kind),
            VaultError::RecipientArchived
        );
        ctx.accounts.recipient_registry.active = active;
        Ok(())
    }

    pub fn archive_recipient(ctx: Context<ArchiveRecipient>) -> Result<()> {
        let recipient_registry = &mut ctx.accounts.recipient_registry;

        require!(
            !recipient_registry.active,
            VaultError::RecipientMustBeInactive
        );
        recipient_registry.kind |= RECIPIENT_ARCHIVED_FLAG;
        Ok(())
    }

    #[allow(clippy::too_many_arguments)]
    pub fn create_goal(
        ctx: Context<CreateGoal>,
        goal_id: u64,
        stake_lamports: u64,
        target_total: u64,
        deadline_ts: i64,
        claim_window_secs: i64,
        duration_days: u16,
        title: String,
        slug: String,
        description: String,
        target_label: String,
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        require!(stake_lamports > 0, VaultError::InvalidAmount);
        require!(target_total > 0, VaultError::InvalidTargetTotal);
        require!(deadline_ts > now, VaultError::InvalidDeadline);
        require!(claim_window_secs > 0, VaultError::InvalidClaimWindow);
        require!(
            !title.is_empty() && title.len() <= 64,
            VaultError::InvalidGoalTitle
        );
        require!(
            !slug.is_empty() && slug.len() <= 64,
            VaultError::InvalidGoalSlug
        );
        require!(
            !description.is_empty() && description.len() <= 280,
            VaultError::InvalidGoalDescription
        );
        require!(
            !target_label.is_empty() && target_label.len() <= 16,
            VaultError::InvalidTargetLabel
        );
        require!(duration_days > 0, VaultError::InvalidDurationDays);
        require!(
            ctx.accounts.recipient_registry.active,
            VaultError::RecipientInactive
        );
        require!(
            !recipient_is_archived(ctx.accounts.recipient_registry.kind),
            VaultError::RecipientArchived
        );

        let goal = &mut ctx.accounts.goal;
        goal.owner = ctx.accounts.owner.key();
        goal.goal_id = goal_id;
        goal.stake_lamports = stake_lamports;
        goal.target_total = target_total;
        goal.current_progress = 0;
        goal.check_in_count = 0;
        goal.last_check_in_at = 0;
        goal.deadline_ts = deadline_ts;
        goal.claim_window_secs = claim_window_secs;
        goal.status = STATUS_PENDING;
        goal.verified_at = 0;
        goal.settled = false;
        goal.settled_at = 0;
        goal.recipient_wallet = ctx.accounts.recipient_wallet.key();
        goal.vault = ctx.accounts.vault.key();
        goal.final_destination = Pubkey::default();
        goal.bump = ctx.bumps.goal;

        let vault = &mut ctx.accounts.vault;
        vault.goal = goal.key();
        vault.bump = ctx.bumps.vault;

        let verified_progress = &mut ctx.accounts.verified_progress;
        verified_progress.goal = goal.key();
        verified_progress.verified_progress = 0;
        verified_progress.verified_check_in_count = 0;
        verified_progress.last_verified_at = 0;
        verified_progress.last_source = 0;
        verified_progress.last_proof_hash = [0; 32];
        verified_progress.bump = ctx.bumps.verified_progress;

        let goal_metadata = &mut ctx.accounts.goal_metadata;
        goal_metadata.goal = goal.key();
        goal_metadata.title = title;
        goal_metadata.slug = slug;
        goal_metadata.description = description;
        goal_metadata.target_label = target_label;
        goal_metadata.duration_days = duration_days;
        goal_metadata.bump = ctx.bumps.goal_metadata;

        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.owner.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            stake_lamports,
        )?;

        Ok(())
    }

    pub fn submit_progress(
        ctx: Context<SubmitProgress>,
        progress_amount: u64,
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let goal = &mut ctx.accounts.goal;

        require!(progress_amount > 0, VaultError::InvalidProgressAmount);
        require!(!goal.settled, VaultError::GoalAlreadySettled);
        require!(
            goal.status == STATUS_PENDING,
            VaultError::ProgressUpdatesClosed
        );
        require!(now <= goal.deadline_ts, VaultError::GoalDeadlinePassed);

        let next_progress = goal
            .current_progress
            .checked_add(progress_amount)
            .ok_or(VaultError::MathOverflow)?;

        require!(
            next_progress <= goal.target_total,
            VaultError::ProgressExceedsTarget
        );

        goal.current_progress = next_progress;
        goal.check_in_count = goal
            .check_in_count
            .checked_add(1)
            .ok_or(VaultError::MathOverflow)?;
        goal.last_check_in_at = now;

        Ok(())
    }

    pub fn submit_verified_progress(
        ctx: Context<SubmitVerifiedProgress>,
        progress_amount: u64,
        proof_hash: [u8; 32],
        source_type: u8,
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let goal = &ctx.accounts.goal;
        let verified_progress = &mut ctx.accounts.verified_progress;

        require!(progress_amount > 0, VaultError::InvalidProgressAmount);
        require!(!goal.settled, VaultError::GoalAlreadySettled);
        require!(
            goal.status == STATUS_PENDING,
            VaultError::ProgressUpdatesClosed
        );
        require!(now <= goal.deadline_ts, VaultError::GoalDeadlinePassed);
        require!(
            source_type == VERIFIED_SOURCE_DEVICE_APP
                || source_type == VERIFIED_SOURCE_WEARABLE
                || source_type == VERIFIED_SOURCE_OFFICIAL_API,
            VaultError::InvalidVerifiedSource
        );

        let next_progress = verified_progress
            .verified_progress
            .checked_add(progress_amount)
            .ok_or(VaultError::MathOverflow)?;

        require!(
            next_progress <= goal.target_total,
            VaultError::VerifiedProgressExceedsTarget
        );

        verified_progress.verified_progress = next_progress;
        verified_progress.verified_check_in_count = verified_progress
            .verified_check_in_count
            .checked_add(1)
            .ok_or(VaultError::MathOverflow)?;
        verified_progress.last_verified_at = now;
        verified_progress.last_source = source_type;
        verified_progress.last_proof_hash = proof_hash;

        Ok(())
    }

    pub fn verify_goal(ctx: Context<VerifyGoal>, completed: bool) -> Result<()> {
        let goal = &mut ctx.accounts.goal;
        let now = Clock::get()?.unix_timestamp;

        require!(!goal.settled, VaultError::GoalAlreadySettled);
        require!(
            goal.status == STATUS_PENDING,
            VaultError::GoalAlreadyVerified
        );
        require!(now >= goal.deadline_ts, VaultError::TooEarlyToVerify);
        if completed {
            require!(
                ctx.accounts.verified_progress.verified_check_in_count > 0,
                VaultError::VerifiedProgressRequired
            );
        }

        goal.status = if completed {
            STATUS_COMPLETED
        } else {
            STATUS_FAILED
        };
        goal.verified_at = now;

        Ok(())
    }

    pub fn settle_goal(ctx: Context<SettleGoal>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let goal = &mut ctx.accounts.goal;

        require!(!goal.settled, VaultError::GoalAlreadySettled);
        require_keys_eq!(
            ctx.accounts.owner.key(),
            goal.owner,
            VaultError::InvalidOwner
        );
        require_keys_eq!(
            ctx.accounts.recipient_wallet.key(),
            goal.recipient_wallet,
            VaultError::InvalidRecipientWallet
        );

        if goal.status == STATUS_COMPLETED {
            require!(goal.verified_at > 0, VaultError::GoalNotVerified);
            let claim_deadline = goal
                .verified_at
                .checked_add(goal.claim_window_secs)
                .ok_or(VaultError::MathOverflow)?;

            if now <= claim_deadline {
                require_keys_eq!(
                    ctx.accounts.caller.key(),
                    goal.owner,
                    VaultError::OnlyOwnerCanClaimCompleted
                );
                move_lamports(
                    &ctx.accounts.vault.to_account_info(),
                    &ctx.accounts.owner.to_account_info(),
                    goal.stake_lamports,
                )?;
                goal.final_destination = goal.owner;
            } else {
                move_lamports(
                    &ctx.accounts.vault.to_account_info(),
                    &ctx.accounts.recipient_wallet.to_account_info(),
                    goal.stake_lamports,
                )?;
                goal.final_destination = goal.recipient_wallet;
            }
        } else if goal.status == STATUS_FAILED {
            move_lamports(
                &ctx.accounts.vault.to_account_info(),
                &ctx.accounts.recipient_wallet.to_account_info(),
                goal.stake_lamports,
            )?;
            goal.final_destination = goal.recipient_wallet;
        } else {
            let forced_fail_time = goal
                .deadline_ts
                .checked_add(goal.claim_window_secs)
                .ok_or(VaultError::MathOverflow)?;
            require!(now > forced_fail_time, VaultError::GoalNotSettleableYet);

            goal.status = STATUS_FAILED;
            move_lamports(
                &ctx.accounts.vault.to_account_info(),
                &ctx.accounts.recipient_wallet.to_account_info(),
                goal.stake_lamports,
            )?;
            goal.final_destination = goal.recipient_wallet;
        }

        goal.settled = true;
        goal.settled_at = now;

        Ok(())
    }

    pub fn close_vault(_ctx: Context<CloseVault>) -> Result<()> {
        Ok(())
    }
}

fn move_lamports(from: &AccountInfo<'_>, to: &AccountInfo<'_>, amount: u64) -> Result<()> {
    let from_balance = from.lamports();
    require!(
        from_balance >= amount,
        VaultError::InsufficientVaultBalance
    );

    **from.try_borrow_mut_lamports()? -= amount;
    **to.try_borrow_mut_lamports()? += amount;
    Ok(())
}

fn recipient_is_archived(kind: u8) -> bool {
    kind & RECIPIENT_ARCHIVED_FLAG != 0
}

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        seeds = [b"config"],
        bump,
        space = 8 + Config::LEN
    )]
    pub config: Account<'info, Config>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterRecipient<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin @ VaultError::UnauthorizedAdmin
    )]
    pub config: Account<'info, Config>,
    /// CHECK: stored in recipient registry and validated by PDA seeds
    pub recipient_wallet: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = admin,
        seeds = [b"recipient", recipient_wallet.key().as_ref()],
        bump,
        space = 8 + RecipientRegistry::LEN
    )]
    pub recipient_registry: Account<'info, RecipientRegistry>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateVerifier<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin @ VaultError::UnauthorizedAdmin
    )]
    pub config: Account<'info, Config>,
}

#[derive(Accounts)]
pub struct SetRecipientActive<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin @ VaultError::UnauthorizedAdmin
    )]
    pub config: Account<'info, Config>,
    /// CHECK: validated by PDA and stored key match
    pub recipient_wallet: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [b"recipient", recipient_wallet.key().as_ref()],
        bump = recipient_registry.bump,
        constraint = recipient_registry.wallet == recipient_wallet.key() @ VaultError::InvalidRecipientWallet
    )]
    pub recipient_registry: Account<'info, RecipientRegistry>,
}

#[derive(Accounts)]
pub struct ArchiveRecipient<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin @ VaultError::UnauthorizedAdmin
    )]
    pub config: Account<'info, Config>,
    /// CHECK: validated by PDA and stored key match
    pub recipient_wallet: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [b"recipient", recipient_wallet.key().as_ref()],
        bump = recipient_registry.bump,
        constraint = recipient_registry.wallet == recipient_wallet.key() @ VaultError::InvalidRecipientWallet
    )]
    pub recipient_registry: Account<'info, RecipientRegistry>,
}

#[derive(Accounts)]
#[instruction(goal_id: u64)]
pub struct CreateGoal<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    /// CHECK: must match registered recipient wallet
    pub recipient_wallet: UncheckedAccount<'info>,
    #[account(
        seeds = [b"recipient", recipient_wallet.key().as_ref()],
        bump = recipient_registry.bump,
        constraint = recipient_registry.wallet == recipient_wallet.key() @ VaultError::InvalidRecipientWallet
    )]
    pub recipient_registry: Account<'info, RecipientRegistry>,
    #[account(
        init,
        payer = owner,
        seeds = [b"goal", owner.key().as_ref(), &goal_id.to_le_bytes()],
        bump,
        space = 8 + Goal::LEN
    )]
    pub goal: Account<'info, Goal>,
    #[account(
        init,
        payer = owner,
        seeds = [b"vault", goal.key().as_ref()],
        bump,
        space = 8 + Vault::LEN
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        init,
        payer = owner,
        seeds = [b"verified-progress", goal.key().as_ref()],
        bump,
        space = 8 + VerifiedProgress::LEN
    )]
    pub verified_progress: Account<'info, VerifiedProgress>,
    #[account(
        init,
        payer = owner,
        seeds = [b"goal-metadata", goal.key().as_ref()],
        bump,
        space = 8 + GoalMetadata::INIT_SPACE
    )]
    pub goal_metadata: Account<'info, GoalMetadata>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitProgress<'info> {
    pub owner: Signer<'info>,
    #[account(
        mut,
        has_one = owner @ VaultError::InvalidOwner
    )]
    pub goal: Account<'info, Goal>,
}

#[derive(Accounts)]
pub struct VerifyGoal<'info> {
    pub verifier: Signer<'info>,
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        has_one = verifier @ VaultError::UnauthorizedVerifier
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub goal: Account<'info, Goal>,
    #[account(
        seeds = [b"verified-progress", goal.key().as_ref()],
        bump = verified_progress.bump,
        constraint = verified_progress.goal == goal.key() @ VaultError::InvalidVerifiedProgressAccount
    )]
    pub verified_progress: Account<'info, VerifiedProgress>,
}

#[derive(Accounts)]
pub struct SubmitVerifiedProgress<'info> {
    pub verifier: Signer<'info>,
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        has_one = verifier @ VaultError::UnauthorizedVerifier
    )]
    pub config: Account<'info, Config>,
    pub goal: Account<'info, Goal>,
    #[account(
        mut,
        seeds = [b"verified-progress", goal.key().as_ref()],
        bump = verified_progress.bump,
        constraint = verified_progress.goal == goal.key() @ VaultError::InvalidVerifiedProgressAccount
    )]
    pub verified_progress: Account<'info, VerifiedProgress>,
}

#[derive(Accounts)]
pub struct SettleGoal<'info> {
    pub caller: Signer<'info>,
    /// CHECK: must equal goal.owner
    #[account(mut)]
    pub owner: UncheckedAccount<'info>,
    /// CHECK: must equal goal.recipient_wallet
    #[account(mut)]
    pub recipient_wallet: UncheckedAccount<'info>,
    #[account(mut, has_one = vault @ VaultError::InvalidVault)]
    pub goal: Account<'info, Goal>,
    #[account(
        mut,
        seeds = [b"vault", goal.key().as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
}

#[derive(Accounts)]
pub struct CloseVault<'info> {
    pub caller: Signer<'info>,
    #[account(
        mut,
        address = goal.owner @ VaultError::InvalidOwner
    )]
    /// CHECK: owner receives closed account rent
    pub owner: UncheckedAccount<'info>,
    #[account(
        mut,
        has_one = vault @ VaultError::InvalidVault,
        has_one = owner @ VaultError::InvalidOwner,
        constraint = goal.settled @ VaultError::GoalNotSettled
    )]
    pub goal: Account<'info, Goal>,
    #[account(
        mut,
        seeds = [b"vault", goal.key().as_ref()],
        bump = vault.bump,
        close = owner
    )]
    pub vault: Account<'info, Vault>,
}

#[account]
pub struct Config {
    pub admin: Pubkey,
    pub verifier: Pubkey,
    pub bump: u8,
}

impl Config {
    pub const LEN: usize = 32 + 32 + 1;
}

#[account]
pub struct RecipientRegistry {
    pub wallet: Pubkey,
    pub kind: u8,
    pub active: bool,
    pub bump: u8,
}

impl RecipientRegistry {
    pub const LEN: usize = 32 + 1 + 1 + 1;
}

#[account]
pub struct Goal {
    pub owner: Pubkey,
    pub goal_id: u64,
    pub stake_lamports: u64,
    pub target_total: u64,
    pub current_progress: u64,
    pub check_in_count: u32,
    pub last_check_in_at: i64,
    pub deadline_ts: i64,
    pub claim_window_secs: i64,
    pub status: u8,
    pub verified_at: i64,
    pub settled: bool,
    pub settled_at: i64,
    pub recipient_wallet: Pubkey,
    pub vault: Pubkey,
    pub final_destination: Pubkey,
    pub bump: u8,
}

impl Goal {
    pub const LEN: usize =
        32 + 8 + 8 + 8 + 8 + 4 + 8 + 8 + 8 + 1 + 8 + 1 + 8 + 32 + 32 + 32 + 1;
}

#[account]
#[derive(InitSpace)]
pub struct GoalMetadata {
    pub goal: Pubkey,
    #[max_len(64)]
    pub title: String,
    #[max_len(64)]
    pub slug: String,
    #[max_len(280)]
    pub description: String,
    #[max_len(16)]
    pub target_label: String,
    pub duration_days: u16,
    pub bump: u8,
}

#[account]
pub struct Vault {
    pub goal: Pubkey,
    pub bump: u8,
}

impl Vault {
    pub const LEN: usize = 32 + 1;
}

#[account]
pub struct VerifiedProgress {
    pub goal: Pubkey,
    pub verified_progress: u64,
    pub verified_check_in_count: u32,
    pub last_verified_at: i64,
    pub last_source: u8,
    pub last_proof_hash: [u8; 32],
    pub bump: u8,
}

impl VerifiedProgress {
    pub const LEN: usize = 32 + 8 + 4 + 8 + 1 + 32 + 1;
}

#[error_code]
pub enum VaultError {
    #[msg("Unauthorized admin")]
    UnauthorizedAdmin,
    #[msg("Unauthorized verifier")]
    UnauthorizedVerifier,
    #[msg("Invalid recipient kind")]
    InvalidRecipientKind,
    #[msg("Recipient is inactive")]
    RecipientInactive,
    #[msg("Recipient is archived")]
    RecipientArchived,
    #[msg("Recipient must be inactive before archive")]
    RecipientMustBeInactive,
    #[msg("Recipient is already archived")]
    RecipientAlreadyArchived,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid deadline")]
    InvalidDeadline,
    #[msg("Invalid claim window")]
    InvalidClaimWindow,
    #[msg("Invalid target total")]
    InvalidTargetTotal,
    #[msg("Invalid goal title")]
    InvalidGoalTitle,
    #[msg("Invalid goal slug")]
    InvalidGoalSlug,
    #[msg("Invalid goal description")]
    InvalidGoalDescription,
    #[msg("Invalid target label")]
    InvalidTargetLabel,
    #[msg("Invalid duration in days")]
    InvalidDurationDays,
    #[msg("Invalid progress amount")]
    InvalidProgressAmount,
    #[msg("Invalid verified source")]
    InvalidVerifiedSource,
    #[msg("Goal already settled")]
    GoalAlreadySettled,
    #[msg("Goal already verified")]
    GoalAlreadyVerified,
    #[msg("Too early to verify")]
    TooEarlyToVerify,
    #[msg("Goal not verified")]
    GoalNotVerified,
    #[msg("Goal is not settleable yet")]
    GoalNotSettleableYet,
    #[msg("Goal deadline has passed")]
    GoalDeadlinePassed,
    #[msg("Progress updates are closed for this goal")]
    ProgressUpdatesClosed,
    #[msg("Progress exceeds the goal target")]
    ProgressExceedsTarget,
    #[msg("Verified progress exceeds the goal target")]
    VerifiedProgressExceedsTarget,
    #[msg("Verified progress evidence is required before completing the goal")]
    VerifiedProgressRequired,
    #[msg("Only owner can claim completed goal within claim window")]
    OnlyOwnerCanClaimCompleted,
    #[msg("Invalid recipient wallet")]
    InvalidRecipientWallet,
    #[msg("Invalid owner")]
    InvalidOwner,
    #[msg("Invalid vault")]
    InvalidVault,
    #[msg("Invalid verified progress account")]
    InvalidVerifiedProgressAccount,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Insufficient vault balance")]
    InsufficientVaultBalance,
    #[msg("Goal not settled")]
    GoalNotSettled,
}
