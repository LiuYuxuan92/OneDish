import { db, closeConnection } from '../config/database';
import { cosService } from '../services/cos.service';

type ReferenceRecord = {
  source: string;
  field: string;
  record_id: string;
  value: string;
};

type ManagedReferenceInventoryRecord = {
  reference_source: string;
  object_key: string;
  canonical_url: string;
  sample_reference_value: string;
  reference_count: number;
};

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || '').trim()).filter(Boolean);
      }
      if (typeof parsed === 'string' && parsed.trim()) {
        return [parsed.trim()];
      }
    } catch {
      return [trimmed];
    }
  }

  return [];
}

function collectReferences(source: string, field: string, recordId: string, rawValue: unknown): ReferenceRecord[] {
  return toArray(rawValue).map((value) => ({
    source,
    field,
    record_id: recordId,
    value,
  }));
}

async function loadReferences(): Promise<ReferenceRecord[]> {
  const references: ReferenceRecord[] = [];

  const users = await db('users').select('id', 'avatar_url');
  users.forEach((row: any) => {
    references.push(...collectReferences('users', 'avatar_url', String(row.id), row.avatar_url));
  });

  const recipes = await db('recipes').select('id', 'image_url', 'video_url');
  recipes.forEach((row: any) => {
    references.push(...collectReferences('recipes', 'image_url', String(row.id), row.image_url));
    references.push(...collectReferences('recipes', 'video_url', String(row.id), row.video_url));
  });

  const userRecipes = await db('user_recipes').select('id', 'image_url');
  userRecipes.forEach((row: any) => {
    references.push(...collectReferences('user_recipes', 'image_url', String(row.id), row.image_url));
  });

  const feedingFeedbacks = await db('feeding_feedbacks').select('id', 'image_urls');
  feedingFeedbacks.forEach((row: any) => {
    references.push(...collectReferences('feeding_feedbacks', 'image_urls', String(row.id), row.image_urls));
  });

  const weeklyReviews = await db('weekly_feeding_reviews').select('id', 'review_json');
  weeklyReviews.forEach((row: any) => {
    const review = typeof row.review_json === 'string'
      ? (() => {
          try {
            return JSON.parse(row.review_json);
          } catch {
            return null;
          }
        })()
      : row.review_json;

    const nestedValues = [
      ...(Array.isArray(review?.top_accepted_recipes) ? review.top_accepted_recipes.map((item: any) => item?.image_url) : []),
      ...(Array.isArray(review?.cautious_recipes) ? review.cautious_recipes.map((item: any) => item?.image_url) : []),
    ];

    nestedValues.forEach((value, index) => {
      references.push(...collectReferences('weekly_feeding_reviews', `review_json[${index}].image_url`, String(row.id), value));
    });
  });

  return references;
}

async function main() {
  const references = await loadReferences();
  const managedReferences = references
    .map((item) => {
      const canonicalUrl = cosService.toStoredUrl(item.value);
      const objectKey = cosService.getManagedObjectKey(item.value);

      return canonicalUrl && objectKey
        ? {
            ...item,
            canonical_url: canonicalUrl,
            object_key: objectKey,
          }
        : null;
    })
    .filter(Boolean) as Array<ReferenceRecord & { canonical_url: string; object_key: string }>;

  const inventoryByKey = new Map<string, ManagedReferenceInventoryRecord>();
  for (const item of managedReferences) {
    const existing = inventoryByKey.get(item.object_key);
    if (existing) {
      existing.reference_count += 1;
      continue;
    }
    inventoryByKey.set(item.object_key, {
      reference_source: `${item.source}.${item.field}`,
      object_key: item.object_key,
      canonical_url: item.canonical_url,
      sample_reference_value: item.value,
      reference_count: 1,
    });
  }

  const managedReferenceInventory = Array.from(inventoryByKey.values())
    .sort((a, b) => a.object_key.localeCompare(b.object_key));

  console.log(JSON.stringify({
    ok: true,
    mode: 'audit-only',
    audit_scope: 'managed-reference-inventory',
    orphan_determination_performed: false,
    no_deletion_performed: true,
    total_reference_values_scanned: references.length,
    managed_reference_values_found: managedReferences.length,
    unique_managed_object_keys_found: managedReferenceInventory.length,
    inventory_samples: managedReferenceInventory.slice(0, 50),
    generated_at: new Date().toISOString(),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      mode: 'audit-only',
      audit_scope: 'managed-reference-inventory',
      orphan_determination_performed: false,
      error: String(error),
    }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeConnection();
  });

