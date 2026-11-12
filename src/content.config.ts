import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const writing = defineCollection({
  loader: glob({
    pattern: "*.md",
    base: "./src/content/writing",
  }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    publishedAt: z.iso.date(),
    updatedAt: z.iso.date().optional(),
  }),
});

export const collections = { writing };
