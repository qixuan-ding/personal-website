# Qixuan Ding — Personal Website

A personal home for my writing, life experiences, and thoughts, with room for future projects and interactive experiments.

Built with **Astro**, **TypeScript**, **Markdown**, and **plain CSS**.

## Features

- A writing-first homepage showing the five newest essays.
- A minimal writing archive with titles and dates.
- Markdown articles with a focused reading layout.
- Two visual moods: **Cloudy**, with softly drifting white clouds, and **Obsidian**, with a near-black background and purple accents.
- Device-based initial mood selection and remembered preferences.
- Reduced-motion support for the cloud animation.
- An About page with research, background, community work, and contact links.
- Sticky navigation and a custom not-found page.
- A fixed article-only star button with shared totals stored in Cloudflare D1.

## Local development

Use Node.js 22.23.4 or newer on a supported even-numbered release, and npm. Run commands from this repository's root:

```sh
npm install
npm run dev -- --background
```

Open the local address printed by Astro, usually `http://localhost:4321`.

```sh
npm run astro -- dev status
npm run astro -- dev logs
npm run astro -- dev stop
```

## Project structure

```text
public/                 Static assets
src/
  assets/images/        Images used by the site
  components/           Navigation mood controls, clouds, and writing lists
  content/writing/      Published Markdown essays
  layouts/              Shared page and article layouts
  lib/                  Shared content functions
  pages/                Home, writing, articles, About, and not-found routes
  styles/               Shared CSS
  content.config.ts     Article metadata schema
```

Local drafts belong in the Git-ignored `drafts/` folder outside `src/`.

## Article content

Each published essay is a Markdown file in `src/content/writing/` with metadata such as:

```yaml
---
title: "An essay title"
description: "An optional short description."
publishedAt: "2026-11-11"
---
```

The filename determines the permanent address: `an-essay.md` becomes `/writing/an-essay`. Keep the filename unchanged when revising the title. An optional `updatedAt` date changes the displayed date; lists remain ordered by original publication date.

## Checks and builds

| Command                | Purpose                                                     |
| ---------------------- | ----------------------------------------------------------- |
| `npm run check`        | Check Astro and TypeScript diagnostics                      |
| `npm run lint`         | Check code and accessibility rules                          |
| `npm run format`       | Format source files                                         |
| `npm run format:check` | Check formatting without changing files                     |
| `npm run build`        | Run diagnostics and generate the static site in `dist/`     |
| `npm run preview`      | Preview the production build locally                        |
| `npm test`             | Test shared article reactions against SQLite                |
| `npm run dev:worker`   | Build and preview the full site with a local stars database |

## Hosting

The site runs on **Cloudflare Workers**, serving Astro's static build alongside a small article-reactions API.

In Cloudflare's Git build settings, use `npm run build` as the build command and `npx wrangler deploy` as the deploy command. The tracked `wrangler.jsonc` declares the Worker entry point, `dist` assets, and the `STARS_DB` D1 binding. Do not use an assets-only deployment command: the stars API needs the Worker entry point too.

### Shared article stars

Wrangler can provision the database automatically on the first deployment. If Cloudflare asks for a database selection, create a database for the `STARS_DB` binding. The Worker initializes its stars table on first use. After the first deployment, copy the database ID from Cloudflare into the binding's `database_id` field in `wrangler.jsonc` to explicitly retain that database on future deployments.

For a full local preview, including reactions:

```sh
npm run dev:worker
```

Wrangler prints the local address, normally `http://localhost:8787`. This uses a separate local database; local testing does not modify production totals. The ordinary Astro development server still previews content and styling, but does not run the reactions API.

Starring creates an anonymous browser cookie and records one reaction per article for that browser. Clicking again removes the reaction. Counts are shared across readers. This is not authenticated voting: clearing cookies or switching browsers permits another reaction. No IP address, email, or account is stored by the reactions feature.

To replace the sample essay, rename `src/content/writing/layout-preview.md` to the intended permanent filename, update its frontmatter, and replace its body with the real essay. The homepage and archive update automatically. Remove the sample file if creating the new essay separately.

Future additions include project showcases and further interactive experiments.
