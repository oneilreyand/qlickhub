'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `CREATE TABLE public.link_preview_rate_limit_buckets (
          identifier varchar(64) PRIMARY KEY CHECK (identifier ~ '^[a-f0-9]{64}$'),
          accepted_at bigint[] NOT NULL CHECK (
            cardinality(accepted_at) BETWEEN 1 AND 500
            AND array_ndims(accepted_at) = 1
            AND array_position(accepted_at, NULL) IS NULL
          ),
          expires_at bigint NOT NULL
        );
        CREATE INDEX idx_link_preview_rate_limit_expiry
          ON public.link_preview_rate_limit_buckets (expires_at);
        ALTER TABLE public.link_preview_rate_limit_buckets ENABLE ROW LEVEL SECURITY;
        REVOKE ALL ON public.link_preview_rate_limit_buckets FROM PUBLIC;

        CREATE FUNCTION public.consume_link_preview_rate_limit(
          p_identifier text, p_limit integer, p_window_ms integer
        ) RETURNS TABLE (allowed boolean, remaining integer, reset_ms double precision)
        LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
        DECLARE
          markers bigint[];
          now_ms bigint;
          permit boolean;
        BEGIN
          IF p_identifier IS NULL OR p_identifier !~ '^[a-f0-9]{64}$'
            OR p_limit IS NULL OR p_limit < 1 OR p_limit > 500
            OR p_window_ms IS NULL OR p_window_ms < 1 OR p_window_ms > 86400000 THEN
            RAISE EXCEPTION 'Invalid rate-limit parameters' USING ERRCODE = '22023';
          END IF;

          -- Transaction locks work with Supabase Transaction Pooler. Hash collisions
          -- only serialize unrelated keys; persisted counters still use the full digest.
          PERFORM pg_advisory_xact_lock(hashtextextended('qlickhub:link-preview:' || p_identifier, 0));
          SELECT b.accepted_at INTO markers FROM public.link_preview_rate_limit_buckets b
            WHERE b.identifier = p_identifier FOR UPDATE;
          now_ms := floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint;
          SELECT COALESCE(array_agg(t ORDER BY t), '{}'::bigint[]) INTO markers
            FROM unnest(markers) t WHERE t > now_ms - p_window_ms;
          permit := cardinality(markers) < p_limit;
          IF permit THEN markers := array_append(markers, now_ms); END IF;

          INSERT INTO public.link_preview_rate_limit_buckets(identifier, accepted_at, expires_at)
            VALUES (p_identifier, markers, (SELECT max(t) FROM unnest(markers) t) + p_window_ms)
            ON CONFLICT (identifier) DO UPDATE
              SET accepted_at = EXCLUDED.accepted_at, expires_at = EXCLUDED.expires_at;

          -- Bounded opportunistic cleanup. Locked buckets are skipped, and active
          -- counters cannot disappear while a request is refreshing them.
          WITH expired AS (
            SELECT b.identifier FROM public.link_preview_rate_limit_buckets b
              WHERE b.expires_at <= now_ms AND b.identifier <> p_identifier
              ORDER BY b.expires_at, b.identifier LIMIT 100 FOR UPDATE SKIP LOCKED
          ) DELETE FROM public.link_preview_rate_limit_buckets b USING expired e
              WHERE b.identifier = e.identifier AND b.expires_at <= now_ms;

          RETURN QUERY SELECT permit, greatest(0, p_limit - cardinality(markers)),
            ((SELECT min(t) FROM unnest(markers) t) + p_window_ms)::double precision;
        END;
        $$;
        REVOKE ALL ON FUNCTION public.consume_link_preview_rate_limit(text, integer, integer) FROM PUBLIC;
        DO $$ DECLARE client_role text;
        BEGIN
          FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
              EXECUTE format('REVOKE ALL ON public.link_preview_rate_limit_buckets FROM %I', client_role);
              EXECUTE format('REVOKE ALL ON FUNCTION public.consume_link_preview_rate_limit(text, integer, integer) FROM %I', client_role);
            END IF;
          END LOOP;
        END $$;`,
        { transaction },
      );
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `DROP FUNCTION public.consume_link_preview_rate_limit(text, integer, integer);
         DROP TABLE public.link_preview_rate_limit_buckets;`,
        { transaction },
      );
    });
  },
};
