# Repository Guidelines

## Project Structure & Module Organization
The frontend code lives in `src/`, using the Next.js App Router. `src/app` contains entry points such as `page.tsx`, shared layout pieces, and `globals.css`. UI building blocks sit in `src/components` and pair with CSS modules in `src/styles`. Shared types belong in `src/types`. Place static assets in `public/`. Keep new feature folders scoped to these conventions; if you add shared hooks or utilities, corral them under `src/hooks` or `src/lib`.

## Build, Test, and Development Commands
- `npm run dev`: launches Next.js 15 with Turbopack at `http://localhost:3000` for rapid iteration.
- `npm run build`: produces the optimized production bundle consumed by the Docker workflow.
- `npm run start`: serves the previously built bundle, mirroring container behavior.
- `npm run lint`: runs the Next.js ESLint suite; append `-- --fix` locally to autofix style issues.

## Coding Style & Naming Conventions
TypeScript and React functional components are the default. Use two-space indentation and single quotes to match existing files. Component files live in `src/components/FooBar.tsx` (PascalCase) and export default functions with the same name. Keep module-level helpers in the component file or move them to a shared `src/lib` once created. Style overrides belong in CSS modules named `FooBar.module.css`; global tweaks stay in `src/app/globals.css`. Run ESLint frequently; align with the bundled `next/core-web-vitals` ruleset.

## Testing Guidelines
Automated tests are not wired up yet; when contributing, include tests alongside new features. Vitest plus React Testing Library aligns well with this stack—organize specs in `src/__tests__` or next to the component as `Component.test.tsx`. Until a formal script is added to `package.json`, run `npm run lint` and verify flows manually via `npm run dev`. Document any new test commands in your PR.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `fix:`, `chore:`, etc.), mirroring history entries such as `chore: Regenerate all playbooks`. Keep summaries under 72 characters and prefer squashing before merge unless intermediate commits matter. Pull requests should cover purpose, testing evidence, screenshots or GIFs for UI changes, linked issues, and confirmation that `npm run lint` and `npm run build` succeed. Call out configuration or dependency updates explicitly for reviewers.
