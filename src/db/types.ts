export type Condition = "new" | "like_new" | "good" | "fair" | "poor";
export type FieldType = "text" | "number" | "date" | "select";
export type ItemStatus = "owned" | "wishlist" | "sold" | "traded";
export type SortField = "created_at" | "name" | "purchase_price" | "rating" | "sort_order";
export type SortDir = "asc" | "desc";
export type ViewMode = "grid" | "large" | "list";

export interface Collection {
  id: number;
  color: string;
  created_at: string;
  description: string | null;
  icon: string;
  name: string;
  sort_order: number;
  updated_at: string;
  item_count?: number;
  total_value?: number;
  cover_photo?: string | null;
}

export interface CustomField {
  id: number;
  collection_id: number;
  field_type: FieldType;
  name: string;
  options: string | null;
  sort_order: number;
}

export interface CustomFieldValue {
  id: number;
  field_id: number;
  item_id: number;
  value: string | null;
}

export interface Item {
  id: number;
  collection_id: number;
  brand: string | null;
  condition: Condition | null;
  created_at: string;
  currency: string;
  current_value: number | null;
  is_wishlist: number;
  location_lat: number | null;
  location_lng: number | null;
  model: string | null;
  name: string;
  notes: string | null;
  purchase_date: string | null;
  purchase_location: string | null;
  purchase_price: number | null;
  rating: number | null;
  receipt_uri: string | null;
  sort_order: number;
  store_name: string | null;
  status: ItemStatus;
  updated_at: string;
  cover_photo?: string | null;
  photo_count?: number;
  tags?: Tag[];
  custom_fields?: Record<string, string | null>;
}

export interface Photo {
  id: number;
  item_id: number;
  created_at: string;
  is_cover: number;
  sort_order: number;
  uri: string;
}

export interface Tag {
  id: number;
  color: string;
  name: string;
  item_count?: number;
}

export interface ItemTag {
  item_id: number;
  tag_id: number;
}
