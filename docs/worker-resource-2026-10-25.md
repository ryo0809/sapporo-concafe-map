# Worker resource limit investigation (2026-10-25)

The reported "Worker exceeded resource limits" page is Cloudflare Error 1102. It can be caused by CPU or isolate memory exhaustion. The exact exceeded resource in the earlier incidents still requires invocation logs.

## Evidence

- On 2026-10-25, the production home page returned HTTP 200, but `/api/health` returned HTTP 503 with the Cloudflare 1102 page (Ray ID `a501898bca9ed790-NRT`). `/api/public/cafes` returned 404, confirming that the mitigation in this change is not deployed yet.
- The saved production inspection in `reports/1102-inspection.json` (2026-10-19) recorded 26 `exceededResources` invocations in its preceding day. Their CPU time median was 10 ms. This points to the Workers Free CPU limit, but the report could not access detailed invocation logs, so it does not identify the route or exclude memory exhaustion.
- The 2026-10-20 CPU optimization report explicitly says that it deployed to **staging only**. In its isolated staging probe, home page CPU time had a 17.962 ms median and 71.851 ms p95 (time-window estimates), still above the Free plan's 10 ms budget. Admin routes also contain dynamic Next.js and password hashing work.
- The production deployment recorded by the 2026-10-19 inspection was dated 2026-10-18. Whether there have been later production deployments is unverified.

## Mitigation in this change

- The home page is prerendered. Native Worker asset routing serves its HTML without Next.js SSR or a D1 read. A separate native `/api/public/cafes` route reads only published, currently visible stores from D1, without buffering a Next.js render. The browser fetches this route with `no-store`, so admin publication changes appear on the next page load. A failure shows a retry control.
- The production Wrangler configuration sets `limits.cpu_ms` to 30000. Cloudflare rejects this limit on the Free plan; thus deployment cannot silently retain the 10 ms budget while admin routes remain dynamic. The owner enabled Workers Paid on 2026-10-26, and the live Worker setting was updated and read back successfully through the Cloudflare API.
- The release check requires that CPU setting. The deploy workflow uses the build script that prepares all native static assets, and the smoke test checks the new public data route.

## Required production verification

1. In Cloudflare, inspect `sapporo-concafe-map` Workers Logs around the reported Ray ID/time. Record the route and whether the outcome was `exceededCpu` or `exceededMemory`.
2. Apply reviewed D1 migrations including `0010_runtime_query_indexes.sql`, then deploy the reviewed release through the protected workflow.
3. Run the production smoke test and open the map in a browser. Check Workers invocation statuses and CPU p95/p99 after deployment, including authenticated admin operations. Configure alerts for resource errors and `/api/health` failures.

Local verification: Next.js production build marked `/` static; typecheck, lint and 74 unit tests passed, and the map browser test passed. The Windows OpenNext bundle reached server-function assembly but could not create a symlink; the Linux deployment workflow is the remaining bundle/runtime gate.

## Production check on 2026-10-26

- Cloudflare Workers API returned HTTP 200 for the live `sapporo-concafe-map` settings, with `usage_model: standard`, `limits.cpu_ms: 30000`, and six bindings. The successful CPU-limit update and readback establish that the Paid CPU allowance is effective for this Worker. Direct subscription-list access was denied because the OAuth token lacks Billing Read permission.
- At 17:59 JST, Cloudflare's adaptive invocation analytics showed 72 successful calls and no resource errors in the preceding hour. All six preceding hourly windows had no `exceededResources` outcome. The preceding 24 hours still included 310 `exceededResources` outcomes, from earlier than those six hours. Analytics does not identify the earlier resource type or route.
- The public `/`, `/contact`, `/admin/login`, and `/api/health` returned HTTP 200. `/api/public/cafes` returned 404, confirming that the static-home/public-data code change is still not deployed. Paid CPU allowance reduces CPU-limit failures, but Workers' memory limit still applies.

Sources: [Cloudflare Error 1102](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1102/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Wrangler CPU configuration](https://developers.cloudflare.com/workers/wrangler/configuration/).
