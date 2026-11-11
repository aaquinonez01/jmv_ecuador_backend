-- Formación en la app: itinerarios para los grupos, formaciones nacionales con
-- material de apoyo, y oraciones. Idempotente (lo ejecuta jmv-ops.sh deploy).
-- Los datos de ejemplo se insertan una sola vez (ON CONFLICT DO NOTHING): lo que
-- el equipo edite después en el admin no se pisa.
--
-- Nota: las tablas formation_encounters y formation_progress de la primera
-- versión ya no se usan; se dejan sin borrar.

CREATE TABLE IF NOT EXISTS "formation_topics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "summary" text,
  "axis" varchar(20) NOT NULL,
  "levels" jsonb NOT NULL DEFAULT '[]',
  "subtopics" jsonb NOT NULL DEFAULT '[]',
  "references" jsonb NOT NULL DEFAULT '[]',
  "displayOrder" int NOT NULL DEFAULT 0,
  "published" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_formation_topics_order" ON "formation_topics" ("published", "displayOrder");

CREATE TABLE IF NOT EXISTS "national_trainings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "speaker" text,
  "startsAt" timestamp NOT NULL,
  "description" text,
  "meetingUrl" text,
  "recordingUrl" text,
  "materials" jsonb NOT NULL DEFAULT '[]',
  "published" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_national_trainings_date" ON "national_trainings" ("published", "startsAt");

CREATE TABLE IF NOT EXISTS "prayers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "category" varchar(30) NOT NULL,
  "text" text NOT NULL,
  "source" text,
  "displayOrder" int NOT NULL DEFAULT 0,
  "published" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_prayers_order" ON "prayers" ("published", "category", "displayOrder");

