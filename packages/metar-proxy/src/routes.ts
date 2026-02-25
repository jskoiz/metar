/**
 * Route tier definitions for the metar-proxy X API gateway.
 *
 * Tiers:
 *   - Tier 1 ($0.05): Read operations — tweets, search, lists, spaces
 *   - Tier 2 ($0.10): User lookups, DMs, basic write operations (post tweet/list)
 *   - Tier 3 ($0.15): Social actions — follow, like, retweet, DM conversations
 */

export interface RouteDefinition {
  /** Express route pattern (under /x/2/...) */
  pattern: string;
  /** HTTP method */
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  /** Price tier label */
  tier: "read" | "user" | "action";
  /** Human-readable description */
  description: string;
  /** Route ID used in x402 payment headers */
  routeId: string;
}

// ─── Tier 1: $0.05 — Reads & Tweets ─────────────────────────────────────────

export const TIER_READ: RouteDefinition[] = [
  // Tweets
  { method: "GET",    pattern: "/x/2/tweets",                           tier: "read", routeId: "x:tweets:lookup",          description: "Look up tweets by IDs" },
  { method: "GET",    pattern: "/x/2/tweets/search/recent",             tier: "read", routeId: "x:tweets:search:recent",   description: "Search recent tweets" },
  { method: "GET",    pattern: "/x/2/tweets/search/all",                tier: "read", routeId: "x:tweets:search:all",      description: "Search all tweets (full archive)" },
  { method: "GET",    pattern: "/x/2/tweets/:id",                       tier: "read", routeId: "x:tweet:get",              description: "Get a single tweet by ID" },
  { method: "GET",    pattern: "/x/2/tweets/:id/quote_tweets",          tier: "read", routeId: "x:tweet:quote_tweets",     description: "Get quote tweets for a tweet" },
  { method: "GET",    pattern: "/x/2/tweets/:id/liking_users",          tier: "read", routeId: "x:tweet:liking_users",     description: "Get users who liked a tweet" },
  { method: "GET",    pattern: "/x/2/tweets/:id/retweeted_by",          tier: "read", routeId: "x:tweet:retweeted_by",     description: "Get users who retweeted a tweet" },
  // User timeline endpoints
  { method: "GET",    pattern: "/x/2/users/:id/tweets",                 tier: "read", routeId: "x:user:tweets",            description: "Get tweets by a user" },
  { method: "GET",    pattern: "/x/2/users/:id/mentions",               tier: "read", routeId: "x:user:mentions",          description: "Get mentions of a user" },
  // Lists
  { method: "GET",    pattern: "/x/2/lists/:id",                        tier: "read", routeId: "x:list:get",               description: "Get a list by ID" },
  { method: "GET",    pattern: "/x/2/lists/:id/tweets",                 tier: "read", routeId: "x:list:tweets",            description: "Get tweets from a list" },
  { method: "GET",    pattern: "/x/2/lists/:id/members",                tier: "read", routeId: "x:list:members",           description: "Get members of a list" },
  { method: "GET",    pattern: "/x/2/users/:id/owned_lists",            tier: "read", routeId: "x:user:owned_lists",       description: "Get lists owned by a user" },
  { method: "GET",    pattern: "/x/2/users/:id/followed_lists",         tier: "read", routeId: "x:user:followed_lists",    description: "Get lists followed by a user" },
  { method: "GET",    pattern: "/x/2/users/:id/pinned_lists",           tier: "read", routeId: "x:user:pinned_lists",      description: "Get pinned lists of a user" },
  { method: "DELETE", pattern: "/x/2/tweets/:id",                       tier: "read", routeId: "x:tweet:delete",           description: "Delete a tweet" },
  { method: "DELETE", pattern: "/x/2/lists/:id",                        tier: "read", routeId: "x:list:delete",            description: "Delete a list" },
  // Spaces
  { method: "GET",    pattern: "/x/2/spaces",                           tier: "read", routeId: "x:spaces:lookup",          description: "Look up spaces by IDs" },
  { method: "GET",    pattern: "/x/2/spaces/:id",                       tier: "read", routeId: "x:space:get",              description: "Get a single space" },
  { method: "GET",    pattern: "/x/2/spaces/by/creator_ids",            tier: "read", routeId: "x:spaces:by_creator",      description: "Get spaces by creator IDs" },
  { method: "GET",    pattern: "/x/2/spaces/:id/buyers",                tier: "read", routeId: "x:space:buyers",           description: "Get buyers of a Space" },
  { method: "GET",    pattern: "/x/2/spaces/search",                    tier: "read", routeId: "x:spaces:search",          description: "Search spaces" },
  { method: "GET",    pattern: "/x/2/spaces/:id/tweets",                tier: "read", routeId: "x:space:tweets",           description: "Get tweets shared in a Space" },
];

