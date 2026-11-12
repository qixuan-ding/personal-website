import { getCollection } from "astro:content";

export async function getPublishedWriting() {
  const essays = await getCollection("writing");

  return essays.sort(
    (a, b) =>
      b.data.publishedAt.localeCompare(a.data.publishedAt) ||
      a.id.localeCompare(b.id),
  );
}
