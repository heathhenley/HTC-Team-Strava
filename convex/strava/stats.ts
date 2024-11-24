import {
  action,
  query,
  internalQuery,
  internalMutation,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

import { UserTotals, TeamStatsPerMonth } from "../../shared/types";

// get the timestamp for October 15st 2024
const HTC_START = new Date("2024-10-15").getTime();
const ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities";
const metersToMiles = 0.000621371;
const metersToFeet = 3.28084;
const secondsToHours = 1 / 3600;


export const getTeamStatsPerMonth = query({
  args: {},
  handler: async (ctx): Promise<TeamStatsPerMonth[]> => {
    // get the team stats but aggregated by month
    const startDate = new Date(HTC_START);
    const currentDate = new Date(Date.now());

    let activites = await ctx.db.query("activities").collect();
    let teamStats = [];

    let currDate = new Date(startDate);
    while (
      currDate.getMonth() <= currentDate.getMonth() ||
      currDate.getFullYear() !== currentDate.getFullYear()
    ) {
      // aggregate the activies for the current month
      const monthActivities = activites.filter((activity) => {
        const activityDate = new Date(
          activity.startDate ?? activity._creationTime
        );
        return (
          activityDate.getMonth() === currDate.getMonth() &&
          activityDate.getFullYear() === currDate.getFullYear()
        );
      });

      const monthStats = monthActivities.reduce(
        (acc, activity) => {
          return {
            totalDistance: acc.totalDistance + (activity.distance ?? 0),
            totalElevation: acc.totalElevation + (activity.elevation ?? 0),
            totalMovingTime: acc.totalMovingTime + (activity.movingTime ?? 0),
            totalActivities: acc.totalActivities + 1,
          };
        },
        {
          totalDistance: 0,
          totalElevation: 0,
          totalMovingTime: 0,
          totalActivities: 0,
        }
      );

      teamStats.push({
        month: currDate.toLocaleString("default", { month: "long" }),
        totalDistance: monthStats.totalDistance * metersToMiles,
        totalElevation: monthStats.totalElevation * metersToFeet,
        totalMovingTime: monthStats.totalMovingTime * secondsToHours,
        totalActivities: monthStats.totalActivities,
      });
  
      currDate.setMonth(currDate.getMonth() + 1);
    }
    return teamStats;
  },
});

// Get the users activities from the strava api
async function getActivities({
  accessToken,
  statsGatheredAt,
}: {
  accessToken: string;
  statsGatheredAt?: number;
}): Promise<UserTotals[]> {
  const after = statsGatheredAt ? statsGatheredAt / 1000 : HTC_START / 1000;
  const url = `${ACTIVITIES_URL}?after=${after}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ContentType: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to get activities");
  }
  return response.json();
}

export const getAllStats = query({
  args: {},
  handler: async (ctx) : Promise<UserTotals> => {
    // TODO: I don't think there's a way to join

    // get the stats
    const allStats = ctx.db.query("stats").collect();

    // get the users
    const allUsers = ctx.db.query("users").collect();

    // get the users associated account ids (to make a link)
    const accountIds = await ctx.db.query("authAccounts").collect();

    const [stats, users] = await Promise.all([allStats, allUsers]);

    // join the stats and users
    const statsWithUsers = stats.map((stat) => {
      const user = users.find((u) => u._id === stat.userId);
      const stravaId = accountIds.find(
        (a) => a.userId === stat.userId
      )?.providerAccountId;
      return {
        user: {
          stravaId: stravaId,
          username: user?.userName ?? "Unknown",
          profilePicture: user?.image ?? "",
        },
        totalDistance: (stat.totalDistance ?? 0) * metersToMiles,
        totalElevation: (stat.totalElevation ?? 0) * metersToFeet,
        totalMovingTime: (stat.totalMovingTime ?? 0) * secondsToHours,
        totalActivities: stat.totalActivities ?? 0,
      };
    });
    return statsWithUsers;
  },
});

export const getUserData = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return ctx.db.get(userId);
  },
});

export const saveUserStats = action({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // Get the users access, refresh tokens and expiry time
    const user = await ctx.runQuery(internal.strava.stats.getUserData, {
      userId,
    });

    if (!user) {
      throw new Error("User not found");
    }

    const { statsGatheredAt, accessToken, refreshToken, expiresAt } = user;

    if (!accessToken || !refreshToken || !expiresAt) {
      throw new Error("User not found");
    }

    // if the access token has expired, refresh it
    if (expiresAt < Date.now()) {
      // refresh the access token using the refresh token
      const response = await fetch(
        "https://www.strava.com/api/v3/oauth/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: Number(process.env.AUTH_STRAVA_ID),
            client_secret: process.env.AUTH_STRAVA_SECRET,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
        }
      );
      const data = await response.json();
      if (!data.access_token) {
        throw new Error("Failed to refresh token");
      }
      if (!data.expires_at || !data.access_token) {
        throw new Error("Failed to refresh token");
      }
      // update the users access token
      await ctx.runMutation(internal.strava.users.saveNewToken, {
        userId,
        accessToken: data.access_token as string,
        expiresAt: data.expires_at as number,
        refreshToken: data.refresh_token as string,
      });
    }

    // Get the users activities from the strava api
    const activities = await getActivities({ accessToken, statsGatheredAt });

    // use and internal mutation to save new activities
    await ctx.runMutation(internal.strava.stats.saveActivities, {
      userId,
      activities,
    });

    return { status: "Stats gathered!" };
  },
});

export const saveActivities = internalMutation({
  args: { userId: v.id("users"), activities: v.any() },
  handler: async (ctx, { userId, activities }) => {
    const usersActivities = await ctx.db
      .query("activities")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    // get the ids of the users activities
    const usersActivityIds = usersActivities.map((activity) => activity.id);

    // create a new activity if it doesn't already exist
    for (const activity of activities) {
      if (!activity.type || !activity.distance || !activity.moving_time) {
        continue;
      }
      if (!["Hike", "Walk", "Run"].includes(activity.type)) {
        continue;
      }
      if (usersActivityIds.includes(activity.id)) {
        continue;
      }

      // new activity
      await ctx.db.insert("activities", {
        id: activity.id,
        distance: activity.distance,
        movingTime: activity.moving_time,
        elevation: activity.total_elevation_gain,
        type: activity.type,
        userId,
        sufferScore: activity.suffer_score,
        kudosCount: activity.kudos_count,
        startDate: new Date(activity.start_date).getTime(),
      });
      // update the users stats
      await ctx.runMutation(internal.strava.stats.updateStats, {
        userId,
        totalDistance: activity.distance,
        totalElevation: activity.total_elevation_gain,
        totalMovingTime: activity.moving_time,
        totalActivities: 1,
      });
    }
  },
});

export const updateStats = internalMutation({
  args: {
    userId: v.id("users"),
    totalDistance: v.number(),
    totalElevation: v.number(),
    totalMovingTime: v.number(),
    totalActivities: v.number(),
  },
  handler: async (
    ctx,
    { userId, totalDistance, totalElevation, totalMovingTime, totalActivities }
  ) => {
    const stats = await ctx.db
      .query("stats")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    await ctx.db.patch(userId, { statsGatheredAt: Date.now() });

    // add to the running stats total if exists, otherwise create a new one
    if (stats) {
      return await ctx.db.patch(stats._id, {
        totalDistance: (stats.totalDistance ?? 0) + totalDistance,
        totalElevation: (stats.totalElevation ?? 0) + totalElevation,
        totalMovingTime: (stats.totalMovingTime ?? 0) + totalMovingTime,
        totalActivities: (stats.totalActivities ?? 0) + totalActivities,
        userId,
      });
    }
    return await ctx.db.insert("stats", {
      totalDistance,
      totalElevation,
      totalMovingTime,
      totalActivities,
      userId,
    });
  },
});
