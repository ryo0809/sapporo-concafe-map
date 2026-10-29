# Worker resource limit investigation (2026-10-25)

Cloudflare Error 1102 can mean that a Worker exceeded either its CPU limit or its 128 MB isolate memory limit. The historical incidents have not been tied to a route or a specific limit by invocation logs.

## Evidence and current status

- The 2026-10-19 production inspection found 26 `exceededResources` invocations in the preceding day. Their median CPU time was 10 ms, consistent with the Workers Free CPU limit, but the available aggregate did not distinguish CPU from memory errors.
- On 2026-10-25, `/api/health` returned a 1102 page (Ray ID `a501898bca9ed790-NRT`), while `/` returned HTTP 200. The staging CPU probe recorded a home-page median of 17.962 ms and p95 of 71.851 ms, above the Free plan's 10 ms limit. That probe was not a production measurement.
- On 2026-10-26, the owner enabled Workers Paid. The Cloudflare API returned `limits.cpu_ms: 30000` for the production Worker, and the subsequent six hourly analytics windows had no `exceededResources` outcome.
- On 2026-10-29, read-only production requests returned HTTP 200 for `/` and `/api/health`. A successful spot check alone does not establish the error rate.
- On 2026-10-30 JST, a fresh authenticated Cloudflare check returned `limits: null` for the live Worker: no explicit per-Worker CPU limit is recorded in its current settings. Workers Paid defaults to 30 seconds. For the preceding 24 hours (2026-10-29 00:32 to 2026-10-30 00:32 JST), adaptive invocation analytics returned 566 successful invocations, zero errors, and no `exceededResources` status. The latest deployment listed by the API was on 2026-10-26 at 20:49 JST. The telemetry events endpoint returned 403, so the historical error route and cause remain unknown.

## Scope of this PR

The production Wrangler configuration now pins `limits.cpu_ms` to 30000, and the release check rejects a production configuration below that limit. This makes the Paid plan's 30-second default explicit in source control instead of relying on a dashboard override, which was absent at the latest check.

The public home page keeps its existing request-time rendering and D1-backed store list. The earlier static-home and browser-only store-fetch proposal was removed after comparison with production HTML: it omitted the store list from the initial HTML, reducing the content available to crawlers. This narrower change does not claim to resolve memory-limit failures or prove the historical 1102 root cause.

## Verification and merge decision

After updating from `main` and narrowing the change, lint, typecheck, 75 unit tests, one D1 integration test, and the Next.js production build passed locally. The build marks `/` as dynamic. The Windows OpenNext bundle still stops when its dependency copier attempts to create a symlink. [GitHub Actions validation](https://github.com/ryo0809/sapporo-concafe-map/actions/runs/40884703986), including the Linux OpenNext build and browser tests, passed on the code change.

Merge this configuration-only change once validation of the final head passes. It explicitly preserves the Paid plan's 30-second CPU allowance without changing the public page's rendering. Recheck the live setting after deployment. Investigate any further 1102 events separately using Workers Logs or invocation outcomes (`exceededCpu` versus `exceededMemory`), including the route and CPU or memory measurements.

References: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Wrangler CPU configuration](https://developers.cloudflare.com/workers/wrangler/configuration/), [Error 1102](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1102/).
