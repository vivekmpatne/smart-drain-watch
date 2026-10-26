<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Risk engine logic lives only in src/lib/riskEngine.ts as pure functions (no React); tunables only in src/lib/config.ts — keeps the Node-RED port testable.
- Simulation state lives in one Zustand store (src/store/simulationStore.ts), ticked by useSimulationLoop mounted once in SiteLayout — single clock for all pages.
- Routing uses TanStack Router (template-fixed), not React Router.
