-- Migration: Replace existing menu slugs with unique 6-character alphanumeric codes.
-- Fixes double-encoding issues with Arabic characters in URLs.
-- Run this in Supabase SQL Editor.

DO $$
DECLARE
  r RECORD;
  new_slug TEXT;
  slug_chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  used_slugs TEXT[] := '{}';
  i INT;
  collision_count INT := 0;
BEGIN
  FOR r IN
    SELECT key, value
    FROM kv_store_47a828b2
    WHERE key LIKE 'menu:%' OR key LIKE 'tenant:%:menu:%'
  LOOP
    -- Generate unique 6-char alphanumeric slug
    LOOP
      new_slug := '';
      FOR i IN 1..6 LOOP
        new_slug := new_slug || substr(slug_chars, floor(random() * 36 + 1)::int, 1);
      END LOOP;

      IF NOT (new_slug = ANY(used_slugs)) THEN
        used_slugs := array_append(used_slugs, new_slug);
        EXIT;
      END IF;

      collision_count := collision_count + 1;
      IF collision_count > 100 THEN
        RAISE EXCEPTION 'Too many slug collisions';
      END IF;
    END LOOP;

    UPDATE kv_store_47a828b2
    SET value = jsonb_set(
      COALESCE(value, '{}'::jsonb),
      '{slug}',
      to_jsonb(new_slug::text)
    )
    WHERE key = r.key;
  END LOOP;
END $$;
