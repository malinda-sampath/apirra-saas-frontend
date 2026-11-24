Fix the broken active-item highlighting in `Sidebar.tsx` (see CLAUDE.md
"Known issues" #1).

`Sidebar.tsx` lives at `features/explorer/components/Sidebar.tsx`;
`ExplorerPage.tsx` lives at `pages/ExplorerPage/ExplorerPage.tsx`.

Root cause: `ExplorerPage.tsx` calls
`onSelect={(ep) => setSelected({ ...ep })}`, which spreads into a new
object on every selection. `Sidebar.tsx` checks
`const isActive = selected === ep` — reference equality against the
original array item — so it's always `false`.

Steps:
1. In `Sidebar.tsx`, change the equality check to compare by identity that
   survives spreading, e.g.
   `const isActive = selected?.method === ep.method && selected?.path === ep.path;`
2. Alternatively (simpler): in `ExplorerPage.tsx`, stop spreading —
   `setSelected(ep)` — and keep the reference check in `Sidebar.tsx` as is.
   Pick one approach, don't do both.
3. Manually verify: select an endpoint, confirm the sidebar row shows the
   blue background + left border, select a different one, confirm the
   highlight moves.
4. Remove item 1 from CLAUDE.md's "Known issues" list once verified.
