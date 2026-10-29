import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./sentry-options";
import { isExternalWebViewScrollBridgeError } from "./infrastructure/observability/sentry-client-filter";

Sentry.init({
  ...sentryOptions,
  beforeSend: event => isExternalWebViewScrollBridgeError(event) ? null : event,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
