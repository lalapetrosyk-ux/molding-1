<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

<!-- AGENT-MEMORY:BEGIN -->
- Layout/material math lives only in `src/lib/molding.ts` (pure, UI-free, unit-tested in `molding.test.ts`); components in `src/components/molding/` just render its output — why: geometry must match drawn coordinates exactly and stay testable.
- SVG uses centimeters as user units with `viewBox` + `preserveAspectRatio="xMidYMid meet"` and `vector-effect: non-scaling-stroke` for lines — why: proportional scaling without distortion.
- Params persist under a versioned localStorage key and are sanitized against `DEFAULT_PARAMS`; initial render always uses defaults, stored values load after hydration — why: no SSR mismatch and no foreign/old data.
<!-- AGENT-MEMORY:END -->
