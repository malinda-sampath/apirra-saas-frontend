Add support for the HTTP method: $ARGUMENTS (e.g. `patch`, `head`, `options`).

This method is currently recognized by `features/explorer/utils/openApiParser.ts`
and the `HttpMethod`/`ExecutePayload` types in `features/explorer/types/index.ts`,
but has no UI component and `MethodRenderer.tsx` falls through to "not yet
supported" for it.

Steps:
1. Look at `features/explorer/components/methods/PutMethod.tsx` if the method
   carries a request body (e.g. PATCH), or `GetMethod.tsx` if it doesn't
   (e.g. HEAD/OPTIONS). Use it as the template — same local state shape
   (`response`, `isRunning`, `paramValues`, `toasts`, `showCurl`,
   `activeTab`, `requestHistory`), same grouped-parameter handling, same
   reset-on-endpoint-change effect.
2. Create `features/explorer/components/methods/<Method>Method.tsx` (sibling
   to the existing four — there's no longer a per-method subfolder).
3. Use the method's own color where one exists in `index.css`
   (`--color-patch` is already defined; add a new CSS var + `.method-pill-*`
   class in `index.css` if this method doesn't have one yet).
4. Wire it into `features/explorer/components/MethodRenderer.tsx`'s switch
   statement.
5. **Use the canonical types, not a new local shape**: import
   `ParsedApiMethod` and `ExecutePayload` from `features/explorer/types`
   (both already have everything you need — no intersection type required).
   Do not add an `as unknown as ExecutePayload` cast — if the type doesn't
   fit, that's a signal to fix the type, not to cast around it.
6. Confirm `npm run build` (tsc) and `npm run lint` pass.
