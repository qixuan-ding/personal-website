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

| Command                | Purpose                                                 |
| ---------------------- | ------------------------------------------------------- |
| `npm run check`        | Check Astro and TypeScript diagnostics                  |
| `npm run lint`         | Check code and accessibility rules                      |
| `npm run format`       | Format source files                                     |
| `npm run format:check` | Check formatting without changing files                 |
| `npm run build`        | Run diagnostics and generate the static site in `dist/` |
| `npm run preview`      | Preview the production build locally                    |

## Hosting

The planned host is **Cloudflare Pages**, using `npm run build` and the `dist` output directory.

Future additions include project showcases and reader reactions.
