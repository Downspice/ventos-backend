import { GraphQLScalarType, Kind } from "graphql";

export const JSONScalar = new GraphQLScalarType({
  name: "JSON",
  serialize(value) {
    return value;
  },
  parseValue(value) {
    return value;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      try {
        return JSON.parse(ast.value);
      } catch {
        return ast.value;
      }
    }
    return null;
  },
});
