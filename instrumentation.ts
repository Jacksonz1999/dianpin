import { type Instrumentation } from "next";
import { reportServerError } from "./lib/monitoring";

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String(error.digest)
      : undefined;
  await reportServerError(error, {
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    digest,
  });
};
