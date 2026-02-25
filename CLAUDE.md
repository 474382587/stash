# Stash — Project Context

## Overview

Stash is a personal collection cataloging app built with React Native (Expo). Users can organize items (shoes, watches, etc.) into collections, track purchase details, photos, locations, and export data. The app supports multiple languages and dark/light themes.

**Bundle ID:** `com.jj.stash`
**Status:** Pre-release (not yet on App Store)

## Tech Stack

- **Framework:** React Native 0.81 + Expo SDK 54 (New Architecture enabled)
- **Language:** TypeScript (strict mode)
- **Routing:** Expo Router (file-based, nested Stack + Tabs)
- **State Management:** Zustand (4 stores)
- **Database:** expo-sqlite with WAL mode, FTS5 full-text search
- **i18n:** i18next + react-i18next (en, zh, zh-Hant, ja, ko)
- **Font:** Inter (via @expo-google-fonts/inter)
- **Maps:** react-native-maps (Apple Maps on iOS)
- **Geocoding:** OpenStreetMap Nominatim API (rate-limited, no API key)

## Directory Structure

```
stash/
├── app/                          # Expo Router pages
│   ├── _layout.tsx               # Root Stack navigator + font loading
│   ├── (tabs)/                   # Bottom tab navigator
│   │   ├── _layout.tsx           # Tab config (Home, Collections, Search, Settings)
│   │   ├── index.tsx             # Dashboard/Home (stats, map, recent collections)
│   │   ├── collections.tsx       # All collections list
│   │   ├── search.tsx            # FTS5 search
│   │   └── settings.tsx          # Language, currency, tags, export
│   ├── add-collection.tsx        # Create collection (modal)
│   ├── edit-collection.tsx       # Edit collection (modal)
│   ├── add-item.tsx              # Add/edit item (modal, dual-purpose via ?itemId=)
│   ├── collection/[id].tsx       # Collection detail (status tabs, sort, filter, reorder)
│   └── item/[id].tsx             # Item detail (photos, share card, map)
├── src/
│   ├── components/               # Reusable UI components
│   │   ├── Logo.tsx              # Nav bar logo (Inter_900Black text + accent dot)
│   │   ├── StatCard.tsx          # Dashboard stat card
│   │   ├── ItemCard.tsx          # Grid/large item card
│   │   ├── ItemListRow.tsx       # List view item row
│   │   ├── ShareCard.tsx         # Shareable collection card (react-native-view-shot)
│   │   ├── Button.tsx            # Primary button
│   │   ├── Card.tsx              # Generic card wrapper
│   │   ├── EmptyState.tsx        # Empty state placeholder
│   │   └── TagPill.tsx           # Tag badge
│   ├── db/
│   │   ├── database.ts           # SQLite operations (CRUD, search, stats, export)
│   │   ├── types.ts              # TypeScript interfaces (Collection, Item, Photo, Tag, etc.)
│   │   └── migrations/
│   │       ├── index.ts          # Migration runner (PRAGMA user_version)
│   │       └── v1-initial.ts     # Single consolidated schema
│   ├── services/
│   │   └── api.ts                # API service layer (proxies db.*, swap for BE later)
│   ├── store/
│   │   ├── useCollections.ts     # Collections CRUD + custom fields
│   │   ├── useItems.ts           # Items CRUD + photos + tags + sort/filter/view
│   │   ├── useSettings.ts        # Currency + key-value settings
│   │   └── useTags.ts            # Global tag management
│   ├── i18n/
│   │   ├── index.ts              # i18next config + device locale detection
│   │   ├── en.ts                 # English
│   │   ├── zh.ts                 # Simplified Chinese
│   │   ├── zhHant.ts             # Traditional Chinese
│   │   ├── ja.ts                 # Japanese
│   │   └── ko.ts                 # Korean
│   ├── lib/
│   │   ├── export.ts             # JSON/CSV export via expo-sharing
│   │   ├── format.ts             # Money, date, condition formatters
│   │   └── photos.ts             # Image picker helpers (library, camera, multi-select)
│   └── theme/
│       ├── colors.ts             # Midnight Indigo color scheme (dark/light)
│       └── index.ts              # spacing, radius, fontSize constants + useTheme()
└── assets/                       # App icons (1024x1024, square, no rounded corners)
```

