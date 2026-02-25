import { create } from "zustand";

import * as api from "src/services/api";
import type { Item, ItemStatus, Photo, SortDir, SortField, Tag, ViewMode } from "src/services/api";

interface ItemsState {
  items: Item[];
  loading: boolean;
  photos: Photo[];
  sortDir: SortDir;
  sortField: SortField;
  tags: Tag[];
  viewMode: ViewMode;

  addPhoto: (itemId: number, uri: string, isCover?: boolean) => Promise<number>;
  create: (
    data: Pick<Item, "collection_id" | "name"> &
      Partial<
        Pick<
          Item,
          | "brand"
          | "condition"
          | "currency"
          | "current_value"
          | "is_wishlist"
          | "model"
          | "notes"
          | "purchase_date"
          | "purchase_price"
          | "rating"
          | "status"
        >
      >
  ) => Promise<number>;
  delete: (id: number, collectionId: number) => Promise<void>;
  load: (
    collectionId: number,
    opts?: {
      filterBrand?: string;
      filterCondition?: string;
      status?: ItemStatus;
    }
  ) => Promise<void>;
  loadPhotos: (itemId: number) => Promise<void>;
  loadTags: (itemId: number) => Promise<void>;
  removePhoto: (photoId: number, itemId: number) => Promise<void>;
  reorder: (updates: { id: number; sort_order: number }[]) => Promise<void>;
  setCover: (itemId: number, photoId: number) => Promise<void>;
  setSort: (field: SortField, dir: SortDir) => void;
  setTags: (itemId: number, tagIds: number[]) => Promise<void>;
  setViewMode: (mode: ViewMode) => void;
  update: (
    id: number,
    data: Partial<
      Pick<
        Item,
        | "brand"
        | "condition"
        | "currency"
        | "current_value"
        | "is_wishlist"
        | "model"
        | "name"
        | "notes"
        | "purchase_date"
        | "purchase_price"
        | "rating"
        | "sort_order"
        | "status"
      >
    >,
    collectionId: number
  ) => Promise<void>;
}

export const useItems = create<ItemsState>((set, get) => ({
  items: [],
  loading: false,
  photos: [],
  sortDir: "desc",
  sortField: "created_at",
  tags: [],
  viewMode: "grid",

  async addPhoto(itemId, uri, isCover) {
    const id = await api.addPhoto(itemId, uri, isCover);
    await get().loadPhotos(itemId);
    return id;
  },

  async create(data) {
    return api.createItem(data);
  },

  async delete(id, collectionId) {
    await api.deleteItem(id);
    await get().load(collectionId);
  },

  async load(collectionId, opts) {
    if (get().items.length === 0) set({ loading: true });
    try {
      const { sortDir, sortField } = get();
      const items = await api.getItems(collectionId, {
        filterBrand: opts?.filterBrand,
        filterCondition: opts?.filterCondition,
        sortDir,
        sortField,
        status: opts?.status ?? "owned",
      });
      set({ items, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  async loadPhotos(itemId) {
    const photos = await api.getPhotos(itemId);
    set({ photos });
  },

  async loadTags(itemId) {
    const tags = await api.getItemTags(itemId);
    set({ tags });
  },

  async removePhoto(photoId, itemId) {
    await api.deletePhoto(photoId);
    await get().loadPhotos(itemId);
  },

  async reorder(updates) {
    await api.updateItemSortOrders(updates);
    set((s) => ({
      items: s.items.map((item) => {
        const u = updates.find((x) => x.id === item.id);
        return u ? { ...item, sort_order: u.sort_order } : item;
      }).sort((a, b) => a.sort_order - b.sort_order),
    }));
  },

  async setCover(itemId, photoId) {
    await api.setCoverPhoto(itemId, photoId);
    await get().loadPhotos(itemId);
  },

  setSort(field, dir) {
    set({ sortDir: dir, sortField: field });
  },

  async setTags(itemId, tagIds) {
    await api.setItemTags(itemId, tagIds);
    await get().loadTags(itemId);
  },

  setViewMode(mode) {
    set({ viewMode: mode });
  },

  async update(id, data, collectionId) {
    await api.updateItem(id, data);
    await get().load(collectionId);
  },
}));
