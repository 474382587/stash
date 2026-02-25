/**
 * API Service Layer
 *
 * All data access goes through this module. Currently backed by local SQLite.
 * To connect a backend service in the future, swap the implementations here
 * without touching stores or UI components.
 */

import * as db from "src/db/database";
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
  ViewMode,
} from "src/db/types";

// ── Collections ──

export const getCollections = db.getCollections;
export const getCollection = db.getCollection;
export const createCollection = db.createCollection;
export const updateCollection = db.updateCollection;
export const deleteCollection = db.deleteCollection;

// ── Items ──

export const getItems = db.getItems;
export const getItem = db.getItem;
export const createItem = db.createItem;
export const updateItem = db.updateItem;
export const updateItemSortOrders = db.updateItemSortOrders;
export const deleteItem = db.deleteItem;

// ── Photos ──

export const getPhotos = db.getPhotos;
export const addPhoto = db.addPhoto;
export const setCoverPhoto = db.setCoverPhoto;
export const deletePhoto = db.deletePhoto;

// ── Tags ──

export const getTags = db.getTags;
export const createTag = db.createTag;
export const deleteTag = db.deleteTag;
export const getItemTags = db.getItemTags;
export const setItemTags = db.setItemTags;

// ── Custom Fields ──

export const getCustomFields = db.getCustomFields;
export const createCustomField = db.createCustomField;
export const deleteCustomField = db.deleteCustomField;
export const getCustomFieldValues = db.getCustomFieldValues;
export const setCustomFieldValue = db.setCustomFieldValue;

// ── Search ──

export const searchItems = db.searchItems;

// ── Stats & Dashboard ──

export const getStats = db.getStats;
export const getItemsWithLocations = db.getItemsWithLocations;
export const getBrands = db.getBrands;

// ── Export ──

export const exportAllData = db.exportAllData;
export const dataToCSV = db.dataToCSV;

// ── Settings ──

export { getDb } from "src/db/database";

// ── Types re-export for convenience ──

export type {
  Collection,
  CustomField,
  CustomFieldValue,
  Item,
  ItemStatus,
  Photo,
  SortDir,
  SortField,
  Tag,
  ViewMode,
};
