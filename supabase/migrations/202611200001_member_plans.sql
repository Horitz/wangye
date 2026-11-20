CREATE TABLE IF NOT EXISTS studentpath.member_plans (
  user_id text PRIMARY KEY REFERENCES studentpath.member_users(id) ON DELETE CASCADE,
  revision integer NOT NULL,
  plan_json text NOT NULL
);
ALTER TABLE studentpath.member_plans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON studentpath.member_plans FROM PUBLIC, anon, authenticated, service_role;
