import {
  action,
  query,
  internalQuery,
  internalMutation,
  internalAction,
} from "../_generated/server";
import { internal, api } from "../_generated/api";
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
}) {
  // this is not efficient, but gives us the chance to get any activities that
  // for some reason were missed
  /*const after = statsGatheredAt
    ? new Date(statsGatheredAt).getTime() / 1000
    : HTC_START / 1000; */
  console.log("statsGatheredAt", statsGatheredAt);
  const after = HTC_START / 1000;
  const url = `${ACTIVITIES_URL}?after=${after.toFixed(0)}&per_page=200`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ContentType: "application/json",
    },
  });
  if (!response.ok) {
    console.log(await response.text());
    throw new Error("Failed to get activities: " + response.status + " " + response.statusText);
  }
  return response.json();
}

export const getAllStats = query({
  args: {},
  handler: async (ctx): Promise<UserTotals[]> => {
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
          stravaId: stravaId ?? "",
          username: user?.firstName ?? user?.userName ?? "Unknown",
          profilePicture: user?.image ?? "",
        },
        totalDistance: (stat.totalDistance ?? 0) * metersToMiles,
        totalElevation: (stat.totalElevation ?? 0) * metersToFeet,
        totalMovingTime: (stat.totalMovingTime ?? 0) * secondsToHours,
        totalActivities: stat.totalActivities ?? 0,
        totalKudos: stat.totalKudos ?? 0,
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

export const refreshAllStats = internalAction({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.runQuery(internal.strava.users.getAllUsers);
    for (const user of users) {
      await ctx.scheduler.runAfter(0, api.strava.stats.saveUserStats, {
        userId: user._id,
      });
    }
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

    let validAccessToken = accessToken;

    // if the access token has expired, refresh it
    if (expiresAt * 1000 < Date.now()) {
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
      ctx.runMutation(internal.strava.users.saveNewToken, {
        userId,
        accessToken: data.access_token as string,
        expiresAt: data.expires_at as number,
        refreshToken: data.refresh_token as string,
      });

      // set the new access token
      validAccessToken = data.access_token;
    }

 
    // Get the users activities from the strava api
    const activities = await getActivities({
      accessToken: validAccessToken,
      statsGatheredAt
    });

    // use an internal mutation to save new activities
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
        console.log("skipping (missing time, type or distance):", activity?.type, activity?.sport_type, userId);
        continue;
      }
      if (!["Hike", "Walk", "Run", "Trail Run"].includes(activity.type)) {
        console.log("skipping:", activity.type, activity.sport_type, userId);
        continue;
      }
      if (usersActivityIds.includes(activity.id)) {
        // patch the activity - we were skipping but if the activity has
        // changed we should update it, not skip it - it's pssible that the
        // stats changed, there are more kudos etc
        const userActivity = usersActivities.find((a) => a.id === activity.id);
        if (!userActivity) {
          continue;
        }
        await ctx.db.patch(
          userActivity._id,
          {
            distance: activity.distance,
            movingTime: activity.moving_time,
            elevation: activity.total_elevation_gain,
            type: activity.type,
            sportType: activity.sport_type ?? activity.type ?? "",
            sufferScore: activity.suffer_score,
            kudosCount: activity.kudos_count,
            startDate: new Date(activity.start_date).getTime(),
          }
        );
      } else {
        // new activity
        await ctx.db.insert("activities", {
          id: activity.id,
          distance: activity.distance,
          movingTime: activity.moving_time,
          elevation: activity.total_elevation_gain,
          type: activity.type,
          sportType: activity.sport_type ?? activity.type ?? "",
          userId,
          sufferScore: activity.suffer_score,
          kudosCount: activity.kudos_count,
          startDate: new Date(activity.start_date).getTime(),
        });
      }
    }
    // update the users stats
    await ctx.runMutation(internal.strava.stats.updateStats, {
      userId,
    });
  },
});

export const updateStats = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const activities = await ctx.db
      .query("activities")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    await ctx.db.patch(userId, { statsGatheredAt: Date.now() });

    // calculate the users stats from the activities
    const totalDistance = activities.reduce((acc, activity) => {
      return acc + (activity.distance ?? 0);
    }, 0);
    const totalElevation = activities.reduce((acc, activity) => {
      return acc + (activity.elevation ?? 0);
    }, 0);
    const totalMovingTime = activities.reduce((acc, activity) => {
      return acc + (activity.movingTime ?? 0);
    }, 0);
    const totalKudos = activities.reduce((acc, activity) => {
      return acc + (activity.kudosCount ?? 0);
    }, 0);
    const totalActivities = activities.length;

    // get the users stats
    const stats = await ctx.db
      .query("stats")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    // add to the running stats total if exists, otherwise create a new one
    if (stats) {
      return await ctx.db.patch(stats._id, {
        totalDistance: totalDistance,
        totalElevation: totalElevation,
        totalMovingTime: totalMovingTime,
        totalActivities: totalActivities,
        totalKudos: totalKudos,
        userId,
      });
    }
    return await ctx.db.insert("stats", {
      totalDistance,
      totalElevation,
      totalMovingTime,
      totalActivities,
      totalKudos,
      userId,
    });
  },
});
