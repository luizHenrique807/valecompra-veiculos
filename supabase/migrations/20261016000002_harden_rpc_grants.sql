-- Supabase may pregrant EXECUTE directly to anon for newly created RPCs.
-- Remove inherited/direct grants from functions that must require a signed-in user.
REVOKE EXECUTE ON FUNCTION public.claim_owner_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_owner_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) TO authenticated, service_role;
-- Public visitor upload authorization and per-IP rate limiting remain explicitly
-- callable under anon because they validate their arguments and are used by RLS.
