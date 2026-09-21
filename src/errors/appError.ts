import { GraphQLError } from "graphql";

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public status = 400,
  ) {
    super(message);
    this.name = "AppError";
  }

  toGraphQLError(): GraphQLError {
    return new GraphQLError(this.message, {
      extensions: { code: this.code },
    });
  }
}

export function forbidden(message = "Forbidden"): never {
  throw new AppError(message, "FORBIDDEN", 403).toGraphQLError();
}

export function unauthorized(message = "Unauthorized"): never {
  throw new AppError(message, "UNAUTHORIZED", 401).toGraphQLError();
}

export function badRequest(message: string): never {
  throw new AppError(message, "BAD_REQUEST", 400).toGraphQLError();
}
