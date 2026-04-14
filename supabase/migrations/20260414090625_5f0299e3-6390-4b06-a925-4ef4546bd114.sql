
UPDATE openings SET is_available = true 
WHERE is_available = false 
AND id NOT IN (
  SELECT DISTINCT opening_id FROM appointments WHERE status = 'confirmed'
)
AND id IN (
  SELECT DISTINCT opening_id FROM appointments WHERE status = 'pending'
);
