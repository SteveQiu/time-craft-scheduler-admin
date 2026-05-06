-- No schema changes required.
-- Opening location is now stored as JSON string: {"city","province","country","zip"}
-- Existing freetext values are handled by parseLocation() in src/lib/address.ts
-- Run this as acknowledgment only.
SELECT 'location column already supports JSON text storage' AS note;