-- Oraciones del Manual de JMV (José Manuel Yungaicela, presentado por Sor Noemí Miño, 2015)
INSERT INTO "prayers" ("id", "title", "category", "text", "source", "displayOrder", "published") VALUES
('f0a1c003-0000-4000-8000-000000000001', $p$Plegaria de JMV$p$, 'JMV', $p$Señor Jesús, llegamos hasta ti, con María Inmaculada. A ti, el amigo de los pequeños y de los pobres, te alabamos. Tú nos miras a todos ¡con tanto amor!

Enséñanos a vivir juntos con el dinamismo de tu Espíritu, que nos encamina por la senda de la admiración, de la verdad y de la acción.

Concédenos el saber mirar a los demás con los ojos del corazón, para reconocer las maravillas que Tú has hecho en ellos y de manera especial en los que se ven desfavorecidos.

Ayúdanos a construir un mundo fraternal en el que nadie sea dejado de lado. Haz que obremos en todo no con espíritu de poder o de dominio, sino humildemente, con un espíritu de servicio.

Amén.$p$, $p$Manual de JMV, p. 146$p$, 1, true),
('f0a1c003-0000-4000-8000-000000000002', $p$Promesa de JMV$p$, 'JMV', $p$Viviendo en equipo JMV ya desde mi integración/admisión/estancia, he descubierto el lugar de María en la vida cristiana y quiero ser guiado por ella de antemano en el camino de Jesucristo.

Por lo tanto, con la ayuda del Espíritu Santo, acepto ante mi equipo, los líderes de mi movimiento, y la comunidad cristiana aquí reunidos, para seguir viviendo en equipo con el espíritu Mariano y Vicenciano.

El espíritu Mariano y Vicenciano, para mí JMV, es:

Vivir… en el mundo de hoy, con el corazón atento al que más me necesita.

Contemplar… la vida para reconocer las maravillas de Dios y escuchar sus llamadas.

Servir… con gestos y palabras que están al servicio de la construcción de un mundo más justo y más fraterno.

Amén.$p$, $p$Manual de JMV, pp. 40-41 (Ritual de la Promesa)$p$, 2, true),
('f0a1c003-0000-4000-8000-000000000003', $p$Oración a San Vicente de Paúl$p$, 'Vicencianas', $p$Glorioso San Vicente, celestial patrono de todas las obras de caridad y padre de todos los necesitados, que jamás olvidaste en tu vida a nadie que a ti haya recurrido. Mira de cuántos males nosotros somos oprimidos y ven en nuestra ayuda.

Consigue del Señor socorro a los pobres, alivio a los enfermos, consuelo a los afligidos, protección a los abandonados, caridad a los ricos, conversión a los pecadores, celo a los sacerdotes, paz a la Iglesia, tranquilidad a los pueblos y salvación para todos nosotros.

Sí; que todos experimenten los efectos de vuestra piadosa intercesión; de modo que aliviados por ti en las miserias de esta vida, podamos reunirnos contigo en el cielo, en donde no habrá jamás luto, ni llanto, ni dolor, sino gozo, alegría y bienaventuranza eterna.

Amén.$p$, $p$Manual de JMV, p. 146$p$, 3, true),
('f0a1c003-0000-4000-8000-000000000004', $p$Magníficat (Lc 1, 46-55)$p$, 'Marianas', $p$Proclama mi alma la grandeza del Señor,
se alegra mi espíritu en Dios, mi salvador;
porque ha mirado la humillación de su esclava.

Desde ahora me felicitarán todas las generaciones,
porque el Poderoso ha hecho obras grandes por mí: su nombre es santo,
y su misericordia llega a sus fieles de generación en generación.

Él hace proezas con su brazo: dispersa a los soberbios de corazón,
derriba del trono a los poderosos y enaltece a los humildes,
a los hambrientos los colma de bienes y a los ricos los despide vacíos.

Auxilia a Israel, su siervo, acordándose de su misericordia
—como lo había prometido a nuestros padres—
en favor de Abrahán y su descendencia por siempre.

Gloria al Padre…$p$, $p$Manual de JMV, p. 148$p$, 4, true),
('f0a1c003-0000-4000-8000-000000000005', $p$Consagración a la Virgen de la Medalla Milagrosa$p$, 'Marianas', $p$¡Postrado ante tu acatamiento, oh Virgen de la Medalla Milagrosa!, y después de saludarte en el venerable misterio de tu concepción sin mancha, te elijo, desde ahora para siempre, por mi Madre, Abogada, Reina y Señora de todas mis acciones y Protectora ante la majestad de Dios.

Yo te prometo, Virgen purísima, no olvidarte jamás, ni tu culto ni los intereses de tu gloria, a la vez que te prometo también promover en los que me rodean tu amor.

Recíbeme, Madre tierna, desde este momento y sé para mí el refugio en esta vida y el sostén a la hora de la muerte.

Amén.$p$, $p$Manual de JMV, p. 149$p$, 5, true),
('f0a1c003-0000-4000-8000-000000000006', $p$Acto de consagración a María$p$, 'Marianas', $p$¡Oh Señora mía, oh Madre mía!, yo me entrego del todo a Ti, y en prueba de mi filial afecto, te consagro en este día mis ojos, mis oídos, mi lengua y mi corazón, en una palabra, todo mi ser, ya que soy todo tuyo, ¡oh Madre de bondad!, guárdame y protégeme como hijo tuyo.

Amén.$p$, $p$Manual de JMV, p. 148$p$, 6, true),
('f0a1c003-0000-4000-8000-000000000007', $p$Bajo tu amparo$p$, 'Marianas', $p$Bajo tu amparo nos acogemos, santa Madre de Dios; no deseches las oraciones que te dirigimos en nuestras necesidades; antes bien, líbranos de todo peligro, ¡oh Virgen gloriosa y bendita!

Amén.$p$, $p$Manual de JMV, p. 147$p$, 7, true),
('f0a1c003-0000-4000-8000-000000000008', $p$Oración misionera$p$, 'Misioneras', $p$Señor Jesús, que diste tu vida por nuestra salvación, ayúdanos a continuar construyendo tu Reino de paz, justicia y amor.

Infunde en el corazón de todos los cristianos el deseo de transmitir tu Palabra. Cultiva en el corazón de los jóvenes el sublime ideal de entregarse al servicio de los demás.

Sostén el ánimo de aquellos que abandonándolo todo, cumplen tu mandato de ir por el mundo anunciando la Buena Nueva. Crea en mí un corazón misionero.

Amén.$p$, $p$Manual de JMV, p. 147$p$, 8, true),
('f0a1c003-0000-4000-8000-000000000009', $p$Oración del misionero$p$, 'Misioneras', $p$Señor, tú me llamaste para ser instrumento de tu gracia, para anunciar la Buena Nueva, para sanar las almas. Instrumento de paz y de justicia, pregonero de todas tus palabras, agua para calmar la sed hiriente, mano que bendice y que ama.

Señor, tú me llamaste para curar los corazones heridos, para gritar, en medio de las plazas, que el Amor está vivo. Señor, tú me llamaste para amar a los hombres que tú, Padre, me diste como hermanos, para sacar del sueño a los que duermen y liberar al cautivo.

Señor, me quieres para abolir la violencia y aliviar la miseria; hacer temblar las piedras y ahuyentar a los lobos del rebaño. Soy cera blanda entre tus dedos, haz lo que quieras conmigo.

Amén.$p$, $p$Manual de JMV, p. 147$p$, 9, true),
('f0a1c003-0000-4000-8000-000000000010', $p$Oración al despertar$p$, 'Para el día', $p$Señor mío y Dios mío, te doy gracias por haberme creado, redimido, hecho cristiano y conservado la vida. Te ofrezco mis pensamientos, palabras y obras de este día a honra y gloria tuya.

No permitas que te ofenda y dame fortaleza para huir de las ocasiones de pecar. Haz que crezca mi amor a Ti.

Amén.$p$, $p$Manual de JMV, p. 150$p$, 10, true)
ON CONFLICT ("id") DO NOTHING;

