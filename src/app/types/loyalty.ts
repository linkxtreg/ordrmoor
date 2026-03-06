export type LoyaltyProgram = {
  name: string;
  rewardDescription: string;
  visitsNeeded: number;
  active: boolean;
  stampSvg: string;
  stampSeed: number;
  createdAt: string;
};

export type LoyaltyProgramInput = {
  name: string;
  rewardDescription: string;
  visitsNeeded: number;
  active: boolean;
};

export type LoyaltyStats = {
  totalEnrolled: number;
  visitsThisMonth: number;
  rewardsThisMonth: number;
};

export type PublicLoyaltyProgram = {
  name: string;
  rewardDescription: string;
  visitsNeeded: number;
  active: boolean;
};

export type CheckInResult = {
  visitCount: number;
  visitsNeeded: number;
  rewardUnlocked: boolean;
  rewardUnlockedAt: string | null;
  stampSvg: string | null;
  alreadyCheckedInToday: boolean;
  isNewCustomer: boolean;
  programName: string;
  rewardDescription: string;
};
