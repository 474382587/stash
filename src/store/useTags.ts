import { create } from "zustand";

import * as api from "src/services/api";
import type { Tag } from "src/services/api";

interface TagsState {
  loading: boolean;
  tags: Tag[];

  create: (name: string, color: string) => Promise<number>;
  delete: (id: number) => Promise<void>;
  load: () => Promise<void>;
}

export const useTags = create<TagsState>((set, get) => ({
  loading: false,
  tags: [],

  async create(name, color) {
    const id = await api.createTag(name, color);
    await get().load();
    return id;
  },

  async delete(id) {
    await api.deleteTag(id);
    await get().load();
  },

  async load() {
    if (get().tags.length === 0) set({ loading: true });
    try {
      const tags = await api.getTags();
      set({ loading: false, tags });
    } catch {
      set({ loading: false });
    }
  },
}));
