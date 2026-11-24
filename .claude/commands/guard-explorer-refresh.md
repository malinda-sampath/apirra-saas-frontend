Guard `/explorer` against a hard refresh or direct link (see CLAUDE.md
"Known issues" #5).

`ExplorerPage.tsx` lives at `pages/ExplorerPage/ExplorerPage.tsx`;
the home page (formerly `PreLoginHome.tsx`) is now
`pages/HomePage/HomePage.tsx`.

Root cause: `ExplorerPage.tsx` reads `endpoints`/`baseUrl` only from
`location.state` (set by `react-router-dom`'s `navigate()` in
`HomePage.tsx`). A hard refresh or a direct visit to `/explorer` has no
`location.state`, so `endpoints` silently falls back to `[]` and the page
renders an empty sidebar with no explanation.

Steps:
1. In `ExplorerPage.tsx`, detect the empty-state case (e.g.
   `location.state?.endpoints` is undefined/empty).
2. Either redirect back to `/` (`useNavigate` + `useEffect`) or render an
   inline message explaining the spec needs to be reloaded from the home
   page, with a link/button back to `/`. Don't silently show a blank
   sidebar.
3. Keep this consistent with the existing router-state architecture — this
   is a guard, not a fix for the underlying "state, not persisted state"
   design (don't introduce global state/localStorage unless asked).
4. Manually verify: reload `/explorer` directly in the browser, confirm you
   see the guard (redirect or message) instead of a silently empty page.
5. Remove item 5 from CLAUDE.md's "Known issues" list once verified.
