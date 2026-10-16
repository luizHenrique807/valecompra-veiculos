CREATE TYPE public.app_role AS ENUM ('admin');
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, UNIQUE(user_id, role));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_roles ON public.user_roles FOR SELECT TO authenticated USING(user_id = auth.uid());
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
CREATE TABLE public.leads (
 id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now(), full_name text NOT NULL CHECK(length(full_name) BETWEEN 3 AND 100), whatsapp text NOT NULL CHECK(whatsapp ~ '^[1-9]{2}9[0-9]{8}$'), city text NOT NULL CHECK(city IN ('São José dos Campos','Jacareí','Caçapava','Taubaté','Outra cidade da região')), model text NOT NULL CHECK(length(model) BETWEEN 2 AND 100), year integer NOT NULL, mileage integer CHECK(mileage BETWEEN 0 AND 9999999), vehicle_status text[] NOT NULL CHECK(cardinality(vehicle_status) BETWEEN 1 AND 5 AND vehicle_status <@ ARRAY['Quitado','Financiado em dia','Financiado com parcelas atrasadas','IPVA ou multas em aberto','Outras pendências']::text[]), notes text CHECK(length(notes) <= 1500), desired_price numeric CHECK(desired_price BETWEEN 0 AND 10000000), consent boolean NOT NULL CHECK(consent = true), privacy_version text NOT NULL DEFAULT '2026-10-14', marketing_consent boolean NOT NULL DEFAULT false, utm_source text CHECK(length(utm_source)<=200), utm_medium text CHECK(length(utm_medium)<=200), utm_campaign text CHECK(length(utm_campaign)<=200), utm_content text CHECK(length(utm_content)<=200), utm_term text CHECK(length(utm_term)<=200), fbclid text CHECK(length(fbclid)<=500), page_url text NOT NULL CHECK(length(page_url)<=1000), client_timestamp timestamptz NOT NULL
);
GRANT INSERT ON public.leads TO anon, authenticated;
GRANT SELECT ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_validated_insert ON public.leads FOR INSERT TO anon, authenticated WITH CHECK(consent = true);
CREATE POLICY admin_read_leads ON public.leads FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE INDEX leads_date_idx ON public.leads(created_at DESC);
CREATE INDEX leads_phone_date_idx ON public.leads(whatsapp,created_at);
CREATE FUNCTION public.validate_lead() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.year < 1980 OR NEW.year > EXTRACT(YEAR FROM now())::integer+1 THEN RAISE EXCEPTION 'Ano inválido'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(NEW.whatsapp));
 IF (SELECT count(*) FROM public.leads WHERE whatsapp=NEW.whatsapp AND created_at > now()-interval '1 hour') >= 5 THEN RAISE EXCEPTION 'Muitas solicitações. Tente novamente mais tarde.'; END IF;
 NEW.created_at := now(); NEW.privacy_version := '2026-10-14'; RETURN NEW;
 END $$;
CREATE TRIGGER validate_lead_before_insert BEFORE INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.validate_lead();
CREATE TABLE public.lead_rate_limits (key text PRIMARY KEY, window_start timestamptz NOT NULL DEFAULT now(), requests integer NOT NULL DEFAULT 1);
GRANT ALL ON public.lead_rate_limits TO service_role;
ALTER TABLE public.lead_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.consume_lead_limit(_key text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE n integer; BEGIN
 INSERT INTO public.lead_rate_limits(key) VALUES(_key) ON CONFLICT(key) DO UPDATE SET requests=CASE WHEN lead_rate_limits.window_start < now()-interval '1 hour' THEN 1 ELSE lead_rate_limits.requests+1 END, window_start=CASE WHEN lead_rate_limits.window_start < now()-interval '1 hour' THEN now() ELSE lead_rate_limits.window_start END RETURNING requests INTO n; RETURN n<=20; END $$;
REVOKE ALL ON FUNCTION public.consume_lead_limit(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_lead_limit(text) TO service_role;
-- Storage privado para até cinco fotos por carro; URLs de leitura devem ser assinadas pelo servidor.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('lead-photos','lead-photos',false,5242880,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public=false,file_size_limit=5242880,allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp'];
