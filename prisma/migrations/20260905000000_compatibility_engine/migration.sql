-- ALTER//CASE compatibility engine.
-- This migration is additive and backfills the legacy phone_model_id/stock/price
-- columns before they are deprecated. It intentionally does not delete catalog data.

CREATE TYPE public.product_type AS ENUM (
  'CASE', 'SCREEN_PROTECTOR', 'CAMERA_PROTECTOR', 'CHARGER', 'POWER_BANK',
  'WALLET', 'STAND', 'STRAP', 'CHARM', 'OTHER'
);
CREATE TYPE public.compatibility_mode AS ENUM ('UNIVERSAL', 'BRAND_SPECIFIC', 'DEVICE_SPECIFIC');

ALTER TABLE public.brands
  ADD COLUMN logo_url text,
  ADD COLUMN is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.phone_models
  ADD COLUMN release_year smallint,
  ADD COLUMN screen_size numeric(4,2),
  ADD COLUMN model_code text,
  ADD COLUMN image_url text,
  ADD COLUMN is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.phone_models
  ADD CONSTRAINT phone_models_brand_id_slug_key UNIQUE (brand_id, slug);
ALTER TABLE public.phone_models DROP CONSTRAINT phone_models_brand_id_fkey;
ALTER TABLE public.phone_models ADD CONSTRAINT phone_models_brand_id_fkey FOREIGN KEY(brand_id) REFERENCES public.brands(id) ON DELETE RESTRICT;
CREATE INDEX phone_models_brand_id_is_active_idx ON public.phone_models(brand_id, is_active);
CREATE INDEX phone_models_name_idx ON public.phone_models(name);
CREATE INDEX phone_models_model_code_idx ON public.phone_models(model_code);

ALTER TABLE public.products
  ALTER COLUMN price TYPE numeric(12,2) USING price::numeric,
  ALTER COLUMN price DROP NOT NULL,
  ALTER COLUMN category DROP NOT NULL,
  ADD COLUMN product_type public.product_type NOT NULL DEFAULT 'OTHER',
  ADD COLUMN compatibility_mode public.compatibility_mode NOT NULL DEFAULT 'DEVICE_SPECIFIC',
  ADD COLUMN is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN technology_tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
UPDATE public.collections SET active = true WHERE active IS NULL;
ALTER TABLE public.collections ALTER COLUMN active SET NOT NULL;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_collection_id_fkey;
ALTER TABLE public.products ADD CONSTRAINT products_collection_id_fkey FOREIGN KEY(collection_id) REFERENCES public.collections(id) ON DELETE SET NULL;
UPDATE public.products SET description = '' WHERE description IS NULL;
UPDATE public.products SET featured = false WHERE featured IS NULL;
UPDATE public.products SET limited = false WHERE limited IS NULL;
UPDATE public.products SET active = true WHERE active IS NULL;
ALTER TABLE public.products ALTER COLUMN description SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN featured SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN limited SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN active SET NOT NULL;
UPDATE public.products
SET product_type = CASE category
  WHEN 'CASES' THEN 'CASE'::public.product_type
  WHEN 'SMART' THEN 'CASE'::public.product_type
  WHEN 'ACCESSORIES' THEN 'OTHER'::public.product_type
  ELSE 'OTHER'::public.product_type
END;
CREATE INDEX products_active_is_demo_idx ON public.products(active, is_demo);
CREATE INDEX products_product_type_active_idx ON public.products(product_type, active);

ALTER TABLE public.product_variants
  ALTER COLUMN phone_model_id DROP NOT NULL,
  ALTER COLUMN price TYPE numeric(12,2) USING price::numeric,
  ADD COLUMN name text,
  ADD COLUMN design text,
  ADD COLUMN material text,
  ADD COLUMN compare_at_price numeric(12,2),
  ADD COLUMN cost numeric(12,2),
  ADD COLUMN image_url text,
  ADD COLUMN is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
