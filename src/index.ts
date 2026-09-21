import http from "node:http";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { useServer } from "graphql-ws/use/ws";
import { WebSocketServer } from "ws";
import { createApp } from "./app.js";
import { assertProductionSecrets, env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import { buildContext, buildSessionContext } from "./graphql/context.js";
import { resolvers } from "./graphql/resolvers/index.js";
import { typeDefs } from "./graphql/schema/typeDefs.js";

async function main() {
  assertProductionSecrets();
  await connectDatabase();

  const app = createApp();
  const httpServer = http.createServer(app);

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });

  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx) => {
        const raw = ctx.connectionParams?.authorization;
        const authHeader =
          typeof raw === "string"
            ? raw.startsWith("Bearer ")
              ? raw
              : `Bearer ${raw}`
            : undefined;
        return buildSessionContext(authHeader);
      },
    },
    wsServer,
  );

  const apollo = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await apollo.start();

  app.use(
    "/graphql",
    expressMiddleware(apollo, {
      context: async ({ req, res }) => buildContext({ req, res }),
    }),
  );

  httpServer.listen(env.port, () => {
    console.log(`Ventos API listening on http://127.0.0.1:${env.port}`);
    console.log(`GraphQL HTTP: http://127.0.0.1:${env.port}/graphql`);
    console.log(`GraphQL WS:   ws://127.0.0.1:${env.port}/graphql`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
