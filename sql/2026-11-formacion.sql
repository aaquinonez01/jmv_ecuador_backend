-- Formación en la app: encuentros del camino JMV y progreso de cada joven.
-- Idempotente: se puede ejecutar varias veces (lo hace jmv-ops.sh deploy en cada despliegue).
-- Los encuentros de ejemplo se insertan una sola vez (ON CONFLICT DO NOTHING):
-- lo que el equipo edite después en el admin no se pisa.

CREATE TABLE IF NOT EXISTS "formation_encounters" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "summary" text,
  "step" varchar(20) NOT NULL,
  "pillar" varchar(20),
  "displayOrder" int NOT NULL DEFAULT 0,
  "durationMinutes" int NOT NULL DEFAULT 15,
  "coverImageUrl" text,
  "contemplar" jsonb NOT NULL DEFAULT '{}',
  "vivir" jsonb NOT NULL DEFAULT '{"cards":[]}',
  "servir" jsonb NOT NULL DEFAULT '{"commitment":""}',
  "reflectionQuestions" jsonb NOT NULL DEFAULT '[]',
  "quiz" jsonb NOT NULL DEFAULT '[]',
  "source" text,
  "published" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_formation_encounters_order" ON "formation_encounters" ("step", "displayOrder");

CREATE TABLE IF NOT EXISTS "formation_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "encounterId" uuid NOT NULL REFERENCES "formation_encounters"("id") ON DELETE CASCADE,
  "quizScore" int,
  "completedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_formation_progress_user_encounter" ON "formation_progress" ("userId", "encounterId");

-- ── Etapa de Integración: los cuatro pilares de JMV ──
-- Texto tomado del Manual de JMV (José Manuel Yungaicela, presentado por Sor Noemí Miño, 2015).

INSERT INTO "formation_encounters"
  ("id", "title", "summary", "step", "pillar", "displayOrder", "durationMinutes", "contemplar", "vivir", "servir", "reflectionQuestions", "quiz", "source", "published")
