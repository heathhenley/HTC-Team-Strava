export type UserTotals = {
  totalDistance: number;
  totalElevation: number;
  totalMovingTime: number;
  totalActivities: number;
  user: {
    userName: string;
    stravaId: string;
  };
};

export type TeamStatsPerMonth = {
  month: string;
  totalDistance: number;
  totalElevation: number;
  totalMovingTime: number;
  totalActivities: number;
};