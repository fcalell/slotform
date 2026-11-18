// The pragmas every connection to an app's sqlite file shares:
// docs/architecture/plugins/db.md, "Database on the node target".

export const WAL = "journal_mode = WAL";

// A writer waits this long for the file's lock instead of failing with `SQLITE_BUSY`.
export const BUSY_TIMEOUT = "busy_timeout = 5000";

// SQLite ignores foreign keys unless each connection asks.
export const FOREIGN_KEYS = "foreign_keys = ON";
