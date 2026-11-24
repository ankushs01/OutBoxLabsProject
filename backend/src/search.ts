import { Client } from "@elastic/elasticsearch";
import { config } from "./config.js";

const INDEX = "emails";
export const es = new Client({ node: config.esUrl });

export async function initSearch() {
  try {
    const exists = await es.indices.exists({ index: INDEX });
    if (!exists) {
      await es.indices.create({
        index: INDEX,
        mappings: {
          properties: {
            userId: { type: "integer" },
            to: { type: "text" },
            subject: { type: "text" },
            body: { type: "text" },
            status: { type: "keyword" },
            scheduledAt: { type: "date" },
            sentAt: { type: "date" },
          },
        },
      });
    }
  } catch (e) {
    console.warn("[search] Elasticsearch unavailable:", (e as Error).message);
  }
}

export interface IndexedEmail {
  id: string;
  userId: number;
  to: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date;
  sentAt?: Date | null;
}

/** Best-effort indexing; Postgres stays the source of truth. */
export async function indexEmail(doc: IndexedEmail) {
  try {
    const { id, ...rest } = doc;
    await es.index({ index: INDEX, id, document: rest });
  } catch (e) {
    console.warn("[search] index failed:", (e as Error).message);
  }
}

export async function bulkIndex(docs: IndexedEmail[]) {
  if (!docs.length) return;
  try {
    const operations = docs.flatMap(({ id, ...rest }) => [{ index: { _index: INDEX, _id: id } }, rest]);
    await es.bulk({ operations });
  } catch (e) {
    console.warn("[search] bulk index failed:", (e as Error).message);
  }
}

export async function searchEmails(userId: number, q: string) {
  const res = await es.search({
    index: INDEX,
    size: 100,
    query: {
      bool: {
        filter: [{ term: { userId } }],
        must: [{ multi_match: { query: q, fields: ["to", "subject", "body"], fuzziness: "AUTO" } }],
      },
    },
  });
  return res.hits.hits.map((h) => ({ id: h._id, ...(h._source as object) }));
}
