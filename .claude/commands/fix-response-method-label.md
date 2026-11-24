Fix the hardcoded method label in `ResponseDisplay.tsx`'s "Request Details"
tab (see CLAUDE.md "Known issues" #2).

`ResponseDisplay.tsx` lives at `features/explorer/components/ResponseDisplay.tsx`.

Root cause: `ResponseDisplay.tsx` renders a hardcoded `GET` string in the
"Method" block of the Request Details tab (around the `<code>GET</code>`
element), regardless of which method was actually sent.

Steps:
1. Add a `method` prop to `ResponseDisplayProps` in `ResponseDisplay.tsx`
   (type it as the canonical `HttpMethod` from `features/explorer/types`).
2. Render `{method.toUpperCase()}` in place of the hardcoded `GET` string.
3. Update every caller in `features/explorer/components/methods/`
   (`GetMethod.tsx`, `PostMethod.tsx`, `PutMethod.tsx`, `DeleteMethod.tsx`)
   to pass `endpoint.method` into `<ResponseDisplay />` — the same value
   they already pass to `<CurlGenerator method={endpoint.method} />`.
4. Manually verify: try a POST/PUT/DELETE endpoint, send a request, open the
   "Request Details" tab, confirm the Method block shows the real verb
   instead of always `GET`.
5. Remove item 2 from CLAUDE.md's "Known issues" list once verified.
