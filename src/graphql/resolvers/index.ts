import { domainMutationResolvers, domainQueryResolvers } from "./domain.resolvers.js";
import { JSONScalar } from "../scalars.js";
import { NOTIFICATION_ADDED, pubsub } from "../pubsub.js";

export const resolvers = {
  JSON: JSONScalar,
  Query: domainQueryResolvers,
  Mutation: domainMutationResolvers,
  Subscription: {
    notificationAdded: {
      subscribe: (_: unknown, { businessId }: { businessId: string }) =>
        pubsub.asyncIterableIterator(`${NOTIFICATION_ADDED}:${businessId}`),
    },
  },
};
