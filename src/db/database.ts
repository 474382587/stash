import { Directory, File, Paths } from "expo-file-system";
import { openDatabaseAsync } from "expo-sqlite";
import type { SQLiteDatabase } from "expo-sqlite";

import { runMigrations } from "src/db/migrations";
import type {
  Collection,
  CustomField,
  CustomFieldValue,
  Item,
  ItemStatus,
  Photo,
  SortDir,
  SortField,
  Tag,
} from "src/db/types";

let dbPromise: Promise<SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const d = await openDatabaseAsync("stash.db");
      await d.execAsync("PRAGMA journal_mode = WAL");
      await d.execAsync("PRAGMA foreign_keys = ON");
      await runMigrations(d);
      return d;
    })();
  }
  return dbPromise;
}

// ── Collections ──

export async function getCollections(): Promise<Collection[]> {
  const d = await getDb();
  return d.getAllAsync<Collection>(`
    SELECT c.*,
      COUNT(DISTINCT i.id) AS item_count,
      COALESCE(SUM(COALESCE(i.current_value, i.purchase_price, 0)), 0) AS total_value,
      (SELECT p.uri FROM photos p
       JOIN items it ON it.id = p.item_id
       WHERE it.collection_id = c.id AND p.is_cover = 1
       LIMIT 1) AS cover_photo
    FROM collections c
    LEFT JOIN items i ON i.collection_id = c.id AND i.status = 'owned'
    GROUP BY c.id
    ORDER BY c.sort_order, c.name
  `);
}

export async function getCollection(id: number): Promise<Collection | null> {
  const d = await getDb();
  return d.getFirstAsync<Collection>(
    `SELECT c.*,
      COUNT(DISTINCT i.id) AS item_count,
      COALESCE(SUM(COALESCE(i.current_value, i.purchase_price, 0)), 0) AS total_value
    FROM collections c
    LEFT JOIN items i ON i.collection_id = c.id AND i.status = 'owned'
    WHERE c.id = ?
    GROUP BY c.id`,
    [id]
  );
}

export async function createCollection(
  data: Pick<Collection, "name" | "icon" | "color"> &
    Partial<Pick<Collection, "description">>
): Promise<number> {
  const d = await getDb();
  const result = await d.runAsync(
    "INSERT INTO collections (name, icon, color, description) VALUES (?, ?, ?, ?)",
    [data.name, data.icon, data.color, data.description ?? null]
  );
  return result.lastInsertRowId;
}

export async function updateCollection(
  id: number,
  data: Partial<Pick<Collection, "color" | "description" | "icon" | "name">>
): Promise<void> {
  const d = await getDb();
  const sets: string[] = [];
  const vals: (string | null)[] = [];
  if (data.name !== undefined) { sets.push("name = ?"); vals.push(data.name); }
  if (data.icon !== undefined) { sets.push("icon = ?"); vals.push(data.icon); }
  if (data.color !== undefined) { sets.push("color = ?"); vals.push(data.color); }
  if (data.description !== undefined) { sets.push("description = ?"); vals.push(data.description); }
  if (sets.length === 0) return;
  sets.push("updated_at = datetime('now')");
  vals.push(id as unknown as string);
  await d.runAsync(`UPDATE collections SET ${sets.join(", ")} WHERE id = ?`, vals);
}

export async function deleteCollection(id: number): Promise<void> {
  const d = await getDb();
  const photos = await d.getAllAsync<Photo>(
    "SELECT p.* FROM photos p JOIN items i ON i.id = p.item_id WHERE i.collection_id = ?",
    [id]
  );
  await d.runAsync("DELETE FROM collections WHERE id = ?", [id]);
  for (const photo of photos) {
    try { new File(photo.uri).delete(); } catch {}
  }
}

// ── Items ──

export async function getItems(
  collectionId: number,
  opts?: {
    filterBrand?: string;
    filterCondition?: string;
    sortDir?: SortDir;
    sortField?: SortField;
    status?: ItemStatus;
  }
): Promise<Item[]> {
  const d = await getDb();
  const status = opts?.status ?? "owned";
  const sortField = opts?.sortField ?? "created_at";
  const sortDir = opts?.sortDir ?? "desc";

  const allowedSort = ["created_at", "name", "purchase_price", "rating", "sort_order"];
  const orderBy = allowedSort.includes(sortField) ? sortField : "created_at";
  const dir = sortDir === "asc" ? "ASC" : "DESC";

  let where = "i.collection_id = ? AND i.status = ?";
  const params: (string | number)[] = [collectionId, status];

  if (opts?.filterBrand) {
    where += " AND i.brand = ?";
    params.push(opts.filterBrand);
  }
  if (opts?.filterCondition) {
    where += " AND i.condition = ?";
    params.push(opts.filterCondition);
  }

  return d.getAllAsync<Item>(
    `SELECT i.*,
      (SELECT p.uri FROM photos p WHERE p.item_id = i.id AND p.is_cover = 1 LIMIT 1) AS cover_photo,
      (SELECT COUNT(*) FROM photos p WHERE p.item_id = i.id) AS photo_count
    FROM items i
    WHERE ${where}
    ORDER BY ${orderBy} ${dir}`,
    params
  );
}

