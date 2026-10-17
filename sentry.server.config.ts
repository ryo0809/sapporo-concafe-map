import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./src/sentry-options";

// Workers does not support Node's module-loader hooks; Next.js is instrumented at build time.
Sentry.init({ ...sentryOptions, enableRuntimeChannelInjection: false });
