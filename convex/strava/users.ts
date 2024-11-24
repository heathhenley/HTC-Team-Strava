import {
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { v } from "convex/values";


export const saveNewToken = internalMutation({
  args: {
    userId: v.id("users"),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, { userId, accessToken, refreshToken, expiresAt }) => {
    ctx.db.patch(userId, {
      accessToken,
      refreshToken,
      expiresAt,
    });
  },
});

export const getAllUsers = internalQuery({
  handler: async (ctx) => {
    return ctx.db.query("users").collect();
  },
});