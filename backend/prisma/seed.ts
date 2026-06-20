import { PrismaClient, Role, ExamType, Difficulty, SessionType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { SUPER_ADMIN_ALLOWED_EMAIL } from '../src/common/constants/auth.constants';

const prisma = new PrismaClient();
const IS_PROD = process.env.NODE_ENV === 'production';

// ─────────────────────────────────────────────
//  Contextos compartidos
// ─────────────────────────────────────────────
const CONTEXTO_IA = `En los últimos años, la inteligencia artificial (IA) ha transformado radicalmente la manera en que las personas interactúan con la tecnología. Desde los asistentes de voz hasta los sistemas de recomendación de contenidos, la IA se ha integrado en casi todos los aspectos de la vida cotidiana. Sin embargo, esta revolución tecnológica no está exenta de controversias. Algunos expertos señalan que el avance descontrolado de la IA podría generar desempleo masivo, ya que muchas tareas realizadas actualmente por humanos pueden ser automatizadas. Otros, en cambio, argumentan que la IA creará nuevos empleos y elevará la productividad, de la misma manera que lo hicieron la electricidad o el internet en su momento. Lo cierto es que el debate sobre el impacto de la IA en el trabajo refleja una tensión más profunda: la relación entre el progreso tecnológico y el bienestar humano.`;

const CONTEXTO_ENGLISH = `Colombia is one of the most biodiverse countries in the world. It has the largest number of bird species, and is home to thousands of plant and animal species found nowhere else on Earth. The Amazon rainforest, the Andes mountains, and the Pacific and Caribbean coasts create a variety of ecosystems that support this incredible diversity. However, deforestation and climate change pose serious threats to Colombia's natural heritage.`;

// ─────────────────────────────────────────────
//  Definición de preguntas para seed
// ─────────────────────────────────────────────
interface QuestionSeed {
  area: string;
  contexto?: string;
  enunciado: string;
  explicacion?: string;
  difficulty: Difficulty;
  options: { letra: string; texto: string; isCorrect: boolean }[];
}

const PREGUNTAS: QuestionSeed[] = [
  // LECTURA CRÍTICA
  {
    area: 'Lectura Crítica', difficulty: Difficulty.MEDIA, contexto: CONTEXTO_IA,
    enunciado: '¿Cuál es el propósito principal del texto anterior?',
    explicacion: 'El texto no toma partido ni explica aspectos técnicos; su función es presentar dos posturas opuestas sobre el impacto de la IA en el empleo, enmarcadas en una reflexión más amplia sobre tecnología y bienestar humano.',
    options: [
      { letra: 'A', texto: 'Demostrar que la inteligencia artificial es perjudicial para la sociedad.', isCorrect: false },
      { letra: 'B', texto: 'Presentar el debate sobre el impacto de la IA en el trabajo y la sociedad.', isCorrect: true },
      { letra: 'C', texto: 'Explicar el funcionamiento técnico de los sistemas de inteligencia artificial.', isCorrect: false },
      { letra: 'D', texto: 'Promover el uso de la inteligencia artificial en todos los sectores económicos.', isCorrect: false },
    ],
  },
  {
    area: 'Lectura Crítica', difficulty: Difficulty.MEDIA, contexto: CONTEXTO_IA,
    enunciado: 'Según el texto, ¿qué argumentan quienes tienen una visión positiva de la inteligencia artificial?',
    explicacion: 'El texto dice explícitamente: "argumentan que la IA creará nuevos empleos y elevará la productividad, de la misma manera que lo hicieron la electricidad o el internet en su momento."',
    options: [
      { letra: 'A', texto: 'Que la IA eliminará todos los empleos rutinarios sin crear nuevas oportunidades.', isCorrect: false },
      { letra: 'B', texto: 'Que la IA no tiene ningún impacto real en el mercado laboral actual.', isCorrect: false },
      { letra: 'C', texto: 'Que la IA creará nuevos empleos y elevará la productividad, como lo hicieron tecnologías anteriores.', isCorrect: true },
      { letra: 'D', texto: 'Que el desempleo causado por la IA será temporal y fácil de superar.', isCorrect: false },
    ],
  },
  {
    area: 'Lectura Crítica', difficulty: Difficulty.DIFICIL, contexto: CONTEXTO_IA,
    enunciado: 'En el texto, la expresión "tensión más profunda" se refiere a:',
    explicacion: 'El autor cierra el texto señalando que el debate sobre la IA y el empleo refleja algo más fundamental: la tensión entre el avance tecnológico y su impacto en el bienestar de las personas.',
    options: [
      { letra: 'A', texto: 'El conflicto entre empresas tecnológicas y gobiernos por la regulación de la IA.', isCorrect: false },
      { letra: 'B', texto: 'La dificultad técnica de desarrollar sistemas de inteligencia artificial avanzados.', isCorrect: false },
      { letra: 'C', texto: 'La contradicción entre el progreso tecnológico y el bienestar humano.', isCorrect: true },
      { letra: 'D', texto: 'La rivalidad entre países por el liderazgo en inteligencia artificial.', isCorrect: false },
    ],
  },
  {
    area: 'Lectura Crítica', difficulty: Difficulty.DIFICIL, contexto: CONTEXTO_IA,
    enunciado: 'De la comparación entre la IA, la electricidad y el internet, se puede concluir que:',
    explicacion: 'La comparación sirve para argumentar que tecnologías disruptivas anteriores, aunque causaron cambios, finalmente crearon nuevas oportunidades laborales.',
    options: [
      { letra: 'A', texto: 'La electricidad y el internet generaron más desempleo que la inteligencia artificial.', isCorrect: false },
      { letra: 'B', texto: 'La IA es fundamentalmente diferente a todas las tecnologías anteriores.', isCorrect: false },
      { letra: 'C', texto: 'Las tecnologías transformadoras del pasado también generaron nuevos empleos tras su adopción masiva.', isCorrect: true },
      { letra: 'D', texto: 'El impacto de la IA en el empleo será idéntico al que tuvo el internet.', isCorrect: false },
    ],
  },
  // MATEMÁTICAS
  {
    area: 'Matemáticas', difficulty: Difficulty.FACIL,
    enunciado: 'Si 3x − 7 = 2x + 5, ¿cuál es el valor de x?',
    explicacion: 'Despejando: 3x − 2x = 5 + 7 → x = 12. Verificación: 3(12) − 7 = 29 y 2(12) + 5 = 29. ✓',
    options: [
      { letra: 'A', texto: 'x = 6', isCorrect: false },
      { letra: 'B', texto: 'x = 2', isCorrect: false },
      { letra: 'C', texto: 'x = 12', isCorrect: true },
      { letra: 'D', texto: 'x = −2', isCorrect: false },
    ],
  },
  {
    area: 'Matemáticas', difficulty: Difficulty.MEDIA,
    enunciado: 'En un salón de 40 estudiantes, 15 juegan fútbol, 12 juegan baloncesto y 5 juegan ambos deportes. ¿Cuántos estudiantes no practican ninguno de los dos deportes?',
    explicacion: 'Por el principio de inclusión-exclusión: |F ∪ B| = 15 + 12 − 5 = 22. Estudiantes sin deporte: 40 − 22 = 18.',
    options: [
      { letra: 'A', texto: '8', isCorrect: false },
      { letra: 'B', texto: '18', isCorrect: true },
      { letra: 'C', texto: '22', isCorrect: false },
      { letra: 'D', texto: '13', isCorrect: false },
    ],
  },
  {
    area: 'Matemáticas', difficulty: Difficulty.FACIL,
    enunciado: '¿Cuál es el área de un triángulo cuya base mide 12 cm y su altura mide 9 cm?',
    explicacion: 'Área del triángulo = (base × altura) / 2 = (12 × 9) / 2 = 108 / 2 = 54 cm².',
    options: [
      { letra: 'A', texto: '54 cm²', isCorrect: true },
      { letra: 'B', texto: '108 cm²', isCorrect: false },
      { letra: 'C', texto: '48 cm²', isCorrect: false },
      { letra: 'D', texto: '27 cm²', isCorrect: false },
    ],
  },
  {
    area: 'Matemáticas', difficulty: Difficulty.MEDIA,
    enunciado: 'Si el 30% de un número es 45, ¿cuánto es el 60% de ese mismo número?',
    explicacion: 'Si 30% → 45, entonces 100% → 150. El 60% de 150 = 90.',
    options: [
      { letra: 'A', texto: '75', isCorrect: false },
      { letra: 'B', texto: '90', isCorrect: true },
      { letra: 'C', texto: '135', isCorrect: false },
      { letra: 'D', texto: '60', isCorrect: false },
    ],
  },
  {
    area: 'Matemáticas', difficulty: Difficulty.DIFICIL,
    enunciado: 'Observe la siguiente secuencia numérica: 3, 7, 13, 21, 31, … ¿Cuál es el siguiente término?',
    explicacion: 'Las diferencias entre términos son: 4, 6, 8, 10, … (incrementan de 2 en 2). La siguiente diferencia es 12, por tanto: 31 + 12 = 43.',
    options: [
      { letra: 'A', texto: '41', isCorrect: false },
      { letra: 'B', texto: '43', isCorrect: true },
      { letra: 'C', texto: '45', isCorrect: false },
      { letra: 'D', texto: '37', isCorrect: false },
    ],
  },
  // CIENCIAS NATURALES
  {
    area: 'Ciencias Naturales', difficulty: Difficulty.FACIL,
    enunciado: '¿Cuál es la función principal de la mitocondria dentro de la célula?',
    explicacion: 'La mitocondria es la "central energética" de la célula: convierte nutrientes en ATP mediante la respiración celular aeróbica.',
    options: [
      { letra: 'A', texto: 'Sintetizar proteínas a partir de aminoácidos.', isCorrect: false },
      { letra: 'B', texto: 'Producir energía (ATP) mediante la respiración celular.', isCorrect: true },
      { letra: 'C', texto: 'Controlar las actividades celulares y almacenar el ADN.', isCorrect: false },
      { letra: 'D', texto: 'Transportar sustancias entre el núcleo y el citoplasma.', isCorrect: false },
    ],
  },
  {
    area: 'Ciencias Naturales', difficulty: Difficulty.MEDIA,
    enunciado: 'En un cruce genético entre un individuo heterocigoto (Aa) para el color de cabello castaño y un individuo de cabello rubio (aa), si el castaño es dominante, ¿qué proporción de la descendencia tendrá cabello rubio?',
    explicacion: 'Cruce Aa × aa: descendencia posible es Aa y aa en partes iguales (1:1). El 50% heredará aa (rubio).',
    options: [
      { letra: 'A', texto: '25%', isCorrect: false },
      { letra: 'B', texto: '75%', isCorrect: false },
      { letra: 'C', texto: '50%', isCorrect: true },
      { letra: 'D', texto: '100%', isCorrect: false },
    ],
  },
  {
    area: 'Ciencias Naturales', difficulty: Difficulty.FACIL,
    enunciado: 'En un ecosistema, los organismos llamados productores son aquellos que:',
    explicacion: 'Los productores son organismos autótrofos que convierten la energía solar en energía química mediante la fotosíntesis.',
    options: [
      { letra: 'A', texto: 'Se alimentan de animales herbívoros y obtienen energía de ellos.', isCorrect: false },
      { letra: 'B', texto: 'Descomponen la materia orgánica muerta y la transforman en nutrientes.', isCorrect: false },
      { letra: 'C', texto: 'Producen su propio alimento mediante la fotosíntesis usando energía solar.', isCorrect: true },
      { letra: 'D', texto: 'Consumen tanto productores como consumidores primarios.', isCorrect: false },
    ],
  },
  {
    area: 'Ciencias Naturales', difficulty: Difficulty.MEDIA,
    enunciado: 'La ley de Newton que establece que "a toda acción corresponde una reacción igual y de sentido contrario" se conoce como:',
    explicacion: 'La tercera ley de Newton (acción-reacción) establece que las fuerzas siempre ocurren en pares.',
    options: [
      { letra: 'A', texto: 'Primera ley de Newton o ley de inercia.', isCorrect: false },
      { letra: 'B', texto: 'Segunda ley de Newton o ley de la fuerza.', isCorrect: false },
      { letra: 'C', texto: 'Tercera ley de Newton o ley de acción y reacción.', isCorrect: true },
      { letra: 'D', texto: 'Ley de gravitación universal de Newton.', isCorrect: false },
    ],
  },
  // CIENCIAS SOCIALES
  {
    area: 'Ciencias Sociales', difficulty: Difficulty.MEDIA,
    enunciado: '¿Cuál fue el principal objetivo del Frente Nacional en Colombia (1958–1974)?',
    explicacion: 'El Frente Nacional fue un acuerdo para alternar la presidencia entre liberales y conservadores durante 16 años, poniendo fin a "La Violencia".',
    options: [
      { letra: 'A', texto: 'Implementar un sistema socialista de gobierno en Colombia.', isCorrect: false },
      { letra: 'B', texto: 'Poner fin a la violencia bipartidista alternando el poder entre liberales y conservadores.', isCorrect: true },
      { letra: 'C', texto: 'Establecer la independencia económica de Colombia frente a Estados Unidos.', isCorrect: false },
      { letra: 'D', texto: 'Unificar militarmente a los países de América del Sur.', isCorrect: false },
    ],
  },
  {
    area: 'Ciencias Sociales', difficulty: Difficulty.MEDIA,
    enunciado: 'En el contexto del Estado Social de Derecho, como el consagrado en la Constitución Política de Colombia de 1991, esto implica que:',
    explicacion: 'Un Estado Social de Derecho combina el respeto a las normas jurídicas con la obligación de garantizar derechos fundamentales para todos los ciudadanos.',
    options: [
      { letra: 'A', texto: 'El Estado tiene poder absoluto sobre los ciudadanos sin limitaciones legales.', isCorrect: false },
      { letra: 'B', texto: 'Solo los ciudadanos con recursos económicos tienen acceso a derechos fundamentales.', isCorrect: false },
      { letra: 'C', texto: 'El Estado garantiza los derechos fundamentales y promueve el bienestar de todos los ciudadanos.', isCorrect: true },
      { letra: 'D', texto: 'Las leyes del mercado determinan el acceso a los servicios básicos.', isCorrect: false },
    ],
  },
  {
    area: 'Ciencias Sociales', difficulty: Difficulty.FACIL,
    enunciado: '¿Cuál es la importancia geográfica y económica del río Magdalena para Colombia?',
    explicacion: 'El río Magdalena recorre el interior del país de sur a norte desembocando en el Caribe; ha sido históricamente la principal vía de comunicación interna.',
    options: [
      { letra: 'A', texto: 'Es el río más largo de Colombia y desemboca en el océano Pacífico.', isCorrect: false },
      { letra: 'B', texto: 'Es la principal arteria fluvial del interior del país y una fuente vital de agua dulce y transporte.', isCorrect: true },
      { letra: 'C', texto: 'Marca la frontera natural entre Colombia y Venezuela.', isCorrect: false },
      { letra: 'D', texto: 'Es el principal productor de energía hidroeléctrica en Suramérica.', isCorrect: false },
    ],
  },
  {
    area: 'Ciencias Sociales', difficulty: Difficulty.DIFICIL,
    enunciado: '¿Cuál de los siguientes factores explica principalmente el fenómeno de la inflación en una economía?',
    explicacion: 'La inflación ocurre cuando hay más dinero circulando en la economía que bienes y servicios disponibles (teoría cuantitativa del dinero).',
    options: [
      { letra: 'A', texto: 'La reducción de las exportaciones nacionales al mercado internacional.', isCorrect: false },
      { letra: 'B', texto: 'El aumento de las tasas de interés por parte del banco central.', isCorrect: false },
      { letra: 'C', texto: 'El exceso de dinero en circulación respecto a los bienes y servicios disponibles.', isCorrect: true },
      { letra: 'D', texto: 'La disminución de la deuda pública del gobierno nacional.', isCorrect: false },
    ],
  },
  // INGLÉS
  {
    area: 'Inglés', difficulty: Difficulty.MEDIA, contexto: CONTEXTO_ENGLISH,
    enunciado: 'According to the text, what makes Colombia\'s extraordinary biodiversity possible?',
    explicacion: 'The text states: "The Amazon rainforest, the Andes mountains, and the Pacific and Caribbean coasts create a variety of ecosystems that support this incredible diversity."',
    options: [
      { letra: 'A', texto: 'The large human population that protects native species.', isCorrect: false },
      { letra: 'B', texto: 'The variety of ecosystems created by different geographical features.', isCorrect: true },
      { letra: 'C', texto: 'The government\'s strong environmental protection policies.', isCorrect: false },
      { letra: 'D', texto: 'The absence of predators in the Amazon rainforest.', isCorrect: false },
    ],
  },
  {
    area: 'Inglés', difficulty: Difficulty.DIFICIL, contexto: CONTEXTO_ENGLISH,
    enunciado: 'In the text, the word "pose" ("deforestation and climate change pose serious threats") is closest in meaning to:',
    explicacion: 'In this context, "pose" means "to present" or "to represent." This is a common academic English usage.',
    options: [
      { letra: 'A', texto: 'Reduce', isCorrect: false },
      { letra: 'B', texto: 'Eliminate', isCorrect: false },
      { letra: 'C', texto: 'Represent', isCorrect: true },
      { letra: 'D', texto: 'Photograph', isCorrect: false },
    ],
  },
  {
    area: 'Inglés', difficulty: Difficulty.FACIL, contexto: CONTEXTO_ENGLISH,
    enunciado: 'What is the main purpose of the text about Colombia?',
    explicacion: 'The text presents Colombia\'s biodiversity and the challenges it faces (deforestation, climate change).',
    options: [
      { letra: 'A', texto: 'To persuade readers to visit Colombia as a tourist destination.', isCorrect: false },
      { letra: 'B', texto: 'To explain the life cycle of bird species in Colombia.', isCorrect: false },
      { letra: 'C', texto: 'To present Colombia\'s biodiversity and the challenges it faces.', isCorrect: true },
      { letra: 'D', texto: 'To criticize the Colombian government\'s environmental policies.', isCorrect: false },
    ],
  },
];

async function seedQuestions() {
  console.log('Seeding question bank...');

  const existing = await prisma.question.count();
  if (existing > 0) {
    console.log(`Ya hay ${existing} preguntas en el banco, omitiendo.`);
    return;
  }

  for (const q of PREGUNTAS) {
    await prisma.question.create({
      data: {
        area: q.area,
        contexto: q.contexto ?? null,
        enunciado: q.enunciado,
        explicacion: q.explicacion ?? null,
        examType: ExamType.ICFES,
        difficulty: q.difficulty,
        isActive: true,
        options: {
          create: q.options.map(o => ({
            letra: o.letra,
            texto: o.texto,
            isCorrect: o.isCorrect,
          })),
        },
      },
    });
  }

  console.log(`${PREGUNTAS.length} preguntas creadas en el banco.`);
}

async function seedSimulacros() {
  console.log('Seeding simulacros...');

  const existing = await prisma.simulacro.count();
  if (existing > 0) {
    console.log(`Ya hay ${existing} simulacros, omitiendo.`);
    return;
  }

  // Agrupar preguntas por área para asignarlas a secciones
  const areas = [...new Set(PREGUNTAS.map(q => q.area))];

  // Obtener las preguntas del banco ya creadas
  const bankQuestions = await prisma.question.findMany({
    where: { isActive: true },
    select: { id: true, area: true },
  });

  const questionsByArea: Record<string, string[]> = {};
  for (const bq of bankQuestions) {
    if (!questionsByArea[bq.area]) questionsByArea[bq.area] = [];
    questionsByArea[bq.area].push(bq.id);
  }

  const simulacrosData = [
    {
      titulo: 'Simulacro ICFES — Saber 11 · Edición 2026',
      descripcion: 'Simulacro completo con las 5 áreas del ICFES Saber 11.',
      color: '#004aad',
      emoji: '📝',
    },
    {
      titulo: 'Simulacro ICFES — Saber 11 · Entrenamiento II',
      descripcion: 'Segunda ronda de práctica con énfasis en todas las áreas.',
      color: '#7c3aed',
      emoji: '🧠',
    },
  ];

  for (const simData of simulacrosData) {
    // Shuffle questions per area per simulacro for variety
    const sim = await prisma.simulacro.create({
      data: {
        titulo: simData.titulo,
        descripcion: simData.descripcion,
        examType: ExamType.ICFES,
        color: simData.color,
        emoji: simData.emoji,
        isPublished: true,
        totalPreguntas: PREGUNTAS.length,
        duracionMinutos: 45,
        areasEvaluadas: areas,
      },
    });

    // Create one session (MANANA)
    const session = await prisma.simulacroSession.create({
      data: {
        simulacroId: sim.id,
        type: SessionType.MANANA,
        label: 'Sesión Mañana',
        order: 1,
      },
    });

    // Create one section per area
    let sectionOrder = 1;
    for (const area of areas) {
      const areaQuestions = questionsByArea[area] ?? [];
      if (areaQuestions.length === 0) continue;

      const section = await prisma.simulacroSection.create({
        data: {
          sessionId: session.id,
          area,
          order: sectionOrder++,
          questionCount: areaQuestions.length,
          duracionMinutos: 9, // ~45 min / 5 areas
        },
      });

      // Link all questions of this area to this section
      await prisma.simulacroQuestion.createMany({
        data: areaQuestions.map((qId, idx) => ({
          sectionId: section.id,
          questionId: qId,
          order: idx + 1,
        })),
      });
    }

    console.log(`Simulacro "${sim.titulo}" creado.`);
  }
}

async function main() {
  console.log('Seeding database...');

  // ── Admin del colegio ACAE ─────────────────
  const adminEmail = 'admin@acae.com';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (existing) {
    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: Role.ADMIN },
    });
    console.log(`Usuario ${adminEmail} ya existe (ADMIN).`);
  } else {
    const hashedPassword = await bcrypt.hash('Admin1234', 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'ACAE',
        role: Role.ADMIN,
      },
    });
    if (!IS_PROD) console.log(`Usuario ADMIN creado: ${adminEmail} / Admin1234`);
  }

  // ── Super Admin (política de Super Admin único) ─────────
  // Solo puede existir un SUPER_ADMIN en toda la plataforma, con este correo exacto.
  const existingAnySA = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN } });

  if (existingAnySA && existingAnySA.email !== SUPER_ADMIN_ALLOWED_EMAIL) {
    console.warn(
      `[SEED] Ya existe un SUPER_ADMIN (${existingAnySA.email}) distinto al permitido (${SUPER_ADMIN_ALLOWED_EMAIL}). No se crea uno nuevo.`,
    );
  } else if (!existingAnySA) {
    const hashedPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
    const created = await prisma.user.create({
      data: {
        email: SUPER_ADMIN_ALLOWED_EMAIL,
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: Role.SUPER_ADMIN,
        mustChangePassword: true,
      },
    });
    if (!IS_PROD) {
      console.log(`Usuario SUPER_ADMIN creado: ${SUPER_ADMIN_ALLOWED_EMAIL}. Usa "forgot-password" para definir la contraseña inicial.`);
    } else {
      console.log(`Usuario SUPER_ADMIN creado (id: ${created.id}). Define la contraseña inicial vía "forgot-password".`);
    }
  }

  // ── Estudiante de prueba ───────────────────
  const estudianteEmail = 'estudiante@acae.com';
  const existingEst = await prisma.user.findUnique({ where: { email: estudianteEmail } });
  if (!existingEst) {
    const hashedPassword = await bcrypt.hash('Estudiante1234', 10);
    await prisma.user.create({
      data: {
        email: estudianteEmail,
        password: hashedPassword,
        firstName: 'Juan',
        lastName: 'Pérez',
        role: Role.ESTUDIANTE,
      },
    });
    if (!IS_PROD) console.log(`Usuario ESTUDIANTE creado: ${estudianteEmail} / Estudiante1234`);
  }

  // ── Colegio ACAE ───────────────────────────
  const defaultSchool = await prisma.school.upsert({
    where: { slug: 'acae' },
    create: {
      name: 'ACAE',
      slug: 'acae',
      email: 'admin@acae.com',
      phone: '573154616531',
      address: 'Ocaña, Norte de Santander, Colombia',
      isActive: true,
      pageContent: {
        heroTitle: 'Academia de Ciencias Avanzadas Exactas',
        heroSubtitle: 'Prepárate para el ICFES con la academia de los mejores resultados.',
        stat1Num: '500+', stat1Label: 'Estudiantes formados',
        stat2Num: '456',  stat2Label: 'Mejor puntaje ICFES',
        stat3Num: '10+',  stat3Label: 'Años de experiencia',
        stat4Num: '98%',  stat4Label: 'Satisfacción',
        whatsapp: '573154616531',
        instagram: 'acaeocana',
        tiktok: 'acaeacademia',
        facebook: '61553446086877',
      },
    },
    update: {
      name: 'ACAE',
      email: 'admin@acae.com',
    },
  });
  console.log(`Colegio ACAE: ${defaultSchool.name} (slug: ${defaultSchool.slug})`);

  // Asignar admin y estudiante al colegio ACAE
  await prisma.user.update({
    where: { email: 'admin@acae.com' },
    data: { schoolId: defaultSchool.id },
  });
  const est = await prisma.user.findUnique({ where: { email: 'estudiante@acae.com' } });
  if (est) {
    await prisma.user.update({
      where: { email: 'estudiante@acae.com' },
      data: { schoolId: defaultSchool.id },
    });
  }
  console.log('Usuarios asignados al colegio ACAE.');

  // ── Banco de preguntas ─────────────────────
  await seedQuestions();

  // ── Simulacros ─────────────────────────────
  await seedSimulacros();

  // ── Marcar contenido existente como global ─
  await prisma.course.updateMany({ where: { schoolId: null }, data: { isGlobal: true } });
  await prisma.simulacro.updateMany({ where: { schoolId: null }, data: { isGlobal: true } });
  await prisma.question.updateMany({ where: { schoolId: null }, data: { isGlobal: true } });
  console.log('Contenido existente marcado como global.');

  console.log('Seed completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
