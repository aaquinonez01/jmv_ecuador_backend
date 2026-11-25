-- "¿Cómo estás hoy?" en la pestaña Orar: una palabra de la Biblia para cada estado. Idempotente.
CREATE TABLE IF NOT EXISTS "moods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(40) NOT NULL,
  "icon" varchar(40),
  "word" text NOT NULL,
  "reference" text NOT NULL,
  "prayer" text,
  "displayOrder" int NOT NULL DEFAULT 0,
  "published" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_moods_name" ON "moods" ("name");

-- Lista inicial (textos de «El Libro del Pueblo de Dios»); solo se insertan los que no existan
INSERT INTO "moods" ("name", "icon", "word", "reference", "displayOrder") VALUES
  ('Triste', 'rainy', 'El Señor está cerca del que sufre y salva a los que están abatidos.', 'Salmo 34, 19', 10),
  ('Cansado', 'bed', 'Vengan a mí todos los que están afligidos y agobiados, y yo los aliviaré.', 'Mateo 11, 28', 20),
  ('Con miedo', 'thunderstorm', 'No temas, porque yo estoy contigo, no te inquietes, porque yo soy tu Dios; yo te fortalezco y te ayudo, yo te sostengo con mi mano victoriosa.', 'Isaías 41, 10', 30),
  ('Preocupado', 'cloudy', 'No se inquieten por el día de mañana; el mañana se inquietará por sí mismo. A cada día le basta su aflicción.', 'Mateo 6, 34', 40),
  ('Con dudas', 'help-circle', '«Creo, ayúdame porque tengo poca fe».', 'Marcos 9, 24', 50),
  ('Solo', 'person', 'No temas ni te acobardes, porque el Señor, tu Dios, estará contigo dondequiera que vayas.', 'Josué 1, 9', 60),
  ('Lejos de Dios', 'compass', 'Crea en mí, Dios mío, un corazón puro, y renueva la firmeza de mi espíritu.', 'Salmo 51, 12', 70),
  ('Agradecido', 'heart', 'Estén siempre alegres. Oren sin cesar. Den gracias a Dios en toda ocasión: esto es lo que Dios quiere de todos ustedes, en Cristo Jesús.', '1 Tesalonicenses 5, 16-18', 80),
  ('Alegre', 'sunny', 'Este es el día que hizo el Señor: alegrémonos y regocijémonos en él.', 'Salmo 118, 24', 90)
ON CONFLICT ("name") DO NOTHING;
