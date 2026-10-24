import type { CalendarCategory } from '../entities/calendar-date.entity';

export interface CalendarDateSeed {
  slug: string;
  title: string;
  subtitle?: string | null;
  month: number;
  day: number;
  year?: number | null;
  category: CalendarCategory;
  summary: string;
  story?: string | null;
  quote?: string | null;
  quoteAuthor?: string | null;
  challenge?: string | null;
  imageUrl?: string | null;
  source?: string | null;
  verified?: boolean;
  published?: boolean;
  displayOrder?: number;
}

// Fechas iniciales del Año Vicenciano. Solo se insertan en desarrollo cuando la
// tabla está vacía; en producción van en sql/2026-10-calendario-vicenciano.sql.
export const CALENDAR_DATES_SEED: CalendarDateSeed[] = [
  {
    slug: 'santa-maria-madre-de-dios',
    title: 'Santa María, Madre de Dios',
    subtitle: 'Empezamos el año de la mano de María',
    month: 1,
    day: 1,
    year: null,
    category: 'maria',
    summary:
      'El primer día del año la Iglesia celebra a María como Madre de Dios y reza por la paz en el mundo.',
    story:
      'El 1 de enero, ocho días después de Navidad, la Iglesia celebra la solemnidad de Santa María, Madre de Dios. Es la fiesta mariana más antigua: proclama que el niño que María tuvo en brazos en Belén es el Hijo de Dios hecho hombre, y que ella es de verdad su madre.\n\nEse mismo día se celebra la Jornada Mundial de la Paz, que el papa Pablo VI instituyó en 1968. Cada año el Papa envía un mensaje para que el mundo empiece el año pidiendo y construyendo la paz.\n\nPara JMV es una manera muy nuestra de abrir el año: antes de los propósitos, las metas y los planes, ponemos el año que empieza en manos de María. Ella guardaba todo lo que vivía y lo meditaba en su corazón, y nos enseña a vivir cada día atentos a lo que Dios va haciendo.\n\nEmpezar el año con María es pedirle que nos acompañe en lo que viene: los estudios, el trabajo, la familia, el grupo y el servicio a los más pobres.',
    quote: 'María conservaba todas estas cosas, meditándolas en su corazón.',
    quoteAuthor: 'Evangelio según san Lucas 2, 19',
    challenge:
      'Antes de que termine el día, escribe tres intenciones para este año y confíaselas a María con un avemaría. Y pide por la paz en un lugar del mundo que la necesite.',
    imageUrl: null,
    source:
      'https://www.vatican.va/content/paul-vi/es/messages/peace/documents/hf_p-vi_mes_19671208_i-world-day-for-peace.html',
    verified: true,
    published: true,
    displayOrder: 0,
  },
  {
    slug: 'beata-rosalia-rendu',
    title: 'Beata Rosalía Rendu',
    subtitle: 'Hija de la Caridad en los barrios pobres de París',
    month: 2,
    day: 7,
    year: 1856,
    category: 'santos',
    summary:
      'Durante más de cincuenta años sirvió en el barrio más pobre de París. Ricos y pobres, estudiantes y obreros, la buscaban como a una amiga.',
    story:
      'Rosalía Rendu llegó muy joven al barrio Mouffetard, uno de los más pobres de París. Allí se quedó más de cincuenta años como Hija de la Caridad. Su casa se volvió un punto de encuentro: abría escuelas, visitaba enfermos, conseguía trabajo, ropa y comida, y sabía el nombre de cada familia.\n\nVivió tiempos durísimos: epidemias de cólera, revoluciones y barricadas en las calles. Cuando todos huían, ella se quedaba. Cuentan que en 1848 llegó a ponerse entre los soldados y un herido para protegerlo, sin importarle de qué bando era.\n\nTambién fue maestra de los jóvenes. Un grupo de universitarios, entre ellos Federico Ozanam, acudió a ella para aprender a servir. Sor Rosalía les dio direcciones de familias pobres y les enseñó a visitarlas con respeto. De ahí nacieron las primeras Conferencias de San Vicente de Paúl.\n\nMurió el 7 de febrero de 1856 y miles de personas acompañaron su entierro. San Juan Pablo II la beatificó el 9 de noviembre de 2003. Su secreto era sencillo: ver el rostro de Cristo en cada persona.',
    quote: null,
    quoteAuthor: null,
    challenge:
      'Aprende el nombre de alguien a quien ves seguido y casi nunca saludas: el guardia, la señora de la tienda, el compañero callado. Salúdalo hoy por su nombre.',
    imageUrl: null,
    source:
      'https://famvin.org/en/2021/02/07/february-7-feast-day-of-blessed-sister-rosalie-rendu; https://famvin.org/calendar-feast-days/',
    verified: true,
    published: true,
    displayOrder: 0,
  },
  {
    slug: 'renovacion-de-votos-hijas-de-la-caridad',
    title: 'Renovación de votos de las Hijas de la Caridad',
    subtitle: 'Un sí que se dice de nuevo cada año',
    month: 3,
    day: 25,
    year: 1642,
    category: 'familia',
    summary:
      'En la fiesta de la Anunciación, las Hijas de la Caridad de todo el mundo renuevan sus votos, como lo hicieron Santa Luisa y sus primeras hermanas en 1642.',
    story:
      'El 25 de marzo la Iglesia celebra la Anunciación: el día en que María le dijo a Dios «hágase». Ese mismo día, en 1642, Santa Luisa de Marillac y cuatro hermanas hicieron por primera vez sus votos como Hijas de la Caridad.\n\nDesde entonces, cada 25 de marzo, miles de Hijas de la Caridad en más de noventa países renuevan sus votos de castidad, pobreza, obediencia y servicio a los pobres. Lo curioso es que sus votos duran un año. No es que no se comprometan para siempre: cada año eligen libremente volver a decir que sí, en silencio, durante la misa. Cuando la fiesta cae en Semana Santa, la renovación se mueve junto con la Anunciación.\n\nEn JMV conocemos de cerca a las hermanas: muchas nos acompañan como asesoras. Este día es buena ocasión para agradecerles. Y también para preguntarnos qué «sí» renovamos nosotros: con nuestra familia, con nuestro grupo, con Dios. Las grandes decisiones no se viven una sola vez; se eligen de nuevo cada día.',
    quote: null,
    quoteAuthor: null,
    challenge:
      'Escríbele hoy un mensaje de gratitud a una Hija de la Caridad que conozcas, o reza un avemaría por las hermanas que renuevan sus votos.',
    imageUrl: null,
    source:
      'https://famvin.org/en/2024/04/07/renewal-vows-daughters-of-charity-explained/; https://filles-de-la-charite.org/en/?p=49153',
    verified: true,
    published: true,
    displayOrder: 0,
  },
  {
    slug: 'fundacion-congregacion-de-la-mision',
    title: 'Fundación de la Congregación de la Misión',
    subtitle: 'Nacen los misioneros paúles',
    month: 4,
    day: 17,
    year: 1625,
    category: 'familia',
    summary:
      'Se firmó en París el contrato de fundación de la Congregación de la Misión, los misioneros de San Vicente que hoy conocemos como padres paúles.',
    story:
      'Después de Folleville, San Vicente no podía olvidar a la gente del campo: familias enteras que casi nunca escuchaban hablar de Dios y que vivían en la pobreza. Los esposos Felipe Manuel de Gondi y Margarita de Silly, que lo conocían bien, decidieron apoyar un proyecto: un grupo de sacerdotes que se dedicara a misionar por los pueblos.\n\nEl 17 de abril de 1625, en la casa de los Gondi en París, se firmó ante notarios el contrato de fundación de la Congregación de la Misión. Los Gondi aportaron el dinero y Vicente se comprometió a reunir a los misioneros. Al año siguiente lo aprobó el arzobispo de París, y en 1633 el papa Urbano VIII la reconoció para toda la Iglesia.\n\nHoy los misioneros paúles están en los cinco continentes, también en Ecuador. Acompañan a la Familia Vicenciana y a nosotros en JMV: el Superior General de la Congregación es también el Director General de nuestra asociación. Todo empezó con un sueño muy concreto: que nadie se quede sin conocer el amor de Dios.',
    quote: null,
    quoteAuthor: null,
    challenge:
      'Reza hoy por los padres paúles que conoces y, si puedes, agradécele en persona a uno por su servicio.',
    imageUrl: null,
    source:
      'https://www.vaticannews.va/fr/eglise/news/2025-04/fondation-congregation-mission-saint-vincent-de-paul.html',
    verified: true,
    published: true,
    displayOrder: 0,
  },
  {
    slug: 'fundacion-sociedad-de-san-vicente-de-paul',
    title: 'Fundación de la Sociedad de San Vicente de Paúl',
    subtitle: 'Universitarios que se atrevieron a servir',
    month: 4,
    day: 23,
    year: 1833,
    category: 'familia',
    summary:
      'Un grupo de estudiantes universitarios, con Federico Ozanam, se reunió en París para servir a los pobres. Así nació la primera Conferencia de Caridad.',
    story:
      'París, 1833. Federico Ozanam tenía 20 años y estudiaba en la universidad. En los debates, algunos compañeros lo desafiaban: «Ustedes los cristianos hablan mucho, pero ¿qué hacen por los pobres?». La pregunta le dolió, pero también lo movió.\n\nEl 23 de abril de 1833, Federico y otros jóvenes estudiantes se reunieron con Emmanuel Bailly, un profesor que los acompañaba. Decidieron dejar de solo opinar y empezar a visitar a familias pobres en sus casas. Buscaron consejo en la Hija de la Caridad Rosalía Rendu, que conocía el barrio como nadie. Así nació la primera Conferencia de Caridad, que más tarde se puso bajo el patrocinio de San Vicente de Paúl.\n\nAquel grupito de amigos hoy es la Sociedad de San Vicente de Paúl, presente en todo el mundo, también en Ecuador. Su historia nos recuerda algo muy nuestro: la fe joven no se queda en palabras. Cuando unos amigos se juntan para servir, pueden cambiar mucho más de lo que imaginan.',
    quote: null,
    quoteAuthor: null,
    challenge:
      'Junta a dos o tres amigos de tu grupo y organicen una visita concreta: a un abuelito solo, a un enfermo o a una familia que la esté pasando mal.',
    imageUrl: null,
    source:
      'https://famvin.org/calendar-feast-days/ (International Confederation of the Society of St. Vincent de Paul, 23 de abril de 1833)',
    verified: true,
    published: true,
    displayOrder: 0,
  },
  {
    slug: 'santa-luisa-de-marillac',
    title: 'Santa Luisa de Marillac',
    subtitle: 'Cofundadora de las Hijas de la Caridad',
    month: 5,
    day: 9,
    year: null,
    category: 'fundadores',
    summary:
      'Esposa, madre, viuda y santa. Junto a San Vicente fundó las Hijas de la Caridad y organizó el servicio a los pobres con inteligencia y ternura.',
    story:
      'Luisa de Marillac no tuvo una vida fácil. Creció sin conocer a su madre, quiso ser religiosa y no la aceptaron, se casó, tuvo un hijo y quedó viuda joven. Vivía con muchas dudas y angustias. Todo cambió cuando San Vicente de Paúl se convirtió en su guía espiritual y le mostró que Dios la necesitaba entre los pobres.\n\nLuisa empezó visitando las Caridades, los grupos de señoras que atendían a los enfermos en las parroquias. Tenía un talento enorme para organizar, formar y animar a la gente. En 1633 recibió en su casa a las primeras jóvenes campesinas que querían servir a los pobres: así nacieron las Hijas de la Caridad. Atendieron hospitales, niños abandonados, presos y ancianos.\n\nMurió en París el 15 de marzo de 1660, pocos meses antes que San Vicente. Fue canonizada en 1934 y es patrona de quienes trabajan en obras sociales. Su fiesta se celebraba el 15 de marzo, pero en 2016 la Familia Vicenciana la pasó al 9 de mayo, para poder celebrarla fuera de Cuaresma.',
    quote: null,
    quoteAuthor: null,
    challenge:
      'Piensa en una persona que esté pasando por dudas o tristeza, como Luisa en su juventud, y acompáñala hoy con un mensaje, una llamada o un rato de tu tiempo.',
    imageUrl: null,
    source:
      'https://famvin.org/en/2017/03/14/calendarium-proprio/; https://archive.famvin.org/2016/02/03/change-of-date-of-feast-of-st-louise-may-9/',
    verified: true,
    published: true,
    displayOrder: 0,
  },
  {
    slug: 'san-pier-giorgio-frassati',
    title: 'San Pier Giorgio Frassati',
    subtitle: 'Joven vicentino, montañista y amigo de los pobres',
    month: 7,
    day: 4,
    year: 1925,
    category: 'santos',
    summary:
      'Estudiante, deportista y miembro de la Sociedad de San Vicente de Paúl. Murió a los 24 años y fue canonizado en 2025.',
    story:
      "Pier Giorgio Frassati nació en Turín, Italia, en 1901, en una familia rica e influyente. Podía haberse quedado en su comodidad, pero eligió otra cosa. A los 17 años entró en la Sociedad de San Vicente de Paúl y empezó a visitar a familias pobres de los barrios de su ciudad. Muchas veces regalaba su pasaje de tranvía o su abrigo y volvía caminando a casa.\n\nEra un joven como cualquiera: estudiaba ingeniería, tenía un grupo de amigos con quienes hacía bromas y amaba la montaña. En su última foto escalando escribió su lema: «Verso l'alto», hacia lo alto.\n\nEn junio de 1925 contrajo una poliomielitis fulminante, probablemente contagiada en sus visitas a los enfermos. Murió el 4 de julio, con 24 años. A su funeral llegaron cientos de pobres que su familia no conocía: eran las personas a las que él servía en secreto.\n\nEl papa León XIV lo canonizó el 7 de septiembre de 2025. Es un santo de nuestra Familia Vicenciana y un modelo muy cercano para los jóvenes.",
    quote: "Verso l'alto (hacia lo alto).",
    quoteAuthor: 'San Pier Giorgio Frassati',
    challenge:
      'Sal hoy a caminar, subir un cerro o simplemente mirar el cielo, y ofrécele a Dios ese rato. Después, haz un favor en secreto a alguien.',
    imageUrl: null,
    source:
      'https://famvin.org/calendar-feast-days/; https://filles-de-la-charite.org/en/?p=1301; https://en.wikipedia.org/wiki/Verso_l%27alto',
    verified: true,
    published: true,
    displayOrder: 0,
  },
  {
    slug: 'san-francisco-regis-clet',
    title: 'San Francisco Regis Clet',
    subtitle: 'Misionero paúl y mártir en China',
    month: 7,
    day: 9,
    year: null,
    category: 'santos',
    summary:
      'Llegó a China con más de 40 años y sirvió allí casi tres décadas. Murió mártir en 1820. Se le recuerda junto a los mártires de China.',
    story:
      'Francisco Regis Clet nació en Grenoble, Francia, en 1748. Era un sacerdote paúl muy preparado, profesor y formador de futuros misioneros. Cuando muchos piensan en asentarse, él pidió ir a la misión. En 1791, con más de 40 años, se embarcó hacia China.\n\nLlegó a una tierra donde ser cristiano era peligroso. Durante casi treinta años recorrió a pie enormes distancias en las provincias de Jiangxi y Hubei, visitando comunidades escondidas, a menudo solo y en medio de persecuciones. Aprendió el idioma y las costumbres para estar cerca de la gente.\n\nEn 1819 fue traicionado y encarcelado en Wuchang, lo que hoy es Wuhan. Allí sufrió interrogatorios y torturas. El 18 de febrero de 1820, con más de 70 años, fue ejecutado por estrangulamiento.\n\nFue canonizado el 1 de octubre de 2000 junto con otros mártires de China. Antes su memoria se celebraba el 18 de febrero, pero desde 2017 la Familia Vicenciana la celebra el 9 de julio, junto a San Agustín Zhao Rong y compañeros mártires.',
    quote: null,
    quoteAuthor: null,
    challenge:
      'Reza hoy por los cristianos que viven su fe en lugares donde está perseguida, y busca una noticia sobre ellos para conocer su realidad.',
    imageUrl: null,
    source:
      'https://famvin.org/en/2017/03/14/calendarium-proprio/; https://famvin.org/en/2025/07/07/on-july-9-we-celebrate-the-feast-of-saint-francis-regis-clet-c-m/',
    verified: true,
    published: true,
    displayOrder: 0,
  },
  {
    slug: 'primera-aparicion-de-la-virgen-a-santa-catalina',
    title: 'Primera aparición de la Virgen a Santa Catalina',
    subtitle: 'Una noche en la capilla de la rue du Bac',
    month: 7,
    day: 18,
    year: 1830,
    category: 'maria',
    summary:
      'En la noche del 18 de julio de 1830, la Virgen se apareció a la joven novicia Catalina Labouré en la capilla de la rue du Bac, en París.',
    story:
      'Catalina Labouré tenía 24 años y era novicia de las Hijas de la Caridad. En la noche del 18 de julio de 1830, cerca de las once y media, un niño vestido de blanco la despertó y la llevó a la capilla de la casa, en la rue du Bac de París.\n\nAllí, al poco rato, apareció la Virgen María y se sentó junto al altar. Catalina se arrodilló y apoyó las manos en sus rodillas. Hablaron durante largo tiempo, como una hija con su madre. María le anunció tiempos difíciles para Francia, le pidió confianza y le dijo que Dios quería confiarle una misión.\n\nEn la tradición de nuestra asociación, esa noche se recuerda también como el origen de JMV: según nuestra historia, la Virgen expresó el deseo de que se formara una asociación de jóvenes que la tuvieran como madre y modelo. Por eso la Familia Vicenciana celebra el 18 de julio de 1830 como el nacimiento de la Juventud Mariana Vicenciana.\n\nCatalina guardó el secreto casi toda su vida. Lo que vivió esa noche nos recuerda que María se acerca a los jóvenes y los toma en serio.',
    quote: null,
    quoteAuthor: null,
    challenge:
      'Esta noche, antes de dormir, dedica cinco minutos a hablar con María como con una madre: cuéntale cómo estás de verdad.',
    imageUrl: '/images/historia/catalina.jpg',
    source:
      'https://www.chapellenotredamedelamedaillemiraculeuse.com/es/las-apariciones/; https://famvin.org/calendar-feast-days/ (Vincentian Marian Youth, 18 de julio de 1830)',
    verified: true,
    published: true,
    displayOrder: 0,
  },
  {
    slug: 'fundacion-de-jmv-ecuador',
    title: 'Fundación de JMV Ecuador',
    subtitle: 'Nace el primer grupo en Quito',
    month: 7,
    day: 18,
    year: 1995,
    category: 'ecuador',
    summary:
      'El mismo día de la primera aparición de la Virgen a Santa Catalina, JMV se fundó en Ecuador. El primer grupo fue la «Medalla Milagrosa» de Quito.',
    story:
      'Todo empezó con un viaje. En un encuentro en México, Sor Noemí Miño, Hija de la Caridad, recibió la motivación y la información necesarias para traer JMV a Ecuador. Volvió con la idea clara: los jóvenes del país también necesitaban un espacio para crecer en la fe con María y servir a los pobres al estilo de San Vicente.\n\nEl 18 de julio de 1995, el mismo día en que se recuerda la primera aparición de la Virgen a Santa Catalina, JMV se fundó en Ecuador. El primer grupo del país fue el de la «Medalla Milagrosa» de Quito. Desde ahí se formó un equipo de jóvenes que empezó a visitar y acompañar a otros grupos en distintas ciudades.\n\nTres décadas después, JMV es un segundo hogar para miles de jóvenes ecuatorianos. Cada grupo, cada encuentro y cada misión de hoy tienen su raíz en aquella semilla sembrada en Quito.\n\nEste día es para celebrar en grande: agradecer a quienes empezaron, recordar a quienes ya no están y renovar las ganas de seguir sembrando.',
    quote: null,
    quoteAuthor: null,
    challenge:
      'Comparte hoy en tus redes una foto o un recuerdo de tu grupo de JMV y cuenta en una frase qué significa para ti.',
    imageUrl: '/images/historia/jmv_ecuador_fundacion.jpg',
    source: 'Historia de JMV Ecuador (jmvecuador.org)',
    verified: true,
    published: true,
    displayOrder: 0,
  },
  {
    slug: 'san-justino-de-jacobis',
    title: 'San Justino de Jacobis',
    subtitle: 'Misionero paúl en Etiopía',
    month: 7,
    day: 30,
    year: null,
    category: 'santos',
    summary:
      'Misionero italiano que vivió veinte años en Etiopía y Eritrea, aprendiendo su lengua y sus costumbres para anunciar el Evangelio con respeto.',
    story:
      'Justino de Jacobis nació en 1800 en San Fele, al sur de Italia. Entró en la Congregación de la Misión y, en 1839, fue enviado a Etiopía. Era una tierra cristiana desde hacía siglos, con una tradición propia muy rica.\n\nJustino no llegó a imponer nada. Aprendió el idioma, se vistió como la gente del lugar, comía lo mismo que ellos y respetó sus ritos. Formó sacerdotes locales y quería que la Iglesia tuviera rostro etíope. Por eso muchos lo recuerdan como un pionero en anunciar el Evangelio desde dentro de cada cultura.\n\nNo le fue fácil: sufrió cárceles, destierros y persecuciones. Aun así siguió caminando por los pueblos, siempre cerca de los pobres. Murió el 31 de julio de 1860, enfermo y en camino, en el valle de Alighedé, en la actual Eritrea.\n\nEl papa Pablo VI lo canonizó el 26 de octubre de 1975. La Familia Vicenciana celebra su memoria el 30 de julio. Su vida nos enseña que para servir de verdad hay que escuchar y respetar al otro tal como es.',
    quote: null,
    quoteAuthor: null,
    challenge:
      'Acércate hoy a alguien de otra cultura, ciudad o forma de pensar y pregúntale por su historia, solo para escuchar y aprender.',
    imageUrl: null,
    source:
      'https://famvin.org/en/2017/03/14/calendarium-proprio/; https://famvin.org/calendar-feast-days/; https://wiki.famvin.org/en/Justin_de_Jacobis',
    verified: true,
    published: true,
    displayOrder: 0,
  },
  {
    slug: 'fundacion-de-las-caridades-aic',
    title: 'Fundación de las Caridades (AIC)',
    subtitle: 'La primera obra de San Vicente',
    month: 8,
    day: 23,
    year: 1617,
    category: 'familia',
    summary:
      'En Châtillon-les-Dombes, San Vicente reunió a un grupo de mujeres para atender a los enfermos pobres. Fue la primera Cofradía de la Caridad, hoy AIC.',
    story:
      'En el verano de 1617, Vicente de Paúl era párroco en Châtillon-les-Dombes, un pueblo de Francia. Un domingo, justo antes de la misa, le contaron que una familia entera estaba enferma en una casa alejada y no tenía quién la atendiera. Vicente habló de ello en su sermón.\n\nLa respuesta fue enorme: esa misma tarde mucha gente fue a llevarles comida y ayuda. Vicente se alegró, pero pensó: hoy les sobra todo y mañana quizá no tengan nada. La generosidad necesitaba organización. Por eso reunió a un grupo de mujeres del pueblo, que se turnarían para visitar a los enfermos pobres cada día, con orden y constancia.\n\nAsí nació la primera Cofradía de la Caridad, la primera obra fundada por San Vicente. Esas Caridades se extendieron por muchas parroquias y hoy forman la Asociación Internacional de Caridades (AIC), presente en todo el mundo.\n\nLa lección sigue vigente: ayudar una vez es bueno; organizarse para ayudar siempre es todavía mejor.',
    quote: null,
    quoteAuthor: null,
    challenge:
      'Propón en tu grupo una ayuda constante, no de un solo día: un turno mensual de visita, una colecta fija o un apoyo escolar.',
    imageUrl: null,
    source:
      'https://famvin.org/en/2024/08/23/st-vincents-first-foundation-the-ladies-of-charity; https://famvin.org/calendar-feast-days/ (indica 20 de agosto de 1617)',
    verified: false,
    published: true,
    displayOrder: 0,
  },
  {
    slug: 'beato-federico-ozanam',
    title: 'Beato Federico Ozanam',
    subtitle: 'Fundador de la Sociedad de San Vicente de Paúl',
    month: 9,
    day: 9,
    year: null,
    category: 'santos',
    summary:
      'Universitario, profesor, esposo y padre. A los 20 años fundó con sus amigos la primera Conferencia de Caridad, origen de la Sociedad de San Vicente de Paúl.',
    story:
      'Federico Ozanam nació en 1813 en Milán y creció en Lyon, Francia. De adolescente pasó por una crisis de fe muy fuerte. La superó, y prometió dedicar su vida a defender la verdad del Evangelio.\n\nEn París estudió Derecho y Letras. En la universidad muchos se burlaban de la fe. Federico no solo discutía: en 1833, con 20 años, reunió a unos amigos y fundó la primera Conferencia de Caridad para visitar a los pobres en sus casas. La Hija de la Caridad Rosalía Rendu los guió en sus primeros pasos. Esa pequeña conferencia es hoy la Sociedad de San Vicente de Paúl.\n\nFederico fue un brillante profesor de la Sorbona, se casó con Amélie Soulacroix y tuvo una hija, María. Vivió la santidad en lo cotidiano: en el estudio, en la familia y en el servicio. Murió en Marsella el 8 de septiembre de 1853, con solo 40 años.\n\nSan Juan Pablo II lo beatificó en París el 22 de agosto de 1997, durante la Jornada Mundial de la Juventud. Su sueño era envolver al mundo en una red de caridad.',
    quote: null,
    quoteAuthor: null,
    challenge:
      'Si alguien critica la fe delante de ti, no respondas con pelea: responde con un gesto concreto de caridad. Hoy elige uno y hazlo.',
    imageUrl: null,
    source:
      'https://famvin.org/calendar-feast-days/; https://famvin.org/en/2019/08/22/vincentian-family-in-celebration-22-years-of-the-beatification-of-frederic-ozanam/',
    verified: true,
    published: true,
    displayOrder: 0,
  },
  {
    slug: 'san-juan-gabriel-perboyre',
    title: 'San Juan Gabriel Perboyre',
    subtitle: 'Misionero paúl y primer santo de China',
    month: 9,
    day: 11,
    year: 1840,
    category: 'santos',
    summary:
      'Misionero francés en China, murió en una cruz en Wuchang en 1840. Fue el primer santo de China canonizado por la Iglesia.',
    story:
      'Juan Gabriel Perboyre nació en 1802 en el sur de Francia, en una familia de campesinos muy creyentes. Entró en la Congregación de la Misión y fue formador de seminaristas. Pero en su corazón ardía un deseo: ir a China, donde su hermano Luis, también misionero, había muerto antes de llegar.\n\nEn 1835 llegó por fin a China y sirvió en las provincias de Henan y Hubei. Aprendió el idioma, se dejó crecer la trenza como los hombres del lugar y caminaba de aldea en aldea visitando comunidades cristianas escondidas.\n\nEn 1839, durante una persecución, fue traicionado por un catecúmeno a cambio de dinero. Pasó un año en prisión, sufriendo torturas y humillaciones, sin renegar de su fe. El 11 de septiembre de 1840 murió estrangulado en una cruz en Wuchang, la actual Wuhan.\n\nSan Juan Pablo II lo canonizó el 2 de junio de 1996, y fue el primer santo de China canonizado. Su vida se parece mucho a la de Jesús: traicionado, juzgado y crucificado, pero fiel hasta el final.',
    quote: null,
    quoteAuthor: null,
    challenge:
      'Mira un crucifijo durante unos minutos y agradece a Jesús por algo concreto de tu vida. Luego perdona a alguien que te haya fallado.',
    imageUrl: null,
    source: 'https://famvin.org/calendar-feast-days/',
    verified: true,
    published: true,
    displayOrder: 0,
  },
  {
    slug: 'san-vicente-de-paul',
    title: 'San Vicente de Paúl',
    subtitle: 'Padre de los pobres y patrono de la caridad',
    month: 9,
    day: 27,
    year: 1660,
    category: 'fundadores',
    summary:
      'De familia campesina, se convirtió en el gran apóstol de la caridad. Fundó la Misión y las Hijas de la Caridad y es nuestro patrono.',
    story:
      'Vicente de Paúl nació en 1581 en Pouy, un pueblo del sur de Francia, en una familia campesina. Cuidaba ovejas de niño y estudió para ser sacerdote con la idea de tener una vida cómoda y ayudar a su familia. Dios tenía otros planes.\n\nPoco a poco, el encuentro con los pobres le cambió el corazón. En 1617, en Folleville y en Châtillon, descubrió su vocación: anunciar el Evangelio a los pobres y organizar la caridad. Fundó las Caridades, la Congregación de la Misión y, con Santa Luisa de Marillac, las Hijas de la Caridad. Atendió a niños abandonados, presos, enfermos, refugiados de guerra y ancianos. Movió a ricos y poderosos a compartir lo que tenían.\n\nMurió en París el 27 de septiembre de 1660. Fue canonizado en 1737 y el papa León XIII lo nombró patrono de todas las obras de caridad.\n\nPara nosotros en JMV es padre y modelo. Nos enseñó que los pobres son nuestros señores y nuestros amos, y que el amor verdadero siempre encuentra maneras nuevas de servir.',
    quote: 'El amor es inventivo hasta el infinito.',
    quoteAuthor: 'San Vicente de Paúl',
    challenge:
      'Inventa hoy una forma nueva de ayudar a alguien que lo necesita: algo creativo que nunca hayas hecho antes.',
    imageUrl: null,
    source:
      'https://famvin.org/calendar-feast-days/; https://www.vatican.va/content/francesco/es/messages/pont-messages/2017/documents/papa-francesco_20170927_messaggio-famiglia-vincenziana.html',
    verified: true,
    published: true,
    displayOrder: 0,
  },
  {
    slug: 'nuestra-senora-de-la-medalla-milagrosa',
    title: 'Nuestra Señora de la Medalla Milagrosa',
    subtitle: 'María pide acuñar una medalla',
    month: 11,
    day: 27,
    year: 1830,
    category: 'maria',
    summary:
      'La Virgen se apareció a Santa Catalina Labouré y le mostró la medalla que hoy llevamos en JMV. Es nuestra fiesta grande.',
    story:
      'El 27 de noviembre de 1830, cerca de las cinco y media de la tarde, Catalina Labouré estaba en oración con las demás novicias en la capilla de la rue du Bac. De pronto vio a la Virgen de pie sobre un globo, con rayos de luz que salían de sus manos.\n\nAlrededor se formó un óvalo con estas palabras: «Oh María sin pecado concebida, ruega por nosotros que recurrimos a ti». Luego la imagen giró y Catalina vio el reverso: la letra M con una cruz encima, dos corazones debajo, uno coronado de espinas y otro atravesado por una espada, y doce estrellas alrededor. Entonces escuchó la petición de hacer acuñar una medalla según ese modelo.\n\nEn 1832 se hicieron las primeras medallas. Se difundieron tan rápido, y tantas personas contaron gracias recibidas, que la gente empezó a llamarla «la Medalla Milagrosa».\n\nPara JMV es mucho más que un objeto: es nuestra insignia y un resumen del Evangelio. Las doce estrellas del reverso inspiran el diseño de este Año Vicenciano.',
    quote: 'Haz, haz acuñar una medalla según este modelo.',
    quoteAuthor:
      'Palabras escuchadas por Santa Catalina Labouré (27 de noviembre de 1830)',
    challenge:
      'Regala hoy una Medalla Milagrosa a alguien que la necesite y explícale qué significa cada símbolo.',
    imageUrl: '/images/historia/catalina.jpg',
    source:
      'https://www.chapellenotredamedelamedaillemiraculeuse.com/es/las-apariciones/; https://famvin.org/calendar-feast-days/',
    verified: true,
    published: true,
    displayOrder: 0,
  },
  {
    slug: 'santa-catalina-laboure',
    title: 'Santa Catalina Labouré',
    subtitle: 'La vidente de la Medalla Milagrosa',
    month: 11,
    day: 28,
    year: null,
    category: 'fundadores',
    summary:
      'La joven campesina que vio a la Virgen guardó el secreto durante décadas y pasó su vida sirviendo a los ancianos con sencillez.',
    story:
      'Catalina Labouré nació en 1806 en Fain-lès-Moutiers, un pueblo de Borgoña, Francia. Su mamá murió cuando ella tenía nueve años. Cuentan que entonces abrazó una imagen de la Virgen y le pidió que fuera su madre. Desde muy joven se hizo cargo de la casa y de la granja familiar.\n\nSoñaba con ser Hija de la Caridad, pero su papá no quería. Ella insistió con paciencia y en 1830 entró al seminario de la rue du Bac, en París. Ese mismo año vivió las apariciones de la Virgen que dieron origen a la Medalla Milagrosa.\n\nLo sorprendente es lo que vino después: Catalina no buscó fama. Durante 46 años sirvió en un asilo de ancianos en las afueras de París, cuidando gallinas, abriendo la puerta y atendiendo a los abuelitos. Casi nadie sabía que ella era la vidente. Solo lo reveló poco antes de morir, el 31 de diciembre de 1876.\n\nFue canonizada en 1947. Su cuerpo se conserva en la capilla de la rue du Bac. Nos enseña que la santidad grande se esconde en lo pequeño de cada día.',
    quote: null,
    quoteAuthor: null,
    challenge:
      'Haz hoy un servicio sencillo y escondido en tu casa, sin contárselo a nadie: lava los platos, ordena algo o acompaña a un abuelito.',
    imageUrl: '/images/historia/catalina.jpg',
    source: 'https://famvin.org/calendar-feast-days/',
    verified: true,
    published: true,
    displayOrder: 0,
  },
  {
    slug: 'fundacion-de-las-hijas-de-la-caridad',
    title: 'Fundación de las Hijas de la Caridad',
    subtitle: 'Jóvenes campesinas al servicio de los pobres',
    month: 11,
    day: 29,
    year: 1633,
    category: 'familia',
    summary:
      'Santa Luisa de Marillac recibió en su casa a las primeras jóvenes que querían dedicar su vida a los pobres. Así nacieron las Hijas de la Caridad.',
    story:
      'Las Caridades de San Vicente funcionaban bien, pero había tareas que a las señoras ricas de París les costaba hacer: limpiar a los enfermos, cargar ollas de sopa, pasar noches en casas humildes. Entonces aparecieron jóvenes del campo dispuestas a servir con sus manos. La primera fue Margarita Naseau, que murió contagiada por cuidar a una enferma.\n\nSan Vicente y Santa Luisa entendieron que esas jóvenes necesitaban formación y una vida en común. El 29 de noviembre de 1633, Luisa recibió en su casa de París a las primeras para vivir juntas, rezar y prepararse. Así nació la Compañía de las Hijas de la Caridad.\n\nFueron algo nuevo en la Iglesia: no vivían encerradas en un convento, sino en medio de la gente. San Vicente decía que su claustro serían las calles de la ciudad. Hoy son miles en todo el mundo y en Ecuador nos acompañan como asesoras de JMV.\n\nEn esta fecha celebramos a esas jóvenes valientes que dijeron sí a Dios en los pobres.',
    quote: null,
    quoteAuthor: null,
    challenge:
      'Pregúntale a una Hija de la Caridad cómo descubrió su vocación. Escucha su historia y comparte con tu grupo lo que más te impactó.',
    imageUrl: null,
    source:
      'https://famvin.org/calendar-feast-days/ (Company of the Daughters of Charity, 29 de noviembre de 1633)',
    verified: true,
    published: true,
    displayOrder: 0,
  },
  {
    slug: 'inmaculada-concepcion',
    title: 'Inmaculada Concepción',
    subtitle: 'María, sin pecado concebida',
    month: 12,
    day: 8,
    year: 1854,
    category: 'maria',
    summary:
      'Celebramos que María fue preservada de todo pecado desde el primer instante. Nuestra asociación nació bajo este título.',
    story:
      'El 8 de diciembre la Iglesia celebra que María, desde el primer momento de su existencia, fue preservada de todo pecado. Dios la preparó así para ser la madre de Jesús. El papa Pío IX proclamó este dogma el 8 de diciembre de 1854.\n\nPara nuestra familia esta fiesta es muy especial. Veinticuatro años antes, en 1830, la Virgen había pedido a Santa Catalina una medalla con las palabras «Oh María sin pecado concebida, ruega por nosotros que recurrimos a ti». Y en 1847, el mismo Pío IX había aprobado nuestra asociación bajo el título de la Inmaculada Concepción: por eso sus primeros miembros se llamaron Hijas e Hijos de María Inmaculada.\n\nEn la Familia Vicenciana se viven como un camino los días que van del 27 de noviembre, fiesta de la Medalla Milagrosa, al 8 de diciembre. Muchos grupos de JMV aprovechan estas fechas para hacer o renovar su consagración a María.\n\nMaría Inmaculada no es un ideal lejano. Es la joven que confió por completo en Dios y nos enseña a decir sí con libertad.',
    quote:
      'Oh María sin pecado concebida, ruega por nosotros que recurrimos a ti.',
    quoteAuthor: 'Inscripción de la Medalla Milagrosa',
    challenge:
      'Reza hoy despacio la jaculatoria de la Medalla tres veces: por ti, por tu familia y por tu grupo de JMV.',
    imageUrl: null,
    source:
      'https://famvin.org/enarchive/?p=19747; https://vinformation.org/en/june-20-anniversary-of-pontifical-approbation-of-the-children-of-mary-association/',
    verified: true,
    published: true,
    displayOrder: 0,
  },
];