## Architecture Patterns

### Data Flow

```
UI Components → Zustand Stores → src/services/api.ts → src/db/database.ts → SQLite
```

**Important:** All data access goes through `src/services/api.ts`. This is an abstraction layer designed to be swapped with HTTP/REST calls when a backend is added. Stores and UI should never import from `src/db/database` or `src/db/types` directly — always use `src/services/api`.

### Database Schema (Single Migration)

All tables are defined in `src/db/migrations/v1-initial.ts`. Key tables:

- **collections** — name, icon (emoji), color, description, sort_order
- **items** — name, brand, model, price, currency, status (owned/wishlist/sold/traded), condition, location (lat/lng), store_name, receipt_uri
- **photos** — item_id, uri (local file), is_cover, sort_order
- **tags** — name, color (many-to-many with items via item_tags)
- **custom_fields** / **custom_field_values** — per-collection custom fields
- **settings** — key-value store
- **items_fts** — FTS5 virtual table for search (auto-synced via triggers)

### Item Statuses

Items have a `status` field: `owned`, `wishlist`, `sold`, `traded`. The collection detail page shows tabs for each status.

### Store Loading Strategy

- Stores only show loading spinner on first load (when data array is empty)
- Tab switches use silent refresh (no spinner)
- Manual pull-to-refresh uses local `refreshing` state
- Dashboard stats/map pins refresh on every focus via `useFocusEffect`

### Photo Storage

Photos are copied to `Paths.document/photos/` with unique filenames. URIs stored in the `photos` table reference local file paths.

## Theme — "Midnight Indigo"

- **Dark primary:** `#6C63FF` (violet-blue)
- **Accent:** `#A78BFA` (lavender)
- **Dark background:** `#0A0E1A`
- **Light background:** `#F8F9FC`

## Coding Conventions

- No `React.FC` — use function declarations
- `import type` for type-only imports
- Alphabetical import ordering: React → libraries → common → app → hooks → store
- Absolute imports via `src/*` path alias
- Alpha-order object properties
- Avoid lodash.get — use direct property access with optional chaining

## Currencies Supported

CAD, CNY, EUR, GBP, HKD, JPY, KRW, TWD, USD (alphabetically sorted, default: USD)

## Known Development Issues

- `react-native-svg` causes `Tried to register two views with the same name RNSVG*` errors during HMR — harmless, fix by restarting with `npx expo start --clear`
- After schema changes, delete the app data or reinstall to reset the database (no migration backward compat needed pre-launch)

## Analytics — PostHog

PostHog is integrated via `posthog-react-native` with `PostHogProvider` wrapping the app in `app/_layout.tsx`.

**Tracked events:**

| Event | Properties | Location |
|---|---|---|
| `collection_created` | `icon` | add-collection.tsx |
| `collection_updated` | — | edit-collection.tsx |
| `collection_deleted` | — | collection/[id].tsx |
| `item_created` | `status`, `currency`, `has_photos`, `photo_count`, `has_location`, `has_receipt`, `tag_count` | add-item.tsx |
| `item_updated` | `status`, `currency` | add-item.tsx |
| `item_deleted` | — | item/[id].tsx |
| `item_shared` | — | item/[id].tsx |
| `search_performed` | `result_count` | search.tsx |
| `language_changed` | `language` | settings.tsx |
| `currency_changed` | `currency` | settings.tsx |
| `tag_created` | — | settings.tsx |
| `data_exported` | `format` (json/csv) | settings.tsx |

PostHog also auto-captures screen views and app lifecycle events.

## Future Considerations

- **Backend service:** The `src/services/api.ts` layer is ready to be swapped from local SQLite to HTTP calls
- **Cloud storage:** Planned for future — will need photo upload/sync
- **Ads:** Free app with ads is acceptable for App Store
