# Fern Kitchen data architecture

## Local backups

Backups use a versioned JSON envelope (`format`, `backupVersion`, and `schemaVersion`). Version 1 contains recipes, ingredient and step rows, favorite state, personal notes, and pantry entries. Local image paths are deliberately omitted: they are device-specific and the image files are not portable in this JSON format.

Import validates the complete envelope and entity identifiers before touching SQLite. It adds records by UUID, skips existing root UUIDs, and wraps all inserts in one SQLite transaction. A constraint or database error rolls the transaction back. Import never overwrites existing records.

## Future multi-user evolution

Current screens use domain repositories and hooks; they do not access SQLite. To add sync later, retain those UI-facing repository contracts and introduce a repository port/use-case boundary, with SQLite as the offline adapter and a remote adapter behind a sync coordinator. Keep UUIDs stable across adapters and use `owner_user_id` as the ownership key. A signed-in identity would scope private queries to its owner; public recipes would be exposed through explicit visibility and server-side authorization rules. Add server revision/version metadata and a documented conflict policy before synchronization, and treat local media as separately uploadable attachments with stable media IDs. None of these network or account capabilities is implemented now.

Schema changes remain additive SQLite migrations (current schema version 11), preserving local-first operation and allowing later adapters to map existing records without rewriting screen components. Mutable user-owned root entities carry nullable `owner_user_id`; recipe visibility is explicitly `private` by default and can represent `public` recipes later. Child records inherit ownership through their parent where a separate owner column would duplicate data.
