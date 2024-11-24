export type UserTotals = {
  totalDistance: number;
  totalElevation: number;
  totalMovingTime: number;
  totalActivities: number;
  totalKudos: number;
  user: {
    username: string;
    stravaId: string;
    profilePicture: string;
  };
};

export type TeamStatsPerMonth = {
  month: string;
  totalDistance: number;
  totalElevation: number;
  totalMovingTime: number;
  totalActivities: number;
};