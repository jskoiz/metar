/**
 * Agent Registry
 * 
 * This package provides agent key registry functionality for storing and
 * looking up agent keys used in the Trusted Agent Protocol (TAP) authentication.
 * 
 * @see {@link file://research/trusted-agent-protocol.md | Trusted Agent Protocol}
 */

// Price service exports
export {
  getPrice,
  setPrice,
  removePrice,
  getAllRouteIds,
} from "./priceService.js";

export { priceEndpoint } from "./priceEndpoint.js";

// Agent key registry exports
export {
  lookupAgentKey,
  addAgentKey,
  removeAgentKey,
  listAgentKeys,
  clearAgentKeys,
} from "./registry.js";