// ─── Tier 2: $0.10 — Users, DMs, Basic Writes ────────────────────────────────

export const TIER_USER: RouteDefinition[] = [
  // Users
  { method: "GET",    pattern: "/x/2/users",                            tier: "user", routeId: "x:users:lookup",           description: "Look up users by IDs" },
  { method: "GET",    pattern: "/x/2/users/:id",                        tier: "user", routeId: "x:user:get",               description: "Get a user by ID" },
  { method: "GET",    pattern: "/x/2/users/by/username/:username",      tier: "user", routeId: "x:user:by_username",       description: "Get a user by username" },
  { method: "GET",    pattern: "/x/2/users/by",                         tier: "user", routeId: "x:users:by_usernames",     description: "Look up multiple users by usernames" },
  { method: "GET",    pattern: "/x/2/users/me",                         tier: "user", routeId: "x:user:me",                description: "Get authenticated user info" },
  { method: "GET",    pattern: "/x/2/users/:id/followers",              tier: "user", routeId: "x:user:followers",         description: "Get followers of a user" },
  { method: "GET",    pattern: "/x/2/users/:id/following",              tier: "user", routeId: "x:user:following",         description: "Get users a user follows" },
  { method: "GET",    pattern: "/x/2/users/:id/blocking",               tier: "user", routeId: "x:user:blocking",          description: "Get users blocked by a user" },
  { method: "GET",    pattern: "/x/2/users/:id/muting",                 tier: "user", routeId: "x:user:muting",            description: "Get users muted by a user" },
  { method: "GET",    pattern: "/x/2/users/:id/liked_tweets",           tier: "user", routeId: "x:user:liked_tweets",      description: "Get tweets liked by a user" },
  { method: "GET",    pattern: "/x/2/users/:id/timelines/reverse_chronological", tier: "user", routeId: "x:user:home_timeline", description: "Get home timeline" },
  { method: "GET",    pattern: "/x/2/users/:id/bookmarks",              tier: "user", routeId: "x:user:bookmarks",         description: "Get bookmarks of a user" },
  // DM events
  { method: "GET",    pattern: "/x/2/dm_events",                        tier: "user", routeId: "x:dm_events:list",         description: "Get DM events" },
  { method: "GET",    pattern: "/x/2/dm_conversations/:dm_conversation_id/dm_events", tier: "user", routeId: "x:dm_conversation:events", description: "Get events in a DM conversation" },
  // Write: post tweet / create list
  { method: "POST",   pattern: "/x/2/tweets",                           tier: "user", routeId: "x:tweet:create",           description: "Post a new tweet" },
  { method: "POST",   pattern: "/x/2/lists",                            tier: "user", routeId: "x:list:create",            description: "Create a new list" },
  { method: "PUT",    pattern: "/x/2/lists/:id",                        tier: "user", routeId: "x:list:update",            description: "Update a list" },
  // Bookmarks write
  { method: "POST",   pattern: "/x/2/users/:id/bookmarks",              tier: "user", routeId: "x:user:bookmark:add",      description: "Add a tweet to bookmarks" },
  { method: "DELETE", pattern: "/x/2/users/:id/bookmarks/:tweet_id",    tier: "user", routeId: "x:user:bookmark:remove",   description: "Remove a tweet from bookmarks" },
];

