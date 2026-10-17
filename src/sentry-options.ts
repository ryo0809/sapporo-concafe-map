import type { init } from "@sentry/nextjs";

// The DSN identifies the public ingestion endpoint; authentication tokens stay in the build environment.
export const sentryOptions: NonNullable<Parameters<typeof init>[0]> = {
  dsn: "https://3012d5c153c01c563fac3fdab9ec7968@o4512273739218944.ingest.us.sentry.io/4512273751736320",
  enabled: process.env.NODE_ENV === "production",
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "production",
  tracesSampleRate: 0.1,
  beforeSendLog: () => null,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    databaseQueryData: false,
    stackFrameVariables: false,
    graphQL: { document: false, variables: false },
    genAI: { inputs: false, outputs: false },
    queues: false,
  },
};
