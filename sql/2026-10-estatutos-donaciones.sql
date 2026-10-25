-- Tablas de los Estatutos Nacionales (versiones con historial) y de la página
-- de donaciones (/donar), editables desde el panel de administración.
-- Mismos nombres (tablas, columnas, PK/UQ/CHECK e índices) que genera TypeORM a
-- partir de las entidades StatuteVersion, DonationSettings, DonationAccount,
-- DonationPurpose y DonationCampaign.
-- En producción synchronize está desactivado, así que hay que aplicarlo a mano.
-- Es idempotente: se puede ejecutar varias veces sin problema.
--
-- Uso en el VPS (desde la carpeta jmv_ecuador_backend, con las variables del .env cargadas):
--   docker exec -i jmv_database psql -U $DATABASE_USER -d $DATABASE_NAME < sql/2026-10-estatutos-donaciones.sql
--
-- Las donaciones son anónimas: no hay ninguna tabla con datos de quien dona.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

BEGIN;

-- ESTATUTOS
-- content: Markdown con las convenciones de los estatutos (### Artículo N · Título)
-- pdfUrl: URL https o ruta /documentos/... del original
-- Solo una versión puede estar vigente (índice único parcial sobre isCurrent)
CREATE TABLE IF NOT EXISTS "statute_versions" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "slug" character varying(120) NOT NULL,
  "title" character varying(200) NOT NULL,
  "versionLabel" character varying(40) NOT NULL,
  "approvedAt" date NOT NULL,
  "approvedBy" character varying(200) NOT NULL,
  "summary" text,
  "content" text NOT NULL,
  "pdfUrl" text,
  "isCurrent" boolean NOT NULL DEFAULT false,
  "published" boolean NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_3afd76f91e5d6a83812a183f26a" UNIQUE ("slug"),
  CONSTRAINT "PK_2cc1a89b1daa6bc2126d82b5102" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_statute_versions_current" ON "statute_versions" ("isCurrent") WHERE "isCurrent" = true;
CREATE INDEX IF NOT EXISTS "idx_statute_versions_published_approved" ON "statute_versions" ("published", "approvedAt");

-- DONACIONES
-- Fila única (id = 1) con los textos y medios de pago de /donar
-- whatsapp: solo dígitos con código de país (p. ej. 593991234567)
CREATE TABLE IF NOT EXISTS "donation_settings" (
  "id" smallint NOT NULL DEFAULT '1',
  "headline" character varying(150) NOT NULL,
  "intro" text NOT NULL,
  "contactNote" character varying(300) NOT NULL,
  "whatsapp" character varying(20),
  "email" character varying(150),
  "paypalUrl" text,
  "qrImageUrl" text,
  "qrImagePublicId" text,
  "qrLabel" character varying(120),
  "inKindNote" text,
  "transparencyNote" text,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "chk_donation_settings_singleton" CHECK ("id" = 1),
  CONSTRAINT "PK_d1a5345b6d2bae9dc76b68e4b19" PRIMARY KEY ("id")
);

-- accountType: 'ahorros' | 'corriente'
-- accountNumber: texto con dígitos y guiones (conserva ceros a la izquierda)
-- holderId: cédula (10 dígitos) o RUC (13 dígitos)
CREATE TABLE IF NOT EXISTS "donation_accounts" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "bankName" character varying(120) NOT NULL,
  "accountType" character varying(20) NOT NULL,
  "accountNumber" character varying(40) NOT NULL,
  "holderName" character varying(150) NOT NULL,
  "holderId" character varying(13),
  "holderRole" character varying(120),
  "email" character varying(150),
  "notes" text,
  "active" boolean NOT NULL DEFAULT true,
  "displayOrder" integer NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "chk_donation_accounts_type" CHECK ("accountType" IN ('ahorros', 'corriente')),
  CONSTRAINT "PK_9a786b3562d048c0e39bfcdbbb0" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_donation_accounts_active_order" ON "donation_accounts" ("active", "displayOrder");

-- icon: nombre de icono lucide de la lista permitida
CREATE TABLE IF NOT EXISTS "donation_purposes" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "title" character varying(120) NOT NULL,
  "description" text NOT NULL,
  "icon" character varying(30) NOT NULL DEFAULT 'Heart',
  "imageUrl" text,
  "imagePublicId" text,
  "active" boolean NOT NULL DEFAULT true,
  "displayOrder" integer NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "chk_donation_purposes_icon" CHECK ("icon" IN ('Heart', 'HandHeart', 'Users', 'BookOpen', 'Tent', 'Church', 'GraduationCap', 'Gift', 'Sparkles', 'Globe')),
  CONSTRAINT "PK_fe32cb9c09b9a5b2181f680969e" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_donation_purposes_active_order" ON "donation_purposes" ("active", "displayOrder");

-- startsAt / endsAt: fechas solo día; NULL = sin límite
CREATE TABLE IF NOT EXISTS "donation_campaigns" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "slug" character varying(120) NOT NULL,
  "title" character varying(150) NOT NULL,
  "description" text NOT NULL,
  "goalAmount" numeric(12,2),
  "raisedAmount" numeric(12,2),
  "currency" character varying(3) NOT NULL DEFAULT 'USD',
  "imageUrl" text,
  "imagePublicId" text,
  "startsAt" date,
  "endsAt" date,
  "active" boolean NOT NULL DEFAULT true,
  "displayOrder" integer NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_0ba5a21aa57099936d4f5a0621b" UNIQUE ("slug"),
  CONSTRAINT "chk_donation_campaigns_goal" CHECK ("goalAmount" IS NULL OR "goalAmount" >= 0),
  CONSTRAINT "chk_donation_campaigns_raised" CHECK ("raisedAmount" IS NULL OR "raisedAmount" >= 0),
  CONSTRAINT "chk_donation_campaigns_dates" CHECK ("startsAt" IS NULL OR "endsAt" IS NULL OR "endsAt" >= "startsAt"),
  CONSTRAINT "PK_d592dfa0964d30ef0095c66b45a" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_donation_campaigns_active_order" ON "donation_campaigns" ("active", "displayOrder");

-- SEMILLA
-- Configuración de donaciones por defecto: textos neutros y SIN datos bancarios
-- (las cuentas, el QR y PayPal los pone el Tesorero/a Nacional desde el admin).
-- ON CONFLICT DO NOTHING: no pisa lo que se haya editado desde el admin.
INSERT INTO "donation_settings" ("id", "headline", "intro", "contactNote", "email")
VALUES (
  1,
  'Apoya la misión de JMV Ecuador',
  'Tu aporte ayuda a que más jóvenes vivan la fe, se formen y sirvan a los más pobres al estilo de María y de San Vicente de Paúl.',
  '¿Tienes dudas sobre tu donación? Escríbenos y te ayudamos.',
  'jmvecuador@gmail.com'
)
ON CONFLICT ("id") DO NOTHING;

-- Estatutos Nacionales vigentes (los mismos de src/statutes/seed/statutes.seed.ts).
-- ON CONFLICT (slug) DO NOTHING: no pisa lo que se haya editado desde el admin.
-- Solo queda vigente si todavía no hay otra versión vigente (índice único parcial).
INSERT INTO "statute_versions"
  ("slug", "title", "versionLabel", "approvedAt", "approvedBy", "summary", "content", "pdfUrl", "isCurrent", "published")
SELECT
  'estatutos-2010',
  'Estatutos Nacionales de Juventudes Marianas Vicentinas del Ecuador',
  '2010',
  '2010-08-15',
  'P. G. Gregory Gay, C.M., Superior General de la Congregación de la Misión y de las Hijas de la Caridad y Director General de la Asociación',
  NULL,
  '# Estatutos Nacionales de la Asociación Juventudes Marianas Vicentinas del Ecuador
> En virtud de los Rescriptos Pontificios, concedidos por Su Santidad PIO IX del 20 de Junio de 1847 y del 19 de Julio de 1850, el Superior General de la Congregación de la Misión y de las Hijas de la Caridad es el Director General de la Asociación de Hijos e Hijas de María, actualmente conocida como Asociación de Juventud Mariana Vicenciana.
>
> Como Director General de dicha Asociación apruebo los presentes Estatutos de la Asociación de Juventud Mariana Vicenciana de ECUADOR para cumplir lo establecido en el canon 304:
>
> 1. Todas las asociaciones de fieles, tanto públicas como privadas, cualquiera que sea su nombre o título, deben tener sus Estatutos propios, en los que se determine el fin u objeto social de la asociación, su sede, el gobierno y las condiciones que se requieren para formar parte de ellas, y se señale también el modo de actuar, teniendo en cuenta la necesidad o conveniencia del tiempo y del lugar.
>
> 2. Escogerán un título o nombre que responda a la mentalidad del tiempo, inspirado preferentemente en el fin que persiguen
>
> Roma, quince de agosto del año 2010
>
> G. Gregory GAY, C.M — Superior General, Director General JMV.

## Capítulo I · Identidad

### Artículo 1 · Constitución
1.1 “Juventud Mariana Vicenciana” (JMV) es una actualización y renovación de Hijos e Hijas de María que tuvo su origen en las apariciones de la Virgen María a Santa Catalina Labouré en 1830. La Asociación de Hijos e Hijas de María fue aprobada por el romano Pontífice Pío IX el 20 de junio de 1847 y el 19 de julio de 1850, y posteriormente confirmada por otras disposiciones de la Santa Sede.
1.2 En virtud de dichos rescriptos, la Dirección General de la Asociación corresponde al Superior General de la Congregación de la Misión y de las Hijas de la Caridad y a sus legítimos sucesores en el gobierno de las dos Congregaciones.
1.3 Para la constitución de la Asociación Nacional, se requiere la aprobación de dicha Asociación y sus Estatutos, por el Director General de la Asociación de Juventudes Marianas Vicentinas. La anterior aprobación oficial de JMV Ecuador se dio el 12 de junio de 2000, por el P. Robert P. Maloney, entonces Director General de la Asociación.

### Artículo 2 · Nombre oficial, personalidad jurídica y sede
2.1 La Asociación Cristiana establecida en estos Estatutos se denomina JUVENTUDES MARIANAS VICENTINAS DEL ECUADOR, con sus siglas JMV, fundada en Ecuador el 18 de julio de 1995.
2.2 La Asociación es una entidad sin fines de lucro, de derecho privado de acuerdo a lo establecido en el Título XXIX, *del* Libro I, del Código Civil y demás leyes y reglamentos que le sean aplicables y como tal no podrá intervenir en asuntos políticos, raciales; ni ejercerá actividades industriales, comerciales, agrícolas u otros semejantes, por ser una persona jurídica, de acuerdo con el Art. 585 del Código Civil.
2.3 Su domicilio se fija en la ciudad de Quito, Cantón Quito, Provincia de Pichincha, en el Barrio la Recoleta, Calle San Vicente de Paúl, Sede de la Familia Vicenciana. Email: jmvecuador@yahoo.es

### Artículo 3 · Notas características
Por su naturaleza, la Asociación es Eclesial, Laica, Mariana, Vicenciana y Misionera.
3.1 *Eclesial:* Los miembros de JMV, conscientes de su pertenencia a la Iglesia, pueblo de Dios, se comprometen a secundar activa y responsablemente las orientaciones de sus Pastores y de las directivas de la pastoral juvenil diocesana, a tomar como propios los intereses de la Iglesia universal y local y colaborar con las demás fuerzas apostólicas de la misma.
3.2 *Laical:* Es una Asociación de jóvenes laicos, registrado en las distintas oficinas de Pastoral Juvenil en las diversas diócesis del Ecuador. Se encuentra avalada internacionalmente por el Consejo Pontificio para los Laicos y por el Secretariado Internacional de Juventud Mariana Vicenciana. La Asociación ejerce su acción con los niños y los jóvenes y los estimula para que participen en la tarea evangelizadora de la Iglesia, principalmente en el ambiente en que ellos viven.
3.3 *Mariana:* Los miembros de la Asociación descubren en el Evangelio a María y la parte activa que Ella tuvo, junto a su Hijo, Jesucristo, y sigue teniendo en el Proyecto de Salvación. Igualmente, los miembros de la Asociación ven en María, Madre del Señor, el modelo inspirador que les ayuda, con la fuerza del Espíritu Santo, a caminar en la fe a lo largo de su vida.
3.4 *Vicenciana:* Por su nacimiento en el seno de la familia espiritual de San Vicente de Paúl, JMV se inspira en el carisma vicenciano y hace de la evangelización el servicio a los pobres el distintivo de su presencia en la Iglesia y en el mundo entero.
3.5 *Misionera:* JMV estará siempre dispuesta a ejecutar una acción apostólica en los ambientes juveniles, a prestar su ayuda a la obra misionera de la Iglesia, tanto a la dirigida Ad-Gentes como la orientada a la revitalización cristiana del Pueblo de Dios, y a despertar y favorecer las iniciativas misioneras, evangelizadoras catequéticas de sus miembros.

### Artículo 4 · Espiritualidad propia
4.1 El seguimiento de Jesucristo evangelizador de los pobres y la mirada atenta al ejemplo de María y de San Vicente hacen que JMV viva una espiritualidad cristocéntrica mariana y vicenciana.
4.2 Sus miembros se esfuerzan para alcanzar la perfección cristiana, mediante el encuentro personal con Cristo, el servicio al pobre y el testimonio de vida.
4.3 Y asumiendo la Espiritualidad del Magníficat, los jóvenes procuran vivir las virtudes características de la Asociación:
4.3.1 *Espíritu de Colaboración (Humildad):* Les mueve a cultivar el valor de las pequeñas aportaciones, trabajando en la búsqueda del bien común, superando actividades individualistas, sin temor a comprometerse en grandes obras, reconociendo que Dios obra en y con ellos.
4.3.2 *Búsqueda de la voluntad de Dios (Obediencia):* Les lleva a discernir juntos las opciones a realizar, a la luz de la Palabra de Dios y a aceptar las decisiones tomadas por el grupo encausando el protagonismo juvenil. Esta búsqueda de la voluntad de Dios se expresa también en la vida personal.
4.3.3 *Solidaridad con los pobres (Caridad):* Les mueve a implicar los bienes y cualidades personales en la atención integral a los marginados de nuestra sociedad sin dejarse dominar por el consumismo y la publicidad.
4.3.4 *Transparencia (Pureza):* Les orienta a vivir honestamente su maduración afectivo – sexual, integrando con gozo la castidad y la fidelidad, sin ceder al espíritu hedonista que nos rodea y con vistas a la propia realización vocacional.
4.4. Todos los jóvenes elaborarán su *Proyecto Personal de Vida,* para recoger el estilo de vida cristiano que quieren ir asumiendo y los pasos concretos que se marcan para conseguirlo. Contarán también con un *acompañante espiritual*, que les ayude a integrar, desde el proyecto personal las diferentes dimensiones de su vida y a dar pasos firmes en la maduración de su fe.

## Capítulo II · Fines y medios

### Artículo 5 · Fines
Constituyen fines y objetivos de la Asociación los siguientes:
5.1 Formar a sus miembros para que vivan la vocación cristiana tomando como modelo a la Virgen María. De ella toman el fiarse en Dios y su modelo de orar.
5.2 A ejemplo de María al servicio de su prima Isabel, suscitar, animar y mantener, en la Asociación: prontitud y disponibilidad en el espíritu misionero y el apostolado a favor de los pobres, principalmente de los jóvenes víctimas de la pobreza espiritual y material. Les servirá el ejemplo misionero de San Vicente de Paúl, protector de la Asociación para el apostolado mediante el testimonio de vida y el servicio a los pobres.
5.3 Procurar la promoción de sus miembros, personal y colectivamente, para colaborar en el seno de la Iglesia y de la sociedad, con toda clase de medios pastorales, culturales y creativos, con los demás agentes de Pastoral, según las orientaciones de la Jerarquía de la Iglesia universal y local.

### Artículo 6 · Medios
Para conseguir los fines propuestos, JMV se sirve de los medios convenientes:
6.1 Promueve la interiorización de la Palabra del Señor y la celebra. Valora la oración personal, grupal y la liturgia, porque Cristo se hace presente en la Palabra, la Eucaristía y entre los que oran reunidos.
6.2 Ofrece un proceso catequético de maduración en la fe, con sus etapas, metas y actividades.
6.3 Propone a los Santos de la Familia Vicenciana como modelo de las personas que vivieron su vida entregada al evangelio desde la caridad.
6.4 Promueve cursillos, encuentros, retiros, campamentos, asambleas, congresos, publicaciones y otros semejantes.
6.5 Ofrece a los miembros la posibilidad de servir a los pobres.
6.6 Propone la Consagración Mariana a todos sus miembros.

### Artículo 7 · La Consagración Mariana
7.1 La Asociación ofrece a los jóvenes la Consagración a María como una manera de reafirmar su consagración bautismal y hacer de su vida una entrega total a Dios desde el servicio y la evangelización de los pobres.
7.2 La Consagración Mariana será fruto del conocimiento profundo de la Asociación, de la madurez humana, la formación en la fe y de un discernimiento serio en el Espíritu.
7.3 El acto de la Consagración expresa que el/la joven asume su adultez en la fe, desde la identidad mariana y vicentina. La consagración a Cristo con María debe ser una aspiración de todos los miembros de JMV, es decir, todos deben aspirar a realizarla y vivirla.
7.4 Para la Consagración podrán optar los miembros jóvenes habiendo seguido el proceso de formación durante al menos dos años.
7.5 El joven que desee consagrarse deberá solicitar por escrito al Consejo Nacional adjuntando el informe del/de la Asesor/a Local del buen comportamiento civil y cristiano del aspirante.
7.6 La Consagración tendrá lugar de preferencia durante la celebración Eucarística y con entrega de la Medalla Milagrosa.

## Capítulo III · Miembros

### Artículo 8 · Clasificación de los miembros
La Asociación está compuesta principalmente por niños y jóvenes y se divide en las siguientes secciones:
- Infancia Misionera Vicenciana: 9 a 11 años
- Prejuveniles: 12 a 15 años
- Jóvenes: 16 a 35 años

### Artículo 9 · Admisión
9.1 Para formar parte de un grupo JMV se requiere:
- Tener entre 9 y 30 años
- El bautismo. Los no bautizados pueden participar de la vida de la Asociación pero sólo podrán solicitar su Admisión una vez bautizados.
- Un conocimiento personal del/de la interesado/a, por parte del/de la Asesor/a o miembros del grupo.
9.2 Para ser admitido como miembro se requiere:
- Pertenecer al nivel de Prejuveniles o Jóvenes
- Transcurrido al menos un año desde la integración al grupo, petición de Admisión por escrito dirigida al/la Asesor/a y al/la Coordinador/a de grupo. Los jóvenes que han vivido su proceso en los grupos de Infancia Misionera Vicentina presentan su petición escrita al culminar su nivel.
- Diálogo previo del/de la Asesor/a con el/la joven, para clarificar motivaciones.
- Aprobación del Consejo Local.
9.3 En el momento oportuno y durante una celebración pública se hará oficial la nómina de los nuevos miembros. Esta será la constancia de su Admisión en JMV. Oportunamente, el Secretario de grupo participará en dichas admisiones al Secretariado Nacional.
9.4 Para ser admitidos como miembros en pleno derecho se requiere ser consagrado, (Cfr. Art. 7 de los presentes estatutos).

### Artículo 10 · Deberes de los miembros
10.1 *Infancia Misionera Vicenciana* y *Prejuveniles/Jóvenes no admitidos*:
- Esforzarse por conseguir los fines de la Asociación.
- Asistir regularmente a las reuniones y encuentros.
- Observar buen comportamiento cívico y cristiano.
- Cumplir con los Estatutos y Reglamentos internos, instructivos y demás resoluciones debidamente aprobadas.
10.2 *Prejuveniles* y *Jóvenes admitidos:*
- Esforzarse para que la Asociación consiga sus fines y logre sus metas.
- Asistir regularmente a las reuniones y/o Asambleas.
- Observar buen comportamiento cívico y cristiano.
- Pagar las cuotas establecidas.
- Desempeñar con responsabilidad los cargos que se le asigne.
- Cumplir con los Estatutos y Reglamentos internos, instructivos y demás resoluciones debidamente aprobadas.

### Artículo 11 · Derechos de los miembros
11.1 *Infancia Misionera Vicenciana*
- Participar activamente en los fines y actividades que la Asociación dirige a su respectivo nivel.
- Recibir una formación humana y cristiana adecuada a su edad.
- Realizar celebraciones significativas de fe que motiven su amor, servicio y compromiso en la Asociación.
11.2 *Prejuveniles y Jóvenes no admitidos*:
- Participar activamente en los fines y actividades que la Asociación dirige a su respectivo nivel.
- Recibir una formación humana y cristiana adecuada a su edad.
- Realizar celebraciones significativas de fe que motiven su amor, servicio y compromiso en la Asociación.
- Tomar parte en las Asambleas de acuerdo con lo determinado por los presentes Estatutos.
11.3 *Prejuveniles* y *Jóvenes admitidos:*
- Participar en los fines y actividades de la Asociación.
- Recibir información referente a la vida de la Asociación.
- Tomar parte en las Asambleas con voz y voto, de acuerdo con lo determinado por los presentes Estatutos, cfr. con el art. 9.4
- Ser elegidos para los cargos de la Asociación

### Artículo 12 · Baja de los miembros
12.1 Todo miembro tiene derecho a dejar la Asociación comunicándolo por escrito a su Consejo Local.
12.2 Los miembros que no participen más de dos años de la vida de la Asociación, sin previa justificación o permiso, causarán baja automáticamente en la misma.
12.3 Cuando un miembro incumple con sus deberes para con la Asociación en forma reincidente y/o comete actos graves que atenten contra la moral católica y/o civil, el/la Asesor/a Local (sacerdote, Hija de la Caridad o laico) lo/la amonestará cristianamente “en privado” para que rectifique su caminar errado.
12.4 Si después de ser amonestado/a la primera vez, no se corrige, se le amonestará por escrito. Si se empeña en continuar su mal ejemplo para la Asociación, la Iglesia y la sociedad civil, el/la Asesor/a Local, junto con el/a Coordinador/a, informarán al Consejo Nacional para que ellos procedan a la separación. En el caso de ser un joven no consagrado puede ser separado por parte del Consejo Local.
12.5 El miembro separado no tiene derecho a reclamar compensación alguna por su labor en la Asociación en ningún foro civil o eclesial.
12.6 El miembro separado puede pedir consideración de evaluación de su caso ante el Consejo Nacional en los treinta (30) días siguientes a su separación.

### Artículo 13 · Adultos
13.1 Para lograr sus fines, JMV Ecuador cuenta con la presencia de Adultos, jóvenes laicos de 35 años en adelante que han culminado su proceso de formación, cuya misión en la Asociación, junto a los Asesores Consagrados, es:
13.1.1 Participar de los fines y actividades de la misma;
13.1.2 Ser formadores, animadores espirituales y responsables de algunas actividades de la Asociación;
13.1.3 Asistir a las reuniones con voz;
13.1.4 Observar buen comportamiento cristiano y cívico como verdaderos formadores y educadores;
13.1.5 Participar en las actividades de animación de la fe dando continuidad al proceso de formación cristiana y vicenciana.
13.2 La Asociación cuenta con la colaboración de los padres de los miembros quienes admitan sus Estatutos y espiritualidad siendo puntos de apoyo y desarrollo de procesos de maduración personal y familiar.

## Capítulo IV · Órganos de gobierno

### Artículo 14 · Nivel internacional
Juventudes Marianas Vicentinas del Ecuador forma parte de la Asociación Internacional de JMV, que se gobierna a tenor de las disposiciones del Derecho Canónico universal y de sus propios Estatutos. A nivel internacional, sus órganos de gobierno son:
- El Director General
- La Asamblea General
- El Consejo Internacional
- El Secretariado Internacional.

### Artículo 15 · El Director General
En virtud de una concesión pontificia, la Dirección General de la Asociación corresponde al Superior General de la Congregación de la Misión y de las Hijas de la Caridad y a sus legítimos sucesores.

### Artículo 16 · Asamblea General
Cada cinco (5) años, se convocará a una Asamblea General con participación del Consejo Internacional, del Secretariado Internacional y de dos laicos por asociación nacional, para tratar los asuntos importantes de la Asociación *(Cfr. Est. Inter., art. 16)*.

### Artículo 17 · Consejo Internacional
Para mantener su dinamismo y dirección, la Asociación cuenta con un Consejo Internacional, compuesto por el Director General, el Subdirector General, una Consejera General de las Hijas de la Caridad, un Presidente/a laico y cuatro miembros laicos elegidos por la Asamblea General. Son los responsables mayores de la Asociación.

### Artículo 18 · Secretariado Internacional
La Asociación cuenta, además, con un Secretariado Internacional, compuesto al menos por dos personas con dedicación preferente, que se encargarán de dinamizar los programas fijados en el Consejo Internacional y la Asamblea General. Su sede está situada en Madrid (España).

### Artículo 19 · Nivel latinoamericano
A nivel latino americano, la Asociación cuenta con un Equipo Latinoamericano, que es una instancia de animación y apoyo mutuo entre las Asociaciones de los distintos países latinoamericanos. Se rige por Reglamento propio.

### Artículo 20 · Nivel nacional
A nivel nacional, la Asociación cuenta con los siguientes órganos de gobierno:
- La Asamblea Nacional
- El Consejo Nacional
- El Consejo Local

### Artículo 21 · La Asamblea Nacional
21.1 La Asamblea Nacional es la mayor instancia de decisión y de animación de la Asociación a nivel nacional. La convoca y la preside el/la Coordinador Nacional, con el acuerdo del Consejo Nacional.
21.2 La asamblea será ordinaria y extraordinaria. La Asamblea ordinaria se reunirá cada tres años. La asamblea extraordinaria se reunirá de acuerdo a las necesidades de la Asociación, por decisión unánime del Consejo Nacional.
21.3 Sus competencias son:
- Estudiar temas relacionados con el espíritu y desarrollo de la Asociación.
- Proponer planes pastorales y directrices para el siguiente periodo.
- Fijar la cuota anual de los miembros.
- Aprobar el informe de actividades y el informe económico presentados por el Consejo Nacional.
- Elegir, cuando corresponde, a los miembros laicos del Consejo Nacional.
- Elegir por mayoría absoluta el/la delegado/a y suplentes para la Asamblea General, quien acompañará al/la Coordinador/a Nacional que va por oficio.
- Revisar los Estatutos Nacionales de la Asociación y proponer sus enmiendas al Director General para su aprobación.
21.4 Miembros de la Asamblea Nacional que participan con voz y voto:
21.4.1 Los miembros del Consejo Nacional
21.4.2 Los miembros consagrados.
21.5 Miembros de la Asamblea Nacional que participan con voz sin voto:
21.5.1 Los Asesores Locales y Zonales.
21.5.2 Personas que el Consejo Nacional juzgue conveniente invitar.
21.6 La Asamblea está válidamente constituida si asisten al menos la mitad más uno de sus miembros con derecho a voz y voto.
21.7 Toda resolución, a excepción de las elecciones y revisión de Estatutos, se tomará por la mitad más uno de votos, al tenor del c. 119. Las resoluciones de las asambleas constarán en actas, los cuales serán firmadas por el/la Coordinador/a, Asesor y Asesora Nacionales, y Secretario/a Nacional.

### Artículo 22 · Consejo Nacional
22.1 El Consejo Nacional estará conformado por las siguientes personas:
- Coordinador/a
- Vice-coordinador/a
- Secretario/a
- Tesorero/a
- Vocales
- Asesor Nacional
- Asesora Nacional
22.2 El Consejo Nacional se reúne al menos dos veces al año. El/la Coordinador/a Nacional convoca, con el visto bueno de los Asesores Nacionales, las reuniones del Consejo Nacional, y las preside.

### Artículo 23 · Funciones del Consejo Nacional
- Promover y animar los grupos en las notas distintivas de la Asociación.
- Fomentar la fraternidad y el servicio de cada miembro de la Asociación.
- Aprobar Direcciones y Reglamentos.
- Elaborar el plan anual de trabajo.
- Organizar los diferentes Encuentros y la Asamblea Nacional.
- Velar la gestión económica de la Asociación.
- Examinar y aprobar los presupuestos e informes económicos presentados por el/la Tesorero/a Nacional.
- Autorizar adquisiciones, enajenaciones e hipotecas sobre los bienes de la Asociación.
- Informar anualmente de las actividades realizadas.
- Promover y aprobar la Consagración Mariana de los miembros y la creación de nuevos grupos.
- Dar su consentimiento para confederarse con otras Asociaciones, con el acuerdo de los Asesores Nacionales.
- Mantener buenas relaciones y colaborar con las distintas Ramas de la Familia Vicenciana y otros movimientos de la Iglesia.
- Comunicarse con regularidad al Secretariado Internacional dándole a conocer sobre las principales publicaciones, cartas a los miembros y actas del Consejo Nacional.
- Colaborar económicamente con la Asociación a nivel internacional.

### Artículo 24 · Coordinador/a Nacional
24.1 El/la Coordinador/a Nacional es un/a animador/a de los jóvenes que vive en su proceso de crecimiento en la fe en JMV. Se caracteriza por ser:
24.1.1 Persona de fe, conocedora del espíritu vicenciano y de la realidad de los jóvenes.
24.1.2 Sembrador/a de esperanza, capaz de contagiar a los jóvenes el amor a Cristo, a la Virgen María y a los pobres.
24.1.3 Abierto/a a la escucha y siempre dispuesto a ayudar, con una actitud de prudencia, respeto y responsabilidad.
24.1.4 Joven con capacidad de liderazgo.
24.2 Sus funciones son:
- Convocar de acuerdo con el Asesor Nacional y la Asesora Nacional las reuniones en pleno del Consejo Nacional, los Encuentros Nacionales y la Asamblea Nacional, y presidirlas.
- Preparar la agenda de las reuniones del Consejo Nacional, en coordinación con los Asesores Nacionales y el/la Secretario/a Nacional.
- Representar a la Asociación a nivel civil, en las reuniones laicas, civiles y eclesiales.
- Mantener relaciones con las Ramas de la Familia Vicenciana, con otros movimientos laicales de juventud e instancias eclesiales.
- Visitar y animar a los Consejos de la zona y locales.
- Velar por el cumplimiento de los Estatutos y de los compromisos asumidos en la Asamblea General.
- Informar regularmente al Consejo Nacional de sus actividades.

### Artículo 25 · Funciones del/ de la Vice-Coordinador/a Nacional
- Visitar y animar a las zonas y Consejos Locales.
- Informar regularmente al Consejo Nacional de sus actividades.
- En ausencia del/de la Coordinador/a Nacional deberá sustituirlo/la.

### Artículo 26 · El/la Secretario/a Nacional
26.1 El/la Secretario/a Nacional es la memoria permanente y fiel de cuanto sucede en JMV, un colaborador activo y responsable en todo lo que concierne a la Secretaría.
26.2 Sus funciones son:
- Tener al día el libro de actas y comunicaciones.
- Informar al/la Coordinador/a Nacional, Asesora Nacional y Asesor Nacional de sus actividades.
- Enviar comunicaciones y confirmar recepción.
- Revisar constantemente las comunicaciones y redactar sus respectivas contestaciones.
- Informar a los miembros sobre la marcha de la Asociación.
- Mantener la comunicación con el Equipo Latinoamericano y el Secretariado Internacional de JMV.
- Mantener actualizada las nóminas de los miembros de la Asociación.

### Artículo 27 · Tesorero/a Nacional
27.1 Es una persona responsable que vela diligentemente por la conservación, el mantenimiento y el incremento del patrimonio de la Asociación, con criterio evangélico y vicenciano. Se preocupa por informarse y conocer todo cuanto pueda ayudarle a realizar su mejor servicio.
27.2 Sus funciones son:
- Custodiar y administrar los fondos de la Asociación según las normas del derecho universal y de los propios Estatutos.
- Llevar los libros de contabilidad y presentar al pleno del Consejo y de la Asamblea Nacional las veces que requiera, un informe de cuentas de los fondos de la Asociación.
- Preparar los presupuestos para que los apruebe el Consejo Nacional.
- Ejecutar todas las operaciones económicas que se confíen al tenor del derecho universal y de los propios Estatutos.
- Recibir y administrar las donaciones y cuotas.
- Promover campañas y actividades para favorecer la autofinanciación de la Asociación.
- Elaborar el Inventario de los bienes de la Asociación y mantenerlo al día.
- Cancelar oportunamente al Secretariado Internacional la cuota anual.

### Artículo 28 · Vocales
28.1 Además de los cargos del Consejo Nacional descritos anteriormente, el Consejo Nacional cuenta con 2 vocalías que ayuden a la marcha de la Asociación, según el Consejo juzgue convenientes.
28.2 En JMV, los vocales son miembros responsables del dinamismo de la Asociación. Acompañan las diferentes actividades de la Asociación, haciendo que todos sean corresponsables de la misma.
28.3 Sus funciones son:
28.3.1 Participar en todas las reuniones del Consejo Nacional.
28.3.2 Promover, programar y coordinar las actividades de la vocalía que represente.
28.3.3 Informar de sus actividades a dicho Consejo y recibir la aprobación de sus proyectos.

### Artículo 29 · Requisitos y elecciones de los miembros del Consejo Nacional
29.1 Los miembros del Consejo Nacional serán elegidos por la Asamblea General mediante votación secreta. Para la elección se requerirá al menos la mitad mas uno en los dos primeros escrutinios de mayoría absoluta; y si se tuviera que llegar a una tercera votación basta obtener para ser elegido una mayoría relativa.
29.2 La elección se realizará de la siguiente manera:
29.2.1 El Consejo Nacional pedirá a los Consejos Locales la lista de los posibles candidatos con sus currículos.
29.2.2 El Consejo Nacional presentará a la Asociación los que considera aptos, dos meses antes de la Asamblea Nacional.
29.2.3 Una vez instalada la Asamblea con los asistentes con voz y voto procederán a la elección del/de la Coordinador/a Nacional, y después la de los otros miembros del Consejo.
29.3 Para ser elegido miembro del Consejo Nacional se requiere:
29.3.1 Tener entre 18 y 30 años.
29.3.2 Haber culminado con la segunda Etapa de Formación y hecho la consagración mariana.
29.3.3 No desempeñar cargos de dirección en partidos políticos *(c. 317.4)*.
29.3.4 Alcanzar la mayoría absoluta en uno de los dos primeros escrutinios o mayoría relativa en el tercero.
29.4 Una vez elegido/a el/la Coordinador/a Nacional, su nombramiento debe ser confirmado por el Director General. Oportunamente se comunicará la elección del nuevo consejo Nacional al Secretariado Internacional y al Equipo Latinoamericano.
29.5 Los jóvenes miembros del Consejo Nacional son elegidos para un período de tres años, pudiendo ser reelegidos sólo para un segundo período. Durante el ejercicio de sus funciones, participan activamente en sus respectivos grupos, pero sin ningún cargo directivo.

### Artículo 30 · El Asesor Nacional
30.1 El Asesor Nacional es un sacerdote delegado por el Visitador de la Congregación de la Misión en el Ecuador para ser el animador espiritual de JMV en todo el país. Se espera que sea hombre de oración, fe sencilla y profunda, educador de la fe, padre, hermano, guía espiritual y artífice de la unidad. Debe conocer la Asociación, ser capaz de sintonizar con los miembros de JMV, mantener una actitud de apertura, acogida, amor y confianza en los jóvenes.
30.2 Es nombrado por el Visitador de la Congregación de la Misión, oído su Consejo, para un período de cuatro años, pudiendo ser renovado en el cargo según lo juzgue conveniente el Visitador; pero no por más de dos períodos. Una vez elegido, su nombramiento debe ser confirmado por el Director General.
30.3 Sus funciones son:
- Dirigir espiritualmente la Asociación.
- Velar para que se cumplan los objetivos de la Asociación.
- Acompañar al Consejo Nacional para representar a la Asociación ante el Estado Ecuatoriano y ante los organismos de la Iglesia local.
- Participar en las reuniones ordinarias del Consejo Nacional, los Encuentros y Asambleas Nacionales. Debe delegar sus funciones en los casos de ausencia.
- Informar a los Superiores Provinciales y al Subdirector General de la marcha de la Asociación.
- Autorizar los nuevos grupos y firmar las actas de creación de los mismos.

### Artículo 31 · Asesora Nacional
31.1 Es una Hermana delegada por la Visitadora de las Hijas de la Caridad para ser la animadora del proceso de crecimiento en la fe y del itinerario formativo de JMV en todo el país. Apóstol de la caridad, madre, hermana y amiga de los jóvenes, artífice de unidad, amante de la Asociación, vela y pone los medios adecuados para que JMV alcance sus fines.
31.2 Es nombrada por la Visitadora de la Hijas de la Caridad en Ecuador y su Consejo para un período de cuatro años pudiendo ser reelegida en el cargo según lo juzgue conveniente la Visitadora. Una vez elegida, su nombramiento debe ser confirmado por el Director General.
31.3 Sus funciones son:
- Velar para que se cumplan los objetivos de la Asociación.
- Colaborar con el Consejo Nacional y todos los Consejos locales, con el fin de que se cumplan sus fines.
- Animar el proceso de crecimiento en la fe, el itinerario formativo y el apostolado de JMV.
- Participar en todas las reuniones del Consejo Nacional y coordinar el trabajo del Secretariado Nacional.
- Colaborar con el/la Tesorero/a Nacional en la administración de los bienes de la Asociación.
- Fomentar la participación de las Hijas de la Caridad en el asesoramiento de los grupos.
- Informar a los Superiores Provinciales y al Subdirector General de la marcha de la Asociación.

### Artículo 32 · Delegado/a Zonal
32.1 Para el mejor funcionamiento de la Asociación en aquellas zonas del país donde la cantidad de grupos lo amerite, se nombrará un/a Delegado/a Zonal, previa aprobación del Consejo Nacional quien definirá los límites geográficos de la zona. El/la Delegado Zonal colabora como nexo entre el Consejo Nacional y los Grupos Locales que conforman la zona.
32.2 Cada zona elegirá a un/a Delegado/a, admitido/a en el nivel de Jóvenes y que haya hecho su Consagración Mariana. Su elección tendrá lugar por mayoría absoluta, durante una reunión convocada con este fin en el que participen los Consejos Locales de la zona.
32.3 Los jóvenes Delegados Zonales son elegidos para un período de tres años, pudiendo ser reelegidos sólo para un segundo período.
32.4 Sus funciones son:
- Animar y acompañar a los miembros de la Asociación especialmente a fin de que obtengan los fines propuestos.
- Delinear con el Consejo Nacional el proyecto nacional de trabajo y formación y la agenda de visitas y encuentros.
- Informar al Consejo Nacional de la marcha de la Asociación en su zona.
- Asistir a las juntas convocadas por el Consejo Nacional.

### Artículo 33 · Nivel local
El grupo es la célula fundamental donde se hace realidad la vida, espíritu y carisma de la Asociación. Esta formado de por lo menos ocho (8) niños, adolescentes o jóvenes que quieren hacer suya la propuesta de JMV, debidamente admitidos y ubicados en uno de los niveles.

### Artículo 34 · Consejo Local
34.1 En cada grupo local en donde la Asociación está constituida canónicamente debe existir un órgano de gobierno llamado Consejo Local.
34.2 Este consta de Coordinador/a, Sub-coordinador/a, Secretario/a y Tesorero/a, y vocales laicos que amerite el grupo. Además de los miembros señalados, en dichos Consejos habrá un/a Asesor/a Local.
34.3 Las funciones del Consejo Local son:
- Animar y fortalecer la vida del grupo.
- Juntamente con el grupo, planificar oportunamente las actividades, a la luz de la planificación Nacional y de grupo.
- Procurar la integración del grupo a la vida parroquial.
- Presentar al Consejo Nacional posibles candidatos para la elección de un nuevo Consejo Nacional, previa consulta a los miembros del grupo.
- Informar semestralmente a Consejo Nacional sobre la marcha del grupo.
- Juntamente con el grupo, escoger los delegados para el Encuentro Nacional u otros eventos de importancia.
34.4 Todos los miembros del Consejo Local tienen derecho a voz y a voto en el mismo.
34.5 Elección de los miembros del Consejo Local
34.5.1 Los miembros laicos del Consejo Local se designarán por votación secreta de entre todos los miembros del Grupo Local en una reunión convocada para este fin. Los candidatos a Consejo Local deben reunir los requisitos necesarios para desempeñar sus respectivos cargos con responsabilidad y dar testimonio de vida cristiana ante los demás miembros del grupo local.
34.5.2 Los jóvenes miembros del Consejo Local y de grupo son elegidos para un período de dos años, pudiendo ser reelegidos sólo para un segundo período.
34.5.3 Los Asesores Locales (Hijas de la Caridad, miembros de la Congregación de la Misión, sacerdotes, religiosos/as) serán nombrados por sus respectivos Superiores o según indique los presentes Estatutos.
34.5.4 Los Asesores Laicos serán nombrados por el Consejo Nacional.

### Artículo 35 · Funciones del/a Coordinador/a Local
- Participar activamente en todas las reuniones del Consejo Local.
- Animar la vida del grupo.
- Convocar y dirigir, de acuerdo con el/la Asesor/a las reuniones de Consejo o de grupo.
- Planificar con los miembros del Consejo/grupo las actividades del año.
- Cumplir y hacer cumplir los Estatutos de JMV.
- Mantener estrecha relación con los demás grupos JMV, grupos de la Familia Vicenciana y otros grupos apostólicos.
- Junto con el Tesorero y el/la Asesor/a, administrar el fondo económico del grupo.
- Representar a la Asociación en los encuentros laicales que le correspondan.

### Artículo 36 · Funciones del/la Secretario/a Local
36.1 Participar activamente en todas las reuniones de Consejo de grupo.
36.2 Redactar las actas de las reuniones y crónicas de las actividades.
36.3 Al iniciar las reuniones, dar lectura al acta anterior y una vez aprobada, firmarla y hacerla firmar por el/la Coordinador/a.
36.4 Elaborar informes para ser presentado a los respectivos consejos.
36.5 Organizar un pequeño archivo con los documentos más importantes del grupo.
36.6 Llevar el registro y control de los datos personales de los miembros e informar anualmente al/la Secretario/a Nacional de las admisiones, pasos de etapa y baja de miembros del grupo.

### Artículo 37 · Funciones del/la Tesorero/a Local
37.1 Participar activamente en todas las reuniones del Consejo de Grupo.
37.2 Colaborar con el/la Coordinador/a y el/la Asesor/a en la administración del fondo económico del grupo.
37.3 Llevar al día los libros de contabilidad.
37.4 Elaborar el inventario del grupo y enviarlo al/la Tesorero/a Nacional.
37.5 Presentar trimestralmente el Estado de cuentas al grupo.
37.6 Cancelar al/la Tesorero/a Nacional oportunamente la cuota anual establecida y otras colaboraciones.
37.7 Promover campañas y actividades para incrementar el fondo económico del grupo y financiar sus actividades.
37.8 Apoyar y animar las actividades de tipo económico que se organicen a nivel nacional para incrementar el patrimonio de la Asociación.

### Artículo 38 · El/la Asesor/a Local
38.1 Es un cristiano adulto llamado por Dios para ejercer el ministerio de acompañar, en nombre de la Iglesia y de la comunidad local, los procesos de educación en la fe de los jóvenes. Su principal tarea es integrar el aporte y participación de los jóvenes en la Iglesia y la sociedad y propiciar la acogida de esa acción juvenil en la comunidad. Es deseable que sea persona amiga, que ofrece generosamente su tiempo y cualidades personales para acompañar a los jóvenes en su camino de crecimiento integral, creando una atmósfera de fe, confianza, amistad y diálogo en el grupo.
38.2 Puede ser un miembro de la Congregación de la Misión, una Hija de la Caridad o un joven adulto que haya culminado su proceso de formación en JMV. En los grupos locales erigidos en parroquias, colegios o casas religiosas no pertenecientes a la Congregación de la Misión o a las Hijas de la Caridad, puede ser Asesor/a un sacerdote diocesano, un religioso/a o una persona laica vinculada a JMV y capacitada para desempeñar este servicio.
38.3 Nombramiento del/de la Asesor/a Local
38.3.1 Los miembros de la Congregación de la Misión o Hijas de la Caridad que asesoran un grupo, son designados por su respectiva comunidad local, después de haber oído al Consejo.
38.3.2 Para que un adulto joven de JMV, un sacerdote diocesano, un religioso/a o una persona laica pueda asesorar grupos de JMV debe contar antes con la aprobación del Consejo Nacional.
38.4 Es de su competencia:
38.4.1 Velar para que se logren los fines de la asociación y se lleve adelante el plan pastoral de JMV.
38.4.2 Acompañar y animar las actividades del grupo, junto con el/la Coordinador Local.
38.4.3 Velar para que los jóvenes cumplan la planificación anual de grupo a la luz de la planificación anual nacional.
38.4.4 Asegurar la formación integral de los jóvenes, principalmente en la vida cristiana y en el espíritu vicenciano.
38.4.5 Integrar el grupo en la pastoral parroquial y diocesana.
38.4.6 Ofrecer acompañamiento espiritual a los miembros del grupo.
38.4.7 Junto con el tesorero y coordinador, velar para que se administre con criterio evangélico y vicenciano los fondos del grupo.

### Artículo 39 · Dimisión y remoción de los cargos a todos los niveles
39.1 Todo miembro de un Consejo tiene derecho a presentar su dimisión. Lo hará por escrito explicando los motivos de su decisión. El Consejo correspondiente podrá solicitar que permanezca en el cargo hasta tres meses después y determinará la manera de reemplazarlo/la, al menos que los presentes Estatutos indiquen la manera de hacerlo.
39.2 El Director General, por una causa justa, puede destituir al Asesor, a la Asesora o al Coordinador Nacional, después de haber consultado a los respectivos Visitadores y al resto del Consejo Nacional.
39.3 De igual manera el Asesor Nacional, de común acuerdo con el Consejo Nacional y por una causa justa, puede destituir a cualquier otro miembro del Consejo Nacional, al/la Delegado/a Zonal, o al/la Coordinador/a de grupo después de haber consultado al resto del respectivo Consejo.
39.4 De igual manera el/la Asesor/a Local de grupo de común acuerdo con el respectivo Consejo y por una causa justa puede destituir a cualquier otro miembro del Consejo Local.
39.5 Al momento de remover a un miembro de su cargo, el Consejo decidirá, de acuerdo a la realidad, si se nombra a otra persona que termine el periodo del cargo o se mantiene vacante hasta nuevas elecciones.

### Artículo 40 · Creación de un nuevo Grupo
Para crear un nuevo grupo debe procederse de la siguiente manera:
40.1 Las personas interesadas en establecer un nuevo grupo, deben dirigirse al responsable de la pastoral del lugar, para exponerle su propósito y obtener su aprobación.
40.2 Después de un periodo mínimo de seis meses, redactan un informe de lo realizado por el grupo y lo envían al Consejo Nacional, o al/la Delegado Zonal si existe, solicitando su acompañamiento.
40.3 Al terminar su etapa de iniciación (un año) presentan su petición al Consejo Nacional, junto con el aval escrito del responsable del lugar.
40.4 Si el Consejo Nacional está de acuerdo, el Asesor Nacional:
- Firma y envía la respectiva acta de aprobación, si funciona en una casa de la Congregación de la Misión o de las Hijas de la Caridad.
- Solicita al Obispo del lugar una aprobación escrita, si el grupo no funciona en una casa de la Congregación de la Misión o de las Hijas de la Caridad. Luego de obtenerla, firma y envía el acta de aprobación del nuevo grupo.
40.5 Constituida la Asociación en un grupo, éste adquiere todos los derechos y asume todas las obligaciones a tenor de las leyes universales y de los presentes Estatutos.
40.6 Igualmente, obtiene capacidad de poseer y administrar los bienes propios, a tenor de las leyes universales y de los presentes Estatutos.

### Artículo 41 · Cierre de un Grupo
El cierre de un grupo puede producirse por una de las siguientes causas:
41.1 Inactividad total durante dos años completos.
41.1 Decisión del Consejo Nacional, previo diálogo con los interesados.

## Capítulo V · Disposiciones finales

### Artículo 42 · Autonomía
42.1 La Asociación no debe reconocer autoridad de otra índole fuera de las económicas, culturales y de la Iglesia con el exclusivo fin de servir a los Pobres, por tanto queda prohibido utilizar el nombre de la Asociación para fines ajenos a los que fue creada.
42.2 La Asociación es autónoma del lugar, pero se reconoce especialmente vinculada a las las autoridades de la Congregación de la Misión y de la Compañía de las Hijas de la Caridad *(Cfr. Canon 312, 2)*.

### Artículo 43 · Aspectos Económicos
43.1 Son bienes de la Asociación:
- Las cuotas de los miembros.
- Las donaciones, herencias, legados voluntarios y todo lo que hagan a su favor.
- Las utilidades de sus bienes o intereses que produzcan sus depósitos bancarios.
- Cualquier otro ingreso lícito de presente o futuro no previsto en el presente Estatuto.
43.2 Los bienes patrimoniales de la Asociación, así como sus ingresos se destinarán exclusivamente a obras de servicio a favor de los pobres y de las actividades de la Asociación, sin que en ningún caso puedan destinarse para otro fin.
43.3 Los bienes que a cualquier título tenga la Asociación no pertenecen, ni en todo ni en parte a ninguno de los miembros.
43.4 Los miembros no adquieren derechos de ninguna naturaleza sobre los bienes de la Asociación, ni pueden pretender lucro alguno y tampoco tienen otras atribuciones u obligaciones que las señalan en estos Estatutos.
43.5 Para el funcionamiento del Consejo Nacional y las actividades de la Asociación, cada grupo abonará la cuota fijada por la Asamblea Nacional.

### Artículo 44 · Duración y disolución de la Asociación
44.1 Juventudes Marianas Vicentinas del Ecuador, tiene una duración ilimitada por el Ministerio de Inclusión Económica y Social, y se encuentra bajo la disposición de Disolución de la Sociedad, que indica expresamente el Código Civil Ecuatoriano vigente.
44.2 Juventudes Marianas Vicentinas, JMV, podrá disolverse por:
- Desviar sus fines para los que se constituyó.
- Por disminuir sus miembros a un número menor a 15.
44.3 La Asociación sólo puede ser disuelta por decisión del Director General o de la Jerarquía correspondiente, previa consulta al Consejo Nacional y de acuerdo con las Leyes Ecuatorianas y de la Iglesia. Esta consulta puede llevarse a cabo por correo o por otros medios adecuados.
44.4 En caso de disolución y una vez saldadas las deudas, el Consejo Nacional propondrá al Director General la liquidación y distribución de los bienes que existan al momento de dicha liquidación, entre los pobres del lugar donde estuviera la Asociación.

### Artículo 45 · Disposiciones Transitorias
45.1 Estos estatutos podrán ser revisados ordinariamente cada nueve años en la Asamblea Nacional y se remitirán las enmiendas hechas al Director Genera para su aprobación.
45.2 En caso de necesidad urgente, la Asamblea Nacional presentará la posibilidad de reforma al Director General de uno o varios de los artículos de los Estatutos para su aprobación.
45.3 Cualquier enmienda a estos Estatutos debe ser aprobada al menos por dos terceras partes de los miembros con voto en la Asamblea Nacional.

Estatutos aprobados el 15 de agosto de 2010 — G. Gregory Gay, C.M., Director General',
  '/documentos/estatutos-nacionales-jmv-ecuador-2010.pdf',
  NOT EXISTS (SELECT 1 FROM "statute_versions" WHERE "isCurrent" = true),
  true
ON CONFLICT ("slug") DO NOTHING;

COMMIT;