// ─── Tier 3: $0.15 — Follows, Likes, Actions ─────────────────────────────────

export const ACTION_ROUTES: RouteDefinition[] = [
  // Follow / Unfollow
  { method: "POST",   pattern: "/x/2/users/:id/following",              tier: "action", routeId: "x:user:follow",          description: "Follow a user" },
  { method: "DELETE", pattern: "/x/2/users/:source_user_id/following/:target_user_id", tier: "action", routeId: "x:user:unfollow", description: "Unfollow a user" },
  // Like / Unlike
  { method: "POST",   pattern: "/x/2/users/:id/likes",                  tier: "action", routeId: "x:tweet:like",           description: "Like a tweet" },
  { method: "DELETE", pattern: "/x/2/users/:id/likes/:tweet_id",        tier: "action", routeId: "x:tweet:unlike",         description: "Unlike a tweet" },
  // Retweet / Undo retweet
  { method: "POST",   pattern: "/x/2/users/:id/retweets",               tier: "action", routeId: "x:tweet:retweet",        description: "Retweet a tweet" },
  { method: "DELETE", pattern: "/x/2/users/:id/retweets/:source_tweet_id", tier: "action", routeId: "x:tweet:unretweet",  description: "Undo a retweet" },
  // Block / Unblock
  { method: "POST",   pattern: "/x/2/users/:id/blocking",               tier: "action", routeId: "x:user:block",           description: "Block a user" },
  { method: "DELETE", pattern: "/x/2/users/:source_user_id/blocking/:target_user_id", tier: "action", routeId: "x:user:unblock", description: "Unblock a user" },
  // Mute / Unmute
  { method: "POST",   pattern: "/x/2/users/:id/muting",                 tier: "action", routeId: "x:user:mute",            description: "Mute a user" },
  { method: "DELETE", pattern: "/x/2/users/:source_user_id/muting/:target_user_id", tier: "action", routeId: "x:user:unmute", description: "Unmute a user" },
  // DM Conversations
  { method: "POST",   pattern: "/x/2/dm_conversations/with/:participant_id/messages", tier: "action", routeId: "x:dm:send",    description: "Send a DM to a participant" },
  { method: "POST",   pattern: "/x/2/dm_conversations",                 tier: "action", routeId: "x:dm_conversation:create", description: "Create a new DM conversation" },
  { method: "POST",   pattern: "/x/2/dm_conversations/:dm_conversation_id/messages", tier: "action", routeId: "x:dm:reply",  description: "Reply in an existing DM conversation" },
  // List membership management
  { method: "POST",   pattern: "/x/2/lists/:id/members",                tier: "action", routeId: "x:list:member:add",      description: "Add a member to a list" },
  { method: "DELETE", pattern: "/x/2/lists/:id/members/:user_id",       tier: "action", routeId: "x:list:member:remove",   description: "Remove a member from a list" },
  // List follow
  { method: "POST",   pattern: "/x/2/users/:id/followed_lists",         tier: "action", routeId: "x:list:follow",          description: "Follow a list" },
  { method: "DELETE", pattern: "/x/2/users/:id/followed_lists/:list_id", tier: "action", routeId: "x:list:unfollow",       description: "Unfollow a list" },
  // Pin/Unpin list
  { method: "POST",   pattern: "/x/2/users/:id/pinned_lists",           tier: "action", routeId: "x:list:pin",             description: "Pin a list" },
  { method: "DELETE", pattern: "/x/2/users/:id/pinned_lists/:list_id",  tier: "action", routeId: "x:list:unpin",           description: "Unpin a list" },
];

export const ALL_ROUTES = [...TIER_READ, ...TIER_USER, ...ACTION_ROUTES];

/** Price for each tier in USDC */
export const TIER_PRICES = {
  read:   0.05,
  user:   0.10,
  action: 0.15,
} as const;

export type Tier = keyof typeof TIER_PRICES;