UPDATE public.product_variants pv
SET price = COALESCE(pv.price, p.price)
FROM public.products p
WHERE p.id = pv.product_id;
ALTER TABLE public.product_variants ALTER COLUMN price SET NOT NULL;
ALTER TABLE public.product_variants
  ADD CONSTRAINT product_variants_price_nonnegative CHECK (price >= 0),
  ADD CONSTRAINT product_variants_compare_price_nonnegative CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  ADD CONSTRAINT product_variants_cost_nonnegative CHECK (cost IS NULL OR cost >= 0);
CREATE INDEX product_variants_product_id_is_active_idx ON public.product_variants(product_id, is_active);

CREATE TABLE public.product_variant_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES public.phone_models(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_variant_devices_variant_device_key UNIQUE(product_variant_id, device_id)
);
CREATE INDEX product_variant_devices_device_variant_idx ON public.product_variant_devices(device_id, product_variant_id);
CREATE INDEX product_variant_devices_variant_idx ON public.product_variant_devices(product_variant_id);
INSERT INTO public.product_variant_devices(product_variant_id, device_id)
SELECT id, phone_model_id FROM public.product_variants WHERE phone_model_id IS NOT NULL
ON CONFLICT (product_variant_id, device_id) DO NOTHING;

CREATE TABLE public.product_variant_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_variant_brands_variant_brand_key UNIQUE(product_variant_id, brand_id)
);
CREATE INDEX product_variant_brands_brand_variant_idx ON public.product_variant_brands(brand_id, product_variant_id);

CREATE TABLE public.capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.device_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.phone_models(id) ON DELETE CASCADE,
  capability_id uuid NOT NULL REFERENCES public.capabilities(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT device_capabilities_device_capability_key UNIQUE(device_id, capability_id)
);
CREATE INDEX device_capabilities_capability_device_idx ON public.device_capabilities(capability_id, device_id);
CREATE TABLE public.variant_capability_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  capability_id uuid NOT NULL REFERENCES public.capabilities(id) ON DELETE RESTRICT,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT variant_capability_requirements_variant_capability_key UNIQUE(product_variant_id, capability_id)
);
CREATE INDEX variant_capability_requirements_capability_variant_idx ON public.variant_capability_requirements(capability_id, product_variant_id);

CREATE TABLE public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_variant_id uuid NOT NULL UNIQUE REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  reserved_quantity integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 5,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_quantity_nonnegative CHECK (quantity >= 0),
  CONSTRAINT inventory_reserved_nonnegative CHECK (reserved_quantity >= 0),
  CONSTRAINT inventory_reserved_lte_quantity CHECK (reserved_quantity <= quantity),
  CONSTRAINT inventory_low_stock_nonnegative CHECK (low_stock_threshold >= 0)
);
CREATE INDEX inventory_quantity_reserved_idx ON public.inventory(quantity, reserved_quantity);
INSERT INTO public.inventory(product_variant_id, quantity, reserved_quantity, low_stock_threshold)
SELECT id, stock, 0, 5 FROM public.product_variants
ON CONFLICT (product_variant_id) DO NOTHING;

ALTER TABLE public.cart_items
  ADD COLUMN device_id uuid,
  ADD COLUMN unit_price numeric(12,2),
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
UPDATE public.cart_items ci
SET device_id = pv.phone_model_id,
    unit_price = pv.price
FROM public.product_variants pv
WHERE pv.id = ci.variant_id;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.cart_items WHERE device_id IS NULL OR unit_price IS NULL) THEN
    RAISE EXCEPTION 'Cart migration stopped: one or more legacy rows cannot be mapped to a device and server price';
  END IF;
END $$;
ALTER TABLE public.cart_items
  ALTER COLUMN device_id SET NOT NULL,
  ALTER COLUMN unit_price SET NOT NULL,
  ADD CONSTRAINT cart_items_device_id_fkey FOREIGN KEY(device_id) REFERENCES public.phone_models(id) ON DELETE RESTRICT,
  ADD CONSTRAINT cart_items_unit_price_nonnegative CHECK(unit_price >= 0);
ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_variant_id_key;
ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_user_variant_device_key UNIQUE(user_id, variant_id, device_id);
CREATE INDEX cart_items_user_updated_at_idx ON public.cart_items(user_id, updated_at);

ALTER TABLE public.orders ALTER COLUMN subtotal TYPE numeric(12,2) USING subtotal::numeric;
ALTER TABLE public.order_items ALTER COLUMN unit_price TYPE numeric(12,2) USING unit_price::numeric;
CREATE INDEX product_images_product_position_idx ON public.product_images(product_id, position);
UPDATE public.favorites SET created_at = now() WHERE created_at IS NULL;
UPDATE public.custom_designs SET created_at = now() WHERE created_at IS NULL;
UPDATE public.orders SET created_at = now() WHERE created_at IS NULL;
UPDATE public.reviews SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE public.favorites ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.custom_designs ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.reviews ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE public.product_variant_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variant_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_capability_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalog variant devices read" ON public.product_variant_devices FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.product_variants pv JOIN public.products p ON p.id = pv.product_id
  WHERE pv.id = product_variant_id AND pv.is_active AND p.active
));
CREATE POLICY "catalog variant brands read" ON public.product_variant_brands FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.product_variants pv JOIN public.products p ON p.id = pv.product_id
  WHERE pv.id = product_variant_id AND pv.is_active AND p.active
));
CREATE POLICY "catalog capabilities read" ON public.capabilities FOR SELECT USING (true);
CREATE POLICY "catalog device capabilities read" ON public.device_capabilities FOR SELECT USING (true);
CREATE POLICY "catalog requirements read" ON public.variant_capability_requirements FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.product_variants pv JOIN public.products p ON p.id = pv.product_id
  WHERE pv.id = product_variant_id AND pv.is_active AND p.active
));
CREATE POLICY "catalog inventory read" ON public.inventory FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.product_variants pv JOIN public.products p ON p.id = pv.product_id
  WHERE pv.id = product_variant_id AND pv.is_active AND p.active
));

CREATE POLICY "admin manage variant devices" ON public.product_variant_devices FOR ALL TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
CREATE POLICY "admin manage variant brands" ON public.product_variant_brands FOR ALL TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
CREATE POLICY "admin manage capabilities" ON public.capabilities FOR ALL TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
CREATE POLICY "admin manage device capabilities" ON public.device_capabilities FOR ALL TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
CREATE POLICY "admin manage requirements" ON public.variant_capability_requirements FOR ALL TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
CREATE POLICY "admin manage inventory" ON public.inventory FOR ALL TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());

DROP POLICY IF EXISTS "variants public read" ON public.product_variants;
CREATE POLICY "variants public read" ON public.product_variants FOR SELECT
USING (is_active AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.active));
DROP POLICY IF EXISTS "brands public read" ON public.brands;
CREATE POLICY "brands public read" ON public.brands FOR SELECT USING(is_active OR public.is_admin());
DROP POLICY IF EXISTS "models public read" ON public.phone_models;
CREATE POLICY "models public read" ON public.phone_models FOR SELECT USING(is_active OR public.is_admin());

COMMENT ON COLUMN public.products.price IS 'Legacy base price retained for safe migration only; purchase price comes from product_variants.price.';
COMMENT ON COLUMN public.products.category IS 'Legacy category retained for safe migration only; use product_type.';
COMMENT ON COLUMN public.product_variants.phone_model_id IS 'Legacy compatibility field retained for rollback; product_variant_devices is authoritative.';
COMMENT ON COLUMN public.product_variants.stock IS 'Legacy stock retained for rollback; inventory is authoritative.';
COMMENT ON COLUMN public.inventory.quantity IS 'Physical stock. Purchasable stock = quantity - reserved_quantity.';
COMMENT ON COLUMN public.variant_capability_requirements.is_required IS 'MVP rule: every required capability must be present on the selected device.';
