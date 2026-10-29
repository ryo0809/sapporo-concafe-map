# Worker resource limit investigation (2026-10-25)

Cloudflare Error 1102 can mean that a Worker exceeded either its CPU limit or its 128 MB isolate memory limit. The historical incidents have not been tied to a route or a specific limit by invocation logs.

## Evidence and current status

- The production inspection saved on 2026-10-19 in `reports/1102-inspection.json` found 26 `exceededResources` invocations in the preceding day. Their median CPU time was 10 ms, consistent with the Workers Free CPU limit, but the available aggregate did not distinguish CPU from memory errors.
- On 2026-10-25, `/api/health` returned a 1102 page (Ray ID `a501898bca9ed790-NRT`), while `/` returned HTTP 200. The staging CPU probe recorded a home-page median of 17.962 ms and p95 of 71.851 ms, above the Free plan's 10 ms limit. That probe was not a production measurement.
- On 2026-10-26, the owner enabled Workers Paid. The Cloudflare API returned `limits.cpu_ms: 30000` for the production Worker, and the subsequent six hourly analytics windows had no `exceededResources` outcome. This was the last authenticated settings check recorded in this repository.
- On 2026-10-29, read-only production requests returned HTTP 200 for `/` and `/api/health`. A successful spot check does not establish the error rate. Current invocation outcomes and the live CPU setting could not be rechecked because Wrangler authentication was unavailable during this review.

## Scope of this PR

The production Wrangler configuration now pins `limits.cpu_ms` to 30000, and the release check rejects a production configuration below that limit. This records the setting already confirmed on the live Worker and prevents a later deployment from silently losing it.

The public home page keeps its existing request-time rendering and D1-backed store list. The earlier static-home and browser-only store-fetch proposal was removed after comparison with production HTML: it omitted the store list from the initial HTML, reducing the content available to crawlers. This narrower change does not claim to resolve memory-limit failures or prove the historical 1102 root cause.

## Verification and merge decision

After updating from `main` and narrowing the change, lint, typecheck, 75 unit tests, one D1 integration test, and the Next.js production build passed locally. The build marks `/` as dynamic. The Windows OpenNext bundle still stops when its dependency copier attempts to create a symlink; the Linux GitHub Actions build and browser tests remain the deployment-shaped gate.

Merge this configuration-only change once the refreshed GitHub Actions validation passes. It aligns source control with the last confirmed live CPU setting without changing the public page's rendering. Investigate any further 1102 events separately using Workers Logs or invocation outcomes (`exceededCpu` versus `exceededMemory`), including the route and CPU or memory measurements. If the current live limit differs from 30000 ms, reconcile that difference before deployment.

References: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Wrangler CPU configuration](https://developers.cloudflare.com/workers/wrangler/configuration/), [Error 1102](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1102/).
