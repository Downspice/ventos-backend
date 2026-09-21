import type { Express } from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { buildContext } from "./graphql/context.js";
import { resolvers } from "./graphql/resolvers/index.js";
import { typeDefs } from "./graphql/schema/typeDefs.js";

const schema = makeExecutableSchema({ typeDefs, resolvers });

let apolloStarted = false;

/** HTTP GraphQL only (no WebSocket subscriptions). Used for Vercel and local HTTP. */
export async function attachApolloHttp(app: Express): Promise<void> {
  if (apolloStarted) return;

  const apollo = new ApolloServer({ schema });
  await apollo.start();
  apolloStarted = true;

  app.use(
    "/graphql",
    expressMiddleware(apollo, {
      context: async ({ req, res }) => buildContext({ req, res }),
    }),
  );
}
