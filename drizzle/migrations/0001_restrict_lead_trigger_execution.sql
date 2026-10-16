REVOKE EXECUTE ON FUNCTION public.validate_lead() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_lead() TO service_role;