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
        return {
          id: String(profile.id),
          name: profile.firstname + " " + profile.lastname,
          userName: profile.username,
          firstName: profile.firstname,
          lastName: profile.lastname,
          image: profile.profile,
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
