import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "check for new activities",
  { hourUTC: 0, minuteUTC: 0 },
  internal.strava.stats.refreshAllStats
);

export default crons;