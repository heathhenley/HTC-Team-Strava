import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
 
const schema = defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    id: v.optional(v.string()),
    image: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    userName: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    statsGatheredAt: v.optional(v.number()),
  }).index("id", ["id"]),

  stats: defineTable({
    totalDistance: v.optional(v.number()),
    totalElevation: v.optional(v.number()),
    totalMovingTime: v.optional(v.number()),
    totalActivities: v.optional(v.number()),
    userId: v.id("users"),
  }).index("userId", ["userId"]),

  activities: defineTable({
    id: v.optional(v.number()),
    distance: v.optional(v.number()),
    movingTime: v.optional(v.number()),
    elevation: v.optional(v.number()),
    type: v.optional(v.string()),
    userId: v.id("users"),
    sufferScore: v.optional(v.number()),
    kudosCount: v.optional(v.number()),
    startDate: v.optional(v.number()),
  }).index("userId", ["userId"]),
});
 
export default schema;