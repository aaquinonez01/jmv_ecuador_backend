-- Índices de rendimiento (mismos nombres que los @Index de las entidades).
-- En producción synchronize está desactivado, así que hay que aplicarlos a mano.
-- Es idempotente: se puede ejecutar varias veces sin problema.
--
-- Uso en el VPS (desde la carpeta jmv_ecuador_backend, con las variables del .env cargadas):
--   docker exec -i jmv_database psql -U $DATABASE_USER -d $DATABASE_NAME < sql/indexes.sql

-- Claves foráneas (Postgres no las indexa automáticamente)
CREATE INDEX IF NOT EXISTS "idx_activity_images_activity" ON "activity_images" ("activityId");
CREATE INDEX IF NOT EXISTS "idx_post_image_post" ON "post_image" ("postId");
CREATE INDEX IF NOT EXISTS "idx_upcoming_activity_documents_activity" ON "upcoming_activity_documents" ("upcomingActivityId");
CREATE INDEX IF NOT EXISTS "idx_activities_pillar" ON "activities" ("pillarId");
CREATE INDEX IF NOT EXISTS "idx_activities_type" ON "activities" ("typeId");
CREATE INDEX IF NOT EXISTS "idx_upcoming_activities_pillar" ON "upcoming_activities" ("pillarId");
CREATE INDEX IF NOT EXISTS "idx_upcoming_activities_type" ON "upcoming_activities" ("typeId");
CREATE INDEX IF NOT EXISTS "idx_post_user" ON "post" ("userId");
CREATE INDEX IF NOT EXISTS "idx_post_scope" ON "post" ("scopeId");
CREATE INDEX IF NOT EXISTS "idx_post_activity_type" ON "post" ("activityTypeId");
CREATE INDEX IF NOT EXISTS "idx_post_subtype" ON "post" ("subtypeId");
CREATE INDEX IF NOT EXISTS "idx_consejo_members_period" ON "consejo_members" ("periodId");
CREATE INDEX IF NOT EXISTS "idx_comunidades_zona" ON "comunidades" ("zonaId");
CREATE INDEX IF NOT EXISTS "idx_user_comunidad" ON "user" ("comunidadId");

-- Columnas usadas en WHERE / ORDER BY de los endpoints públicos
CREATE INDEX IF NOT EXISTS "idx_activities_published_order" ON "activities" ("published", "displayOrder", "startDate");
CREATE INDEX IF NOT EXISTS "idx_upcoming_activities_published_order" ON "upcoming_activities" ("published", "displayOrder", "startDate");
CREATE INDEX IF NOT EXISTS "idx_post_created_at" ON "post" ("createdAt");
CREATE INDEX IF NOT EXISTS "idx_site_image_section" ON "site_image" ("section", "subsection", "orden");
CREATE INDEX IF NOT EXISTS "idx_home_announcements_active_featured" ON "home_announcements" ("active", "featuredInHome");
CREATE INDEX IF NOT EXISTS "idx_testimonials_active_order" ON "testimonials" ("active", "displayOrder");

ANALYZE;
