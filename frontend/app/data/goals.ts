export type GoalStatus = "Pending" | "Completed" | "Failed";

export type VerifierEvent = {
  label: string;
  date: string;
  status: "Pending" | "Done" | "Triggered";
};

export type GoalListItem = {
  templateId: number;
  title: string;
  detail: string;
  status: GoalStatus;
  slug: string;
  stake: string;
  deadline: string;
  description: string;
  targetLabel: string;
  targetTotal: number;
  currentValue: number;
  elapsedDays: number;
  durationDays: number;
  missedDays: number;
  charityName: string;
  watchers: number;
  streakPattern: number[];
  verifierEvents: VerifierEvent[];
};

const buildSlug = (title: string) =>
  title
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const rawGoals: Omit<GoalListItem, "slug">[] = [
  {
    templateId: 1,
    title: "Run 100km in 7 days",
    detail: "Stake 0.5 SOL · Deadline Mar 5",
    status: "Pending",
    stake: "0.5 SOL",
    deadline: "Mar 5, 2026",
    description:
      "Map structuring, hydration schedule, and pacing telemetry to stay on track for a 100km challenge.",
    targetLabel: "km",
    targetTotal: 100,
    currentValue: 42,
    elapsedDays: 4,
    durationDays: 7,
    missedDays: 2,
    charityName: "Save Animals Foundation",
    watchers: 3,
    streakPattern: [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1],
    verifierEvents: [
      { label: "Proof uploaded", date: "Mar 1", status: "Done" },
      { label: "Verifier pending", date: "Mar 2", status: "Pending" },
      { label: "Final verification", date: "Mar 5", status: "Pending" },
    ],
  },
  {
    templateId: 2,
    title: "Gym 12 sessions",
    detail: "Stake 0.8 SOL · Deadline Feb 15",
    status: "Completed",
    stake: "0.8 SOL",
    deadline: "Feb 15, 2026",
    description:
      "Strength routine focused on leg power, followed by stretching and verifier submissions for every 3 sessions.",
    targetLabel: "sessions",
    targetTotal: 12,
    currentValue: 12,
    elapsedDays: 14,
    durationDays: 14,
    missedDays: 1,
    charityName: "Youth Sports Fund",
    watchers: 5,
    streakPattern: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    verifierEvents: [
      { label: "Proof uploaded", date: "Feb 10", status: "Done" },
      { label: "Verifier approved", date: "Feb 15", status: "Done" },
      { label: "Vault released", date: "Feb 15", status: "Done" },
    ],
  },
  {
    templateId: 3,
    title: "Cycling 200km",
    detail: "Stake 0.4 SOL · Deadline Feb 20",
    status: "Failed",
    stake: "0.4 SOL",
    deadline: "Feb 20, 2026",
    description: "Route planning, checkpoints, and group verification for the 200km ride.",
    targetLabel: "km",
    targetTotal: 200,
    currentValue: 126,
    elapsedDays: 10,
    durationDays: 10,
    missedDays: 4,
    charityName: "Clean Oceans DAO",
    watchers: 2,
    streakPattern: [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1],
    verifierEvents: [
      { label: "Proof uploaded", date: "Feb 12", status: "Done" },
      { label: "Verifier rejected", date: "Feb 20", status: "Triggered" },
      { label: "Donation triggered", date: "Feb 20", status: "Triggered" },
    ],
  },
];

export const goalsList: GoalListItem[] = rawGoals.map((goal) => ({
  ...goal,
  slug: buildSlug(goal.title),
}));

export const getGoalBySlug = (slug: string) =>
  goalsList.find((goal) => goal.slug === slug);
