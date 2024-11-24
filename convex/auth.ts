import Strava from "@auth/core/providers/strava";
import { convexAuth } from "@convex-dev/auth/server";
import { api } from "../convex/_generated/api";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Strava({
      authorization: {
        params: {
          scope: "read,activity:read",
        },
      },
      profile: (profile, tokens) => {
        console.log("Strava profile", profile);
        return {
          id: String(profile.id),
          userName: profile.username ?? profile.firstname ?? "Unknown",
          firstName: profile.firstname ?? "",
          lastName: profile.lastname ?? "",
          name: profile.firstname ?? "",
          image: profile.profile ?? "",
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expires_at,
        };
      },
    }),
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId }) {
      ctx.scheduler.runAfter(100, api.strava.stats.saveUserStats, { userId });
    },
  },
});
