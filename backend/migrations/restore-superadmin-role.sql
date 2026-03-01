-- Migration: Restore superadmin role
-- Date: 2026-02-28
-- Description: Restore superadmin role for user alexismomcilovic@gmail.com

UPDATE users
SET role = 'superadmin'
WHERE email = 'alexismomcilovic@gmail.com';

-- Verify the update
SELECT id, email, role, "firstName", "lastName"
FROM users
WHERE email = 'alexismomcilovic@gmail.com';