export async function getItem(id: number): Promise<Item | null> {
  const d = await getDb();
  return d.getFirstAsync<Item>(
    `SELECT i.*,
      (SELECT p.uri FROM photos p WHERE p.item_id = i.id AND p.is_cover = 1 LIMIT 1) AS cover_photo,
      (SELECT COUNT(*) FROM photos p WHERE p.item_id = i.id) AS photo_count
    FROM items i WHERE i.id = ?`,
    [id]
  );
}

export async function createItem(
  data: Pick<Item, "collection_id" | "name"> &
    Partial<
      Pick<
        Item,
        | "brand"
        | "condition"
        | "currency"
        | "current_value"
        | "is_wishlist"
        | "location_lat"
        | "location_lng"
        | "model"
        | "notes"
        | "purchase_date"
        | "purchase_location"
        | "purchase_price"
        | "rating"
        | "receipt_uri"
        | "status"
        | "store_name"
      >
    >
): Promise<number> {
  const d = await getDb();
  const status = data.status ?? (data.is_wishlist ? "wishlist" : "owned");
  const result = await d.runAsync(
    `INSERT INTO items (collection_id, name, brand, model, purchase_price, current_value, currency, purchase_date, notes, rating, condition, is_wishlist, status, receipt_uri, purchase_location, location_lat, location_lng, store_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.collection_id,
      data.name,
      data.brand ?? null,
      data.model ?? null,
      data.purchase_price ?? null,
      data.current_value ?? null,
      data.currency ?? "USD",
      data.purchase_date ?? null,
      data.notes ?? null,
      data.rating ?? null,
      data.condition ?? null,
      data.is_wishlist ?? (status === "wishlist" ? 1 : 0),
      status,
      data.receipt_uri ?? null,
      data.purchase_location ?? null,
      data.location_lat ?? null,
      data.location_lng ?? null,
      data.store_name ?? null,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateItem(
  id: number,
  data: Partial<
    Pick<
      Item,
      | "brand"
      | "condition"
      | "currency"
      | "current_value"
      | "is_wishlist"
      | "location_lat"
      | "location_lng"
      | "model"
      | "name"
      | "notes"
      | "purchase_date"
      | "purchase_location"
      | "purchase_price"
      | "rating"
      | "receipt_uri"
      | "sort_order"
      | "status"
      | "store_name"
    >
  >
): Promise<void> {
  const d = await getDb();
  const sets: string[] = [];
  const vals: (string | number | null)[] = [];

  const fields = [
    "brand", "condition", "currency", "current_value", "is_wishlist",
    "location_lat", "location_lng", "model", "name", "notes",
    "purchase_date", "purchase_location", "purchase_price", "rating",
    "receipt_uri", "sort_order", "status", "store_name",
  ] as const;

  for (const field of fields) {
    if (data[field] !== undefined) {
      sets.push(`${field} = ?`);
      vals.push(data[field] as string | number | null);
    }
  }
  if (sets.length === 0) return;
  sets.push("updated_at = datetime('now')");
  vals.push(id);
  await d.runAsync(`UPDATE items SET ${sets.join(", ")} WHERE id = ?`, vals);
}

export async function updateItemSortOrders(
  updates: { id: number; sort_order: number }[]
): Promise<void> {
  const d = await getDb();
  await d.withTransactionAsync(async () => {
    for (const { id, sort_order } of updates) {
      await d.runAsync("UPDATE items SET sort_order = ? WHERE id = ?", [sort_order, id]);
    }
  });
}

export async function deleteItem(id: number): Promise<void> {
  const d = await getDb();
  const photos = await d.getAllAsync<Photo>(
    "SELECT * FROM photos WHERE item_id = ?",
    [id]
  );
  await d.runAsync("DELETE FROM items WHERE id = ?", [id]);
  for (const photo of photos) {
    try { new File(photo.uri).delete(); } catch {}
  }
}

// ── Photos ──

export async function getPhotos(itemId: number): Promise<Photo[]> {
  const d = await getDb();
  return d.getAllAsync<Photo>(
    "SELECT * FROM photos WHERE item_id = ? ORDER BY is_cover DESC, sort_order",
    [itemId]
  );
}

export async function addPhoto(
  itemId: number,
  uri: string,
  isCover: boolean = false
): Promise<number> {
  const d = await getDb();
  const photosDir = new Directory(Paths.document, "photos/");
  if (!photosDir.exists) {
    photosDir.create();
  }

  const filename = `stash_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const source = new File(uri);
  if (!source.exists) throw new Error("Source photo file not found");
  const dest = new File(photosDir, filename);
  source.copy(dest);
  const destUri = dest.uri;

  let insertId = 0;
  await d.withTransactionAsync(async () => {
    if (isCover) {
      await d.runAsync("UPDATE photos SET is_cover = 0 WHERE item_id = ?", [itemId]);
    }
    const result = await d.runAsync(
      "INSERT INTO photos (item_id, uri, is_cover) VALUES (?, ?, ?)",
      [itemId, destUri, isCover ? 1 : 0]
    );
    insertId = result.lastInsertRowId;
  });
  return insertId;
}

export async function setCoverPhoto(
  itemId: number,
  photoId: number
): Promise<void> {
  const d = await getDb();
  await d.withTransactionAsync(async () => {
    await d.runAsync("UPDATE photos SET is_cover = 0 WHERE item_id = ?", [itemId]);
    await d.runAsync("UPDATE photos SET is_cover = 1 WHERE id = ?", [photoId]);
  });
}

export async function deletePhoto(id: number): Promise<void> {
  const d = await getDb();
  const photo = await d.getFirstAsync<Photo>("SELECT * FROM photos WHERE id = ?", [id]);
  if (photo) {
    await d.runAsync("DELETE FROM photos WHERE id = ?", [id]);
    try { new File(photo.uri).delete(); } catch {}
  }
}

// ── Tags ──

export async function getTags(): Promise<Tag[]> {
  const d = await getDb();
  return d.getAllAsync<Tag>(`
    SELECT t.*, COUNT(it.item_id) AS item_count
    FROM tags t
    LEFT JOIN item_tags it ON it.tag_id = t.id
    GROUP BY t.id
    ORDER BY t.name
  `);
}

export async function createTag(name: string, color: string): Promise<number> {
  const d = await getDb();
  const result = await d.runAsync(
    "INSERT INTO tags (name, color) VALUES (?, ?)",
    [name, color]
  );
  return result.lastInsertRowId;
}

export async function deleteTag(id: number): Promise<void> {
  const d = await getDb();
  await d.runAsync("DELETE FROM tags WHERE id = ?", [id]);
}

export async function getItemTags(itemId: number): Promise<Tag[]> {
  const d = await getDb();
  return d.getAllAsync<Tag>(
    `SELECT t.* FROM tags t
     JOIN item_tags it ON it.tag_id = t.id
     WHERE it.item_id = ?
     ORDER BY t.name`,
    [itemId]
  );
}

export async function setItemTags(
  itemId: number,
  tagIds: number[]
): Promise<void> {
  const d = await getDb();
  await d.withTransactionAsync(async () => {
    await d.runAsync("DELETE FROM item_tags WHERE item_id = ?", [itemId]);
    for (const tagId of tagIds) {
      await d.runAsync(
        "INSERT INTO item_tags (item_id, tag_id) VALUES (?, ?)",
        [itemId, tagId]
      );
    }
  });
}

// ── Custom Fields ──

export async function getCustomFields(
  collectionId: number
): Promise<CustomField[]> {
  const d = await getDb();
  return d.getAllAsync<CustomField>(
    "SELECT * FROM custom_fields WHERE collection_id = ? ORDER BY sort_order",
    [collectionId]
  );
}

export async function createCustomField(
  collectionId: number,
  name: string,
  fieldType: string = "text",
  options?: string
): Promise<number> {
  const d = await getDb();
  const result = await d.runAsync(
    "INSERT INTO custom_fields (collection_id, name, field_type, options) VALUES (?, ?, ?, ?)",
    [collectionId, name, fieldType, options ?? null]
  );
  return result.lastInsertRowId;
}

export async function deleteCustomField(id: number): Promise<void> {
  const d = await getDb();
  await d.runAsync("DELETE FROM custom_fields WHERE id = ?", [id]);
}

export async function getCustomFieldValues(
  itemId: number
): Promise<CustomFieldValue[]> {
  const d = await getDb();
  return d.getAllAsync<CustomFieldValue>(
    "SELECT * FROM custom_field_values WHERE item_id = ?",
    [itemId]
  );
}

export async function setCustomFieldValue(
  itemId: number,
  fieldId: number,
  value: string | null
): Promise<void> {
  const d = await getDb();
  await d.runAsync(
    `INSERT INTO custom_field_values (item_id, field_id, value)
     VALUES (?, ?, ?)
     ON CONFLICT(item_id, field_id) DO UPDATE SET value = excluded.value`,
    [itemId, fieldId, value]
  );
}

// ── Search ──

export async function searchItems(query: string): Promise<Item[]> {
  const d = await getDb();
  const sanitized = query.trim().replace(/['"(){}[\]*:^~\-!@#$%&+=|\\<>,./;?]/g, " ");
  const words = sanitized.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const ftsQuery = words.map((w) => `${w}*`).join(" ");
  try {
    return await d.getAllAsync<Item>(
      `SELECT i.*,
        (SELECT p.uri FROM photos p WHERE p.item_id = i.id AND p.is_cover = 1 LIMIT 1) AS cover_photo,
        (SELECT COUNT(*) FROM photos p WHERE p.item_id = i.id) AS photo_count
      FROM items i
      WHERE i.id IN (SELECT rowid FROM items_fts WHERE items_fts MATCH ?)
      ORDER BY i.name`,
      [ftsQuery]
    );
  } catch {
    return [];
  }
}

// ── Stats ──

export async function getStats(): Promise<{
  collection_count: number;
  item_count: number;
  photo_count: number;
  sold_count: number;
  total_value: number;
  wishlist_count: number;
}> {
  const d = await getDb();
  const stats = await d.getFirstAsync<{
    collection_count: number;
    item_count: number;
    sold_count: number;
    total_value: number;
    wishlist_count: number;
  }>(`
    SELECT
      (SELECT COUNT(*) FROM collections) AS collection_count,
      (SELECT COUNT(*) FROM items WHERE status = 'owned') AS item_count,
      (SELECT COALESCE(SUM(COALESCE(current_value, purchase_price, 0)), 0) FROM items WHERE status = 'owned') AS total_value,
      (SELECT COUNT(*) FROM items WHERE status = 'wishlist') AS wishlist_count,
      (SELECT COUNT(*) FROM items WHERE status = 'sold') AS sold_count
  `);
  const photoStats = await d.getFirstAsync<{ photo_count: number }>(
    "SELECT COUNT(*) AS photo_count FROM photos"
  );
  return {
    collection_count: stats?.collection_count ?? 0,
    item_count: stats?.item_count ?? 0,
    photo_count: photoStats?.photo_count ?? 0,
    sold_count: stats?.sold_count ?? 0,
    total_value: stats?.total_value ?? 0,
    wishlist_count: stats?.wishlist_count ?? 0,
  };
}

// ── Export ──

export async function exportAllData(): Promise<{
  collections: Collection[];
  items: (Item & { tags: Tag[] })[];
}> {
  const d = await getDb();
  const collections = await d.getAllAsync<Collection>(
    "SELECT * FROM collections ORDER BY sort_order, name"
  );
  const allItems = await d.getAllAsync<Item>(
    "SELECT * FROM items ORDER BY collection_id, sort_order, name"
  );
  const items: (Item & { tags: Tag[] })[] = [];
  for (const item of allItems) {
    const tags = await getItemTags(item.id);
    items.push({ ...item, tags });
  }
  return { collections, items };
}

export function dataToCSV(
  items: (Item & { tags: Tag[] })[],
  t?: (key: string) => string
): string {
  const label = (key: string, fallback: string) => t ? t(key) : fallback;
  const headers = [
    label("csvName", "Name"),
    label("csvBrand", "Brand"),
    label("csvModel", "Model"),
    label("csvPurchasePrice", "Purchase Price"),
    label("csvCurrentValue", "Current Value"),
    label("csvCurrency", "Currency"),
    label("csvPurchaseDate", "Purchase Date"),
    label("csvCondition", "Condition"),
    label("csvRating", "Rating"),
    label("csvStatus", "Status"),
    label("csvTags", "Tags"),
    label("csvNotes", "Notes"),
    label("csvCreatedAt", "Created At"),
  ];
  const rows = items.map((i) => [
    csvEscape(i.name),
    csvEscape(i.brand),
    csvEscape(i.model),
    i.purchase_price ?? "",
    i.current_value ?? "",
    i.currency,
    i.purchase_date ?? "",
    i.condition ?? "",
    i.rating ?? "",
    i.status,
    csvEscape(i.tags.map((t) => t.name).join(", ")),
    csvEscape(i.notes),
    i.created_at,
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function csvEscape(val: string | null | undefined): string {
  if (val == null) return "";
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

// ── Items with location (for dashboard map) ──

export async function getItemsWithLocations(): Promise<
  { id: number; location_lat: number; location_lng: number; name: string }[]
> {
  const d = await getDb();
  return d.getAllAsync(
    "SELECT id, name, location_lat, location_lng FROM items WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL"
  );
}

// ── Brands (for filter) ──

export async function getBrands(collectionId: number): Promise<string[]> {
  const d = await getDb();
  const rows = await d.getAllAsync<{ brand: string }>(
    "SELECT DISTINCT brand FROM items WHERE collection_id = ? AND brand IS NOT NULL AND brand != '' ORDER BY brand",
    [collectionId]
  );
  return rows.map((r) => r.brand);
}
