-- Drop listings table completely (use with caution!)
-- This will delete all listings data

DROP TABLE IF EXISTS listings CASCADE;

-- Note: TypeORM will recreate the table with the correct schema when you run the seed
