-- SherPay RLS isolation regression test (run after the hardening migration)
-- Proves at the DATABASE level that one authenticated user cannot read,
-- insert into, update, or delete another user's rows — no frontend involved.
-- Run in SQL Editor as a logged-in user (or wrap with request.jwt.claims).
-- Expected: every "cross-user" check below returns 0 rows / raises RLS deny.

-- 1. you can see your own rows (sanity: >0 after you create data in the app)
select count(*) as own_expenses_visible
from public.expenses
where user_id = auth.uid();

-- 2. cross-user rows are invisible even with a direct SELECT (RLS filters them)
--    Replace the UUID with a DIFFERENT user's id (e.g. from auth.users).
--    Expected: 0, even if that user owns rows.
-- select count(*) as cross_user_expenses_visible
-- from public.expenses
-- where user_id = '00000000-0000-0000-0000-000000000000';

-- 3. cross-user INSERT is denied (WITH CHECK). Expected: new row violates RLS.
-- insert into public.expenses (user_id, amount, category, date)
-- values ('00000000-0000-0000-0000-000000000000', 1.00, 'Test', current_date);

-- 4. cross-user UPDATE is denied (USING + WITH CHECK). Expected: 0 rows / deny.
-- update public.expenses set amount = 999999
-- where user_id = '00000000-0000-0000-0000-000000000000';

-- 5. cross-user DELETE is denied (USING). Expected: 0 rows / deny.
-- delete from public.expenses
-- where user_id = '00000000-0000-0000-0000-000000000000';

-- 6. repeat 2–5 for income, transactions, categories, profiles, cloud_state.
--    All six tables carry the same per-operation policies from
--    20261007000000_user_isolation.sql.