-- Dos itinerarios de ejemplo tomados del Manual de JMV (se editan o borran en el admin)
INSERT INTO "formation_topics" ("id", "title", "summary", "axis", "levels", "subtopics", "references", "displayOrder", "published") VALUES
(
  'f0a1c002-0000-4000-8000-000000000001',
  'La espiritualidad del Magníficat',
  $t$El punto de encuentro de la dimensión mariana y vicenciana de JMV es la contemplación de la Virgen del Magníficat. Es todo un programa de vida.$t$,
  'mariano',
  '["prejuvenil","juvenil"]',
  $t$[
    "Hacer una opción clara por Dios como único absoluto",
    "Vivir en actitud de alegría y agradecimiento por las maravillas que Dios hace en nosotros",
    "Vivir una espiritualidad encarnada y comprometida, poniéndonos de parte de los pobres y los débiles",
    "Las cuatro virtudes de un JMV: humildad, obediencia, caridad y pureza"
  ]$t$,
  $t$[
    {"type": "biblica", "title": "Lc 1, 46-55", "detail": "El Magníficat"},
    {"type": "biblica", "title": "Lc 1, 78", "detail": "“La entrañable misericordia de nuestro Dios”"},
    {"type": "libro", "title": "Manual de JMV", "detail": "José Manuel Yungaicela (2015). Espiritualidad del Magníficat, pp. 26-29; Segundo pilar, pp. 15-16"},
    {"type": "documento", "title": "Marialis cultus", "detail": "Exhortación apostólica de Pablo VI (1974), en la Biblioteca", "url": "https://jmvecuador.org/biblioteca/marialis-cultus-2-de-febrero-de-1974"}
  ]$t$,
  1, true
),
(
  'f0a1c002-0000-4000-8000-000000000002',
  'El servicio que transforma',
  $t$Cuando descubres a Cristo vivo te haces apóstol y servidor. JMV propone un servicio que suscite no sólo gestos de solidaridad con los pobres, sino un compromiso permanente por construir un nuevo modelo de sociedad.$t$,
  'vicenciano',
  '["prejuvenil","juvenil"]',
  $t$[
    "Educa tu mirada: conocer el mundo de los pobres y la pobreza",
    "Educa tu corazón: vivir la misericordia como talante del corazón",
    "Educa tus manos: “bajarse del caballo” y servir",
    "Asociarnos a otros para transformar la realidad",
    "¿Cuáles son los nuevos rostros de la pobreza que nos piden ayuda?"
  ]$t$,
  $t$[
    {"type": "biblica", "title": "Lc 10, 25-37", "detail": "El buen samaritano"},
    {"type": "biblica", "title": "1 Cor 9, 16", "detail": "“¡Ay de mí si no anunciara el Evangelio!”"},
    {"type": "libro", "title": "Manual de JMV", "detail": "José Manuel Yungaicela (2015). Tercer pilar: Apostolado, pp. 17-19"},
    {"type": "otro", "title": "San Vicente de Paúl", "detail": "“No me basta con amar a Dios, si mi prójimo no le ama” (XI-4, 553)"}
  ]$t$,
  2, true
)
ON CONFLICT ("id") DO NOTHING;
