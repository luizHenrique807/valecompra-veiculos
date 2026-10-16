-- ValeCompra standalone secure access without exposing a service-role key.
-- Anonymous visitors may submit a lead and upload up to five images
-- during a short window, identified by an unguessable lead UUID and phone hash.
-- Only an authenticated administrator can list or download images.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
CREATE TABLE IF NOT EXISTS private.owner_config (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton = true),
  email text NOT NULL CHECK (email = lower(email))
);
REVOKE ALL ON private.owner_config FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_owner_admin()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE verified boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT EXISTS(
    SELECT 1 FROM auth.users u
    JOIN private.owner_config c ON c.singleton = true AND lower(u.email) = c.email
    WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
  ) INTO verified;
  IF NOT verified THEN RETURN false; END IF;
  INSERT INTO public.user_roles(user_id,role)
  VALUES(auth.uid(), 'admin'::public.app_role)
  ON CONFLICT (user_id,role) DO NOTHING;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_owner_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_owner_admin() TO authenticated;

-- The website server computes a hash of the visitor's IP; do not store IPs.
GRANT EXECUTE ON FUNCTION public.consume_lead_limit(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.photo_upload_authorized(path text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
DECLARE lead_uuid uuid; phone_hash text;
BEGIN
  IF path !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{64}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp)$'
  THEN RETURN false; END IF;
  lead_uuid := split_part(path,'/',1)::uuid;
  phone_hash := left(split_part(path,'/',2),64);
  RETURN
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_uuid
        AND l.created_at > now() - interval '30 minutes'
        AND encode(sha256(convert_to(l.whatsapp,'UTF8')),'hex') = phone_hash
    )
    AND (
      SELECT count(*) FROM storage.objects o
      WHERE o.bucket_id = 'lead-photos'
        AND o.name LIKE (lead_uuid::text || '/%')
    ) < 5;
END;
$$;
REVOKE ALL ON FUNCTION public.photo_upload_authorized(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.photo_upload_authorized(text) TO anon, authenticated;

CREATE POLICY valecomp_anonymous_photo_upload ON storage.objects
FOR INSERT TO anon,authenticated
WITH CHECK (
  bucket_id = 'lead-photos'
  AND public.photo_upload_authorized(name)
);

CREATE POLICY valecomp_admin_photo_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'lead-photos'
  AND public.has_role(auth.uid(),'admin')
);