VALUES
(
  'f0a1c001-0000-4000-8000-000000000001',
  'Comunidad juvenil: la pedagogía del encuentro',
  'JMV se sostiene sobre cuatro pilares. El primero es el grupo-comunidad, donde compartimos la vida y la fe.',
  'integracion', 'comunidad', 1, 15,
  $j${
    "passageRef": "Hch 4, 32-35",
    "passageText": "La multitud de los creyentes no tenía sino un solo corazón y una sola alma. Nadie llamaba suyos a sus bienes, sino que todo era en común entre ellos… gozaban todos de gran simpatía. No había entre ellos ningún necesitado, porque… se repartía a cada uno según su necesidad.",
    "prayer": "Señor Jesús, llegamos hasta ti, con María Inmaculada. A ti, el amigo de los pequeños y de los pobres, te alabamos. Tú nos miras a todos ¡con tanto amor! Enséñanos a vivir juntos con el dinamismo de tu Espíritu, que nos encamina por la senda de la admiración, de la verdad y de la acción. Concédenos el saber mirar a los demás con los ojos del corazón, para reconocer las maravillas que Tú has hecho en ellos, y de manera especial en los que se ven desfavorecidos. Ayúdanos a construir un mundo fraterno en el que nadie sea dejado de lado. Haz que obremos en todo no con espíritu de poder o de dominio, sino humildemente, con un espíritu de servicio. Amén."
  }$j$::jsonb,
  $j${
    "cards": [
      {"title": "Los cuatro pilares", "body": "Una silla tiene cuatro patas; si le falta una, el que se sienta en ella se puede caer. Así también, JMV se sostiene sobre cuatro pilares muy sólidos: Comunidad Juvenil, Espiritualidad, Apostolado y Formación."},
      {"title": "¿Recuerdas cómo entraste a JMV?", "body": "Un día fuiste invitado por un amigo/a para que vayas a las reuniones del grupo o a participar en alguna actividad y conocer a otros/as jóvenes. Poco a poco crece la confianza y la amistad, te sientes acogido y tomado en cuenta, hasta que espontáneamente llega la pregunta: ¿qué tengo que hacer para ser uno de ustedes? Entras porque quieres estar con otros, caminar con ellos y compartir la vida. A esto lo llamamos la pedagogía del encuentro."},
      {"title": "El grupo-comunidad", "body": "En respuesta a una sociedad que despersonaliza y favorece el individualismo, JMV nos invita a hacer la experiencia del GRUPO-COMUNIDAD, como lugar donde compartimos la vida y la fe, donde uno puede crecer como persona junto a otros, donde aprendemos unos de otros a superarnos personalmente, donde experimentamos nuestro “ser Iglesia” y nos comprometemos con la causa de Jesús, intentando poner nuestras personas y capacidades al servicio de los pobres."},
      {"title": "Un medio privilegiado", "body": "El grupo-comunidad es un medio privilegiado para: la iniciación y maduración en la fe; la confrontación de la realidad con la Palabra de Dios; la conversión y experiencia de vida cristiana; la integración progresiva en la comunidad cristiana más amplia; y el compromiso con los Pobres y la Misión, al estilo vicenciano."},
      {"title": "El ideal de un grupo JMV", "body": "Llegar a ser una auténtica Comunidad Juvenil. Para lograr esto, tú debes convivir con otros, aceptando y valorando a cada persona, con sus cualidades y defectos; debes ser capaz de renunciar a tus intereses personales en favor de los demás, a trabajar en equipo, a dialogar, a servir a los demás y a proyectarte en tu entorno."}
    ]
  }$j$::jsonb,
  $j${"commitment": "Esta semana, convive con tu grupo aceptando y valorando a cada persona, con sus cualidades y defectos."}$j$::jsonb,
  $j$[
    "¿Cómo se vive en tu grupo la pedagogía del encuentro? ¿Cuál es mi papel en este proceso de mi grupo?",
    "¿Los miembros de tu grupo sienten a JMV como un “hogar”, como un lugar de “encuentro”, de “crecimiento”, de “compromiso”?",
    "¿En qué etapa del proceso grupal se encuentra tu grupo? ¿Por qué?",
    "¿Qué actividades se realizan en mi grupo para pasar de la experiencia de “grupo” a la experiencia de “comunidad juvenil”?"
  ]$j$::jsonb,
  $j$[
    {"question": "¿Cuáles son los cuatro pilares de JMV?", "options": ["Comunidad, Espiritualidad, Apostolado y Formación", "Oración, Estudio, Deporte y Misión", "Contemplar, Vivir, Servir y Celebrar"], "correct": 0, "explanation": "Como una silla con cuatro patas, JMV se sostiene sobre esos cuatro pilares."},
    {"question": "¿Cómo llama el manual a entrar al grupo para estar con otros, caminar con ellos y compartir la vida?", "options": ["La pedagogía del servicio", "La pedagogía del encuentro", "La desembocadura"], "correct": 1},
    {"question": "¿Qué ideal de comunidad sueña todo grupo JMV?", "options": ["El de los Hechos de los Apóstoles: un solo corazón y una sola alma", "Un club de amigos que se reúne a pasarla bien", "Un grupo de estudio bíblico"], "correct": 0, "explanation": "Hch 4, 32-35: “La multitud de los creyentes no tenía sino un solo corazón y una sola alma”."}
  ]$j$::jsonb,
  'Manual de JMV (2015), pp. 12-14',
  true
),
(
  'f0a1c001-0000-4000-8000-000000000002',
  'Espiritualidad: con María y desde María',
  'En el grupo no solo te encuentras con los otros, sino también con el Otro: Cristo vivo y resucitado.',
  'integracion', 'espiritualidad', 2, 15,
  $j${
    "passageRef": "Mt 18, 20",
    "passageText": "Donde están dos o tres reunidos en mi nombre, allí estoy yo en medio de ellos.",
    "prayer": "Señor Jesús, llegamos hasta ti, con María Inmaculada. A ti, el amigo de los pequeños y de los pobres, te alabamos. Tú nos miras a todos ¡con tanto amor! Enséñanos a vivir juntos con el dinamismo de tu Espíritu, que nos encamina por la senda de la admiración, de la verdad y de la acción. Concédenos el saber mirar a los demás con los ojos del corazón, para reconocer las maravillas que Tú has hecho en ellos, y de manera especial en los que se ven desfavorecidos. Ayúdanos a construir un mundo fraterno en el que nadie sea dejado de lado. Haz que obremos en todo no con espíritu de poder o de dominio, sino humildemente, con un espíritu de servicio. Amén."
  }$j$::jsonb,
  $j${
    "cards": [
      {"title": "El encuentro con el Otro", "body": "Una vez dentro del grupo no sólo te encuentras con los otros, sino también con el Otro. Descubres, como aquellos discípulos de Emaús, que hay alguien que te ha estado acompañando desde el principio, que comprende tus inquietudes y te ofrece un nuevo sentido a tu vida. Estar en JMV es decidirse a seguir a Cristo, aprendiendo a ser sus discípulos en la escuela de María de Nazaret y de San Vicente de Paúl."},
      {"title": "Tiempos de oración", "body": "En JMV hay que aprender a “vivir y orar, como María, en sencillez y humildad”, ante todo, mediante la escucha personal y comunitaria de la Palabra de Dios. Aprende a hacer la “lectio divina”: a leer, meditar, orar y contemplar la Palabra. Tu grupo debe convertirse en una auténtica escuela de oración: una oración que nos haga “contemplativos en la acción”."},
      {"title": "Tiempos de celebración", "body": "En la liturgia, especialmente en la Eucaristía, descubres la cumbre hacia la cual tiende toda la actividad de JMV y a su vez la fuente de donde mana toda su fuerza. No caigas en la rutina y descubre el valor de la Eucaristía, como el momento más importante de encuentro con Cristo vivo."},
      {"title": "La espiritualidad del Magníficat", "body": "Inspirados en el cántico del Magníficat, los miembros de JMV hacemos una opción clara por Dios como único absoluto; queremos vivir en actitud de alegría y agradecimiento, por las maravillas que Dios hace en nosotros; y queremos vivir una espiritualidad encarnada y comprometida, poniéndonos de parte de los pobres y los débiles."},
      {"title": "Las cuatro virtudes de un JMV", "body": "Humildad (espíritu de colaboración), obediencia (búsqueda de la voluntad de Dios), caridad (solidaridad con los pobres) y pureza (transparencia). ¡Es todo un programa de vida!"}
    ]
  }$j$::jsonb,
  $j${"commitment": "Empieza a escribir tu Proyecto Personal de Vida: el estilo de vida cristiano que quieres ir asumiendo y los pasos concretos para conseguirlo."}$j$::jsonb,
  $j$[
    "¿Encuentras en JMV una “escuela de oración”? Cuando vienes al grupo, ¿te encuentras con Cristo vivo?",
    "¿Cómo desarrollar en tu grupo una pedagogía de la oración que lleve a ti y a tus compañeros a tener mayor familiaridad con la Biblia y más gusto en celebrar la Eucaristía?",
    "¿Qué es para ti lo más importante de la “espiritualidad del Magníficat”?",
    "¿Estás utilizando el “proyecto de vida” y el “acompañamiento espiritual” como medios para crecer en la espiritualidad propia de JMV?"
  ]$j$::jsonb,
  $j$[
    {"question": "¿Cuáles son las cuatro virtudes de un JMV?", "options": ["Fe, esperanza, caridad y alegría", "Humildad, obediencia, caridad y pureza", "Sencillez, mansedumbre, celo y oración"], "correct": 1},
    {"question": "La lectio divina consiste en…", "options": ["Leer, meditar, orar y contemplar la Palabra", "Rezar el rosario completo", "Memorizar un versículo por día"], "correct": 0},
    {"question": "Para JMV, ¿qué es la cumbre y la fuente de toda su actividad?", "options": ["Los retiros", "La Eucaristía", "Los encuentros nacionales"], "correct": 1, "explanation": "Concilio Vaticano II, Sacrosanctum Concilium 10."}
  ]$j$::jsonb,
  'Manual de JMV (2015), pp. 15-16',
  true
),
(
  'f0a1c001-0000-4000-8000-000000000003',
  'Apostolado: un servicio que transforma',
  'Cuando descubres a Cristo vivo, buscas compartir este gran tesoro: te haces apóstol y servidor.',
  'integracion', 'apostolado', 3, 15,
  $j${
    "passageRef": "1 Cor 9, 16",
    "passageText": "¡Ay de mí si no anunciara el Evangelio!",
    "prayer": "Señor Jesús, llegamos hasta ti, con María Inmaculada. A ti, el amigo de los pequeños y de los pobres, te alabamos. Tú nos miras a todos ¡con tanto amor! Enséñanos a vivir juntos con el dinamismo de tu Espíritu, que nos encamina por la senda de la admiración, de la verdad y de la acción. Concédenos el saber mirar a los demás con los ojos del corazón, para reconocer las maravillas que Tú has hecho en ellos, y de manera especial en los que se ven desfavorecidos. Ayúdanos a construir un mundo fraterno en el que nadie sea dejado de lado. Haz que obremos en todo no con espíritu de poder o de dominio, sino humildemente, con un espíritu de servicio. Amén."
  }$j$::jsonb,
  $j${
    "cards": [
      {"title": "Te haces apóstol y servidor", "body": "Cuando has descubierto a Cristo vivo desde la experiencia de tu grupo-comunidad, buscas casi instintivamente compartir este gran tesoro con quienes te rodean. Puedes decir con San Vicente: “No me basta con amar a Dios, si mi prójimo no le ama”."},
      {"title": "Nuestras notas distintivas", "body": "Son como las notas musicales de una sinfonía: no podemos prescindir de ninguna. JMV es Eclesial, Laical, Mariana, Vicenciana y Misionera."},
      {"title": "Un servicio que transforma", "body": "Consiste en que suscite en ti y en tus compañeros no sólo actitudes y gestos concretos de solidaridad con los pobres, sino sobre todo un compromiso permanente por construir un nuevo modelo de sociedad, dando los pasos que dio el Buen Samaritano (Lc 10, 25-37)."},
      {"title": "Educa tu mirada y tu corazón", "body": "El samaritano “llegó junto a él y lo vio”: conocer el mundo de los pobres es el primer paso. “Y al verlo, se llenó de compasión”: no sólo debemos ver la realidad, sino también sentirla, vivir la misericordia como talante del corazón."},
      {"title": "Educa tus manos y asóciate con otros", "body": "“Acercándose, le vendó las heridas”: para ser samaritano hay que “bajarse del caballo” y ensuciarse las manos. “Sacó dos monedas y se las dio al posadero”: no basta solidarizarnos individualmente si no implicamos a otros en esta tarea comunitaria y social."}
    ]
  }$j$::jsonb,
  $j${"commitment": "Educa tu mirada: esta semana acércate a la realidad de alguien que pasa necesidad cerca de ti, mírala a la cara y ponle nombre."}$j$::jsonb,
  $j$[
    "¿Cuáles son tus virtudes que puedes poner al servicio de Dios y de los demás?",
    "¿Cuáles son los nuevos rostros de la pobreza que nos piden ayuda?",
    "Frente a esos nuevos rostros de la pobreza, ¿cómo podemos ser unos Buenos Samaritanos, como lo fueron Vicente de Paúl y Luisa de Marillac en su tiempo?",
    "¿Cuál de los cuatro pasos de la pedagogía del servicio transformador cuesta más en tu grupo? ¿Por qué?"
  ]$j$::jsonb,
  $j$[
    {"question": "¿Cuáles son las notas distintivas de JMV?", "options": ["Eclesial, Laical, Mariana, Vicenciana y Misionera", "Joven, Alegre, Unida y Fiel", "Orante, Estudiosa y Deportiva"], "correct": 0},
    {"question": "¿En qué parábola se inspiran los pasos del servicio que transforma?", "options": ["El hijo pródigo", "El buen samaritano", "Los talentos"], "correct": 1, "explanation": "Educa tu mirada, tu corazón, tus manos, y asóciate con otros para transformar la realidad (Lc 10, 25-37)."},
    {"question": "Completa la frase de San Vicente: “No me basta con amar a Dios, si…”", "options": ["…no rezo cada día", "…mi prójimo no le ama", "…no voy a misa"], "correct": 1}
  ]$j$::jsonb,
  'Manual de JMV (2015), pp. 17-19',
  true
),
(
  'f0a1c001-0000-4000-8000-000000000004',
  'Formación: un camino para crecer',
  'La formación es todo aquello que te ayuda a crecer íntegramente, hasta la madurez en Cristo.',
  'integracion', 'formacion', 4, 15,
  $j${
    "passageRef": "Ef 4, 13",
    "passageText": "Hasta que alcancemos el estado del hombre perfecto, y lleguemos a la madurez en Cristo.",
    "prayer": "Señor Jesús, llegamos hasta ti, con María Inmaculada. A ti, el amigo de los pequeños y de los pobres, te alabamos. Tú nos miras a todos ¡con tanto amor! Enséñanos a vivir juntos con el dinamismo de tu Espíritu, que nos encamina por la senda de la admiración, de la verdad y de la acción. Concédenos el saber mirar a los demás con los ojos del corazón, para reconocer las maravillas que Tú has hecho en ellos, y de manera especial en los que se ven desfavorecidos. Ayúdanos a construir un mundo fraterno en el que nadie sea dejado de lado. Haz que obremos en todo no con espíritu de poder o de dominio, sino humildemente, con un espíritu de servicio. Amén."
  }$j$::jsonb,
  $j${
    "cards": [
      {"title": "¿Qué es la formación?", "body": "La formación es todo aquello que te ayuda a crecer íntegramente: catequesis, conferencias y encuentros, convivencias y retiros, cursos. Es un camino permanente de crecimiento, cuya finalidad es que Cristo sea formado en nuestro corazón y en nuestra vida."},
      {"title": "La meta del proceso", "body": "Madurar como persona, optando por Cristo como referencia fundamental y tomando a María como modelo de creyente, para que desde una comunidad cristiana adulta, te comprometas en la transformación del mundo desde el compromiso con los más pobres."},
      {"title": "Las cuatro dimensiones formativas", "body": "Maduración humano-cristiana; experiencia comunitaria y eclesial; espiritualidad mariana-vicenciana; y compromiso social y misionero."},
      {"title": "La desembocadura", "body": "El proceso formativo debe conducirte al discernimiento y la opción vocacional. En JMV a este momento lo llamamos “desembocadura”: como laico dentro de JMV o en otros grupos de la Familia Vicenciana, como consagrado, en otras instancias o como misionero seglar. Todo desemboque es válido siempre que se haga de cara a Dios y a los pobres."}
    ]
  }$j$::jsonb,
  $j${"commitment": "Elige la dimensión formativa a la que das menor importancia y decide qué vas a hacer para trabajarla mejor."}$j$::jsonb,
  $j$[
    "¿Crees que tu grupo ha optado ya por una pastoral de procesos, o continúa en una pastoral de actividades?",
    "¿Crees que la formación que recibes parte de la vida y situación concreta de cada uno y te sirve para la vida?",
    "¿Das lo mejor de ti en tu proceso de formación? ¿Qué vas a hacer para mejorar?",
    "¿Cuál de las cuatro dimensiones del proceso formativo das menor importancia? ¿Qué vas a hacer para trabajarla mejor?"
  ]$j$::jsonb,
  $j$[
    {"question": "¿Cómo llama JMV al momento de la opción vocacional al final del proceso?", "options": ["Consagración", "Desembocadura", "Promesa"], "correct": 1},
    {"question": "¿Cuál NO es una de las cuatro dimensiones formativas?", "options": ["Maduración humano-cristiana", "Compromiso social y misionero", "Competencia deportiva"], "correct": 2},
    {"question": "Según el manual, ¿cuál es la finalidad de la formación?", "options": ["Que Cristo sea formado en nuestro corazón y en nuestra vida", "Aprobar los cursos de JMV", "Conocer de memoria los estatutos"], "correct": 0}
  ]$j$::jsonb,
  'Manual de JMV (2015), pp. 19-20',
  true
)
ON CONFLICT ("id") DO NOTHING;
