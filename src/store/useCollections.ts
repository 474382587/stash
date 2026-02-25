import { create } from "zustand";

import * as api from "src/services/api";
import type { Collection, CustomField } from "src/services/api";

interface CollectionsState {
  collections: Collection[];
  customFields: Record<number, CustomField[]>;
  loading: boolean;

  addCustomField: (
    collectionId: number,
    name: string,
    fieldType?: string,
    options?: string
  ) => Promise<number>;
  create: (
    data: Pick<Collection, "color" | "icon" | "name"> &
      Partial<Pick<Collection, "description">>
  ) => Promise<number>;
  delete: (id: number) => Promise<void>;
  load: () => Promise<void>;
  loadCustomFields: (collectionId: number) => Promise<void>;
  removeCustomField: (id: number, collectionId: number) => Promise<void>;
  update: (
    id: number,
    data: Partial<Pick<Collection, "color" | "description" | "icon" | "name">>
  ) => Promise<void>;
}

export const useCollections = create<CollectionsState>((set, get) => ({
  collections: [],
  customFields: {},
  loading: false,

  async addCustomField(collectionId, name, fieldType, options) {
    const id = await api.createCustomField(collectionId, name, fieldType, options);
    await get().loadCustomFields(collectionId);
    return id;
  },

  async create(data) {
    const id = await api.createCollection(data);
    await get().load();
    return id;
  },

  async delete(id) {
    await api.deleteCollection(id);
    await get().load();
  },

  async load() {
    if (get().collections.length === 0) set({ loading: true });
    try {
      const collections = await api.getCollections();
      set({ collections, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  async loadCustomFields(collectionId) {
    const fields = await api.getCustomFields(collectionId);
    set((s) => ({
      customFields: { ...s.customFields, [collectionId]: fields },
    }));
  },

  async removeCustomField(id, collectionId) {
    await api.deleteCustomField(id);
    await get().loadCustomFields(collectionId);
  },

  async update(id, data) {
    await api.updateCollection(id, data);
    await get().load();
  },
}));
