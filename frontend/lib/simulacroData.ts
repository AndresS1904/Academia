/* ─────────────────────────────────────────────
   Simulacro Data — banco de preguntas y definiciones
   ───────────────────────────────────────────── */

export type Letra = "A" | "B" | "C" | "D";

export interface Pregunta {
  id: number;
  area: string;
  contexto?: string;
  enunciado: string;
  opciones: { letra: Letra; texto: string }[];
  respuesta: Letra;
  explicacion?: string;
}

export interface SimulacroDefinicion {
  id: string;
  titulo: string;
  descripcion: string;
  duracionMinutos: number;
  totalPreguntas: number;
  areasEvaluadas: string[];
  color: string;
  emoji: string;
}

export interface SimulacroAsignado {
  id: string;
  simulacroId: string;
  fechaAsignacion: string;
  fechaLimite?: string;
  instrucciones: string;
}

/* ============================================================
   CONTEXTOS COMPARTIDOS
============================================================ */

const CONTEXTO_IA = `En los últimos años, la inteligencia artificial (IA) ha transformado radicalmente la manera en que las personas interactúan con la tecnología. Desde los asistentes de voz hasta los sistemas de recomendación de contenidos, la IA se ha integrado en casi todos los aspectos de la vida cotidiana. Sin embargo, esta revolución tecnológica no está exenta de controversias. Algunos expertos señalan que el avance descontrolado de la IA podría generar desempleo masivo, ya que muchas tareas realizadas actualmente por humanos pueden ser automatizadas. Otros, en cambio, argumentan que la IA creará nuevos empleos y elevará la productividad, de la misma manera que lo hicieron la electricidad o el internet en su momento. Lo cierto es que el debate sobre el impacto de la IA en el trabajo refleja una tensión más profunda: la relación entre el progreso tecnológico y el bienestar humano.`;

const CONTEXTO_ENGLISH = `Colombia is one of the most biodiverse countries in the world. It has the largest number of bird species, and is home to thousands of plant and animal species found nowhere else on Earth. The Amazon rainforest, the Andes mountains, and the Pacific and Caribbean coasts create a variety of ecosystems that support this incredible diversity. However, deforestation and climate change pose serious threats to Colombia's natural heritage.`;

/* ============================================================
   BANCO DE PREGUNTAS
============================================================ */

export const BANCO_PREGUNTAS: Pregunta[] = [
  // ── LECTURA CRÍTICA ──────────────────────────────────────
  {
    id: 1,
    area: "Lectura Crítica",
    contexto: CONTEXTO_IA,
    enunciado:
      "¿Cuál es el propósito principal del texto anterior?",
    opciones: [
      { letra: "A", texto: "Demostrar que la inteligencia artificial es perjudicial para la sociedad." },
      { letra: "B", texto: "Presentar el debate sobre el impacto de la IA en el trabajo y la sociedad." },
      { letra: "C", texto: "Explicar el funcionamiento técnico de los sistemas de inteligencia artificial." },
      { letra: "D", texto: "Promover el uso de la inteligencia artificial en todos los sectores económicos." },
    ],
    respuesta: "B",
    explicacion:
      "El texto no toma partido ni explica aspectos técnicos; su función es presentar dos posturas opuestas sobre el impacto de la IA en el empleo, enmarcadas en una reflexión más amplia sobre tecnología y bienestar humano.",
  },
  {
    id: 2,
    area: "Lectura Crítica",
    contexto: CONTEXTO_IA,
    enunciado:
      "Según el texto, ¿qué argumentan quienes tienen una visión positiva de la inteligencia artificial?",
    opciones: [
      { letra: "A", texto: "Que la IA eliminará todos los empleos rutinarios sin crear nuevas oportunidades." },
      { letra: "B", texto: "Que la IA no tiene ningún impacto real en el mercado laboral actual." },
      { letra: "C", texto: "Que la IA creará nuevos empleos y elevará la productividad, como lo hicieron tecnologías anteriores." },
      { letra: "D", texto: "Que el desempleo causado por la IA será temporal y fácil de superar." },
    ],
    respuesta: "C",
    explicacion:
      "El texto dice explícitamente: \"argumentan que la IA creará nuevos empleos y elevará la productividad, de la misma manera que lo hicieron la electricidad o el internet en su momento.\"",
  },
  {
    id: 3,
    area: "Lectura Crítica",
    contexto: CONTEXTO_IA,
    enunciado:
      "En el texto, la expresión \"tensión más profunda\" se refiere a:",
    opciones: [
      { letra: "A", texto: "El conflicto entre empresas tecnológicas y gobiernos por la regulación de la IA." },
      { letra: "B", texto: "La dificultad técnica de desarrollar sistemas de inteligencia artificial avanzados." },
      { letra: "C", texto: "La contradicción entre el progreso tecnológico y el bienestar humano." },
      { letra: "D", texto: "La rivalidad entre países por el liderazgo en inteligencia artificial." },
    ],
    respuesta: "C",
    explicacion:
      "El autor cierra el texto señalando que el debate sobre la IA y el empleo refleja algo más fundamental: la tensión entre el avance tecnológico y su impacto en el bienestar de las personas.",
  },
  {
    id: 4,
    area: "Lectura Crítica",
    contexto: CONTEXTO_IA,
    enunciado:
      "De la comparación entre la IA, la electricidad y el internet, se puede concluir que:",
    opciones: [
      { letra: "A", texto: "La electricidad y el internet generaron más desempleo que la inteligencia artificial." },
      { letra: "B", texto: "La IA es fundamentalmente diferente a todas las tecnologías anteriores." },
      { letra: "C", texto: "Las tecnologías transformadoras del pasado también generaron nuevos empleos tras su adopción masiva." },
      { letra: "D", texto: "El impacto de la IA en el empleo será idéntico al que tuvo el internet." },
    ],
    respuesta: "C",
    explicacion:
      "La comparación sirve para argumentar que tecnologías disruptivas anteriores, aunque causaron cambios, finalmente crearon nuevas oportunidades laborales. La analogía sugiere que la IA podría seguir el mismo patrón.",
  },

  // ── MATEMÁTICAS ──────────────────────────────────────────
  {
    id: 5,
    area: "Matemáticas",
    enunciado:
      "Si 3x − 7 = 2x + 5, ¿cuál es el valor de x?",
    opciones: [
      { letra: "A", texto: "x = 6" },
      { letra: "B", texto: "x = 2" },
      { letra: "C", texto: "x = 12" },
      { letra: "D", texto: "x = −2" },
    ],
    respuesta: "C",
    explicacion:
      "Despejando: 3x − 2x = 5 + 7 → x = 12. Verificación: 3(12) − 7 = 29 y 2(12) + 5 = 29. ✓",
  },
  {
    id: 6,
    area: "Matemáticas",
    enunciado:
      "En un salón de 40 estudiantes, 15 juegan fútbol, 12 juegan baloncesto y 5 juegan ambos deportes. ¿Cuántos estudiantes no practican ninguno de los dos deportes?",
    opciones: [
      { letra: "A", texto: "8" },
      { letra: "B", texto: "18" },
      { letra: "C", texto: "22" },
      { letra: "D", texto: "13" },
    ],
    respuesta: "B",
    explicacion:
      "Por el principio de inclusión-exclusión: |F ∪ B| = 15 + 12 − 5 = 22. Estudiantes sin deporte: 40 − 22 = 18.",
  },
  {
    id: 7,
    area: "Matemáticas",
    enunciado:
      "¿Cuál es el área de un triángulo cuya base mide 12 cm y su altura mide 9 cm?",
    opciones: [
      { letra: "A", texto: "54 cm²" },
      { letra: "B", texto: "108 cm²" },
      { letra: "C", texto: "48 cm²" },
      { letra: "D", texto: "27 cm²" },
    ],
    respuesta: "A",
    explicacion:
      "Área del triángulo = (base × altura) / 2 = (12 × 9) / 2 = 108 / 2 = 54 cm².",
  },
  {
    id: 8,
    area: "Matemáticas",
    enunciado:
      "Si el 30% de un número es 45, ¿cuánto es el 60% de ese mismo número?",
    opciones: [
      { letra: "A", texto: "75" },
      { letra: "B", texto: "90" },
      { letra: "C", texto: "135" },
      { letra: "D", texto: "60" },
    ],
    respuesta: "B",
    explicacion:
      "Si 30% → 45, entonces 100% → 150. El 60% de 150 = 90. Alternativamente, 60% = 2 × 30%, por tanto 2 × 45 = 90.",
  },
  {
    id: 9,
    area: "Matemáticas",
    enunciado:
      "Observe la siguiente secuencia numérica: 3, 7, 13, 21, 31, … ¿Cuál es el siguiente término?",
    opciones: [
      { letra: "A", texto: "41" },
      { letra: "B", texto: "43" },
      { letra: "C", texto: "45" },
      { letra: "D", texto: "37" },
    ],
    respuesta: "B",
    explicacion:
      "Las diferencias entre términos son: 4, 6, 8, 10, … (incrementan de 2 en 2). La siguiente diferencia es 12, por tanto: 31 + 12 = 43.",
  },

  // ── CIENCIAS NATURALES ───────────────────────────────────
  {
    id: 10,
    area: "Ciencias Naturales",
    enunciado:
      "¿Cuál es la función principal de la mitocondria dentro de la célula?",
    opciones: [
      { letra: "A", texto: "Sintetizar proteínas a partir de aminoácidos." },
      { letra: "B", texto: "Producir energía (ATP) mediante la respiración celular." },
      { letra: "C", texto: "Controlar las actividades celulares y almacenar el ADN." },
      { letra: "D", texto: "Transportar sustancias entre el núcleo y el citoplasma." },
    ],
    respuesta: "B",
    explicacion:
      "La mitocondria es la \"central energética\" de la célula: convierte nutrientes en ATP mediante la respiración celular aeróbica. La síntesis de proteínas ocurre en los ribosomas; el ADN se almacena en el núcleo.",
  },
  {
    id: 11,
    area: "Ciencias Naturales",
    enunciado:
      "En un cruce genético entre un individuo heterocigoto (Aa) para el color de cabello castaño y un individuo de cabello rubio (aa), si el castaño es dominante, ¿qué proporción de la descendencia tendrá cabello rubio?",
    opciones: [
      { letra: "A", texto: "25%" },
      { letra: "B", texto: "75%" },
      { letra: "C", texto: "50%" },
      { letra: "D", texto: "100%" },
    ],
    respuesta: "C",
    explicacion:
      "Cruce Aa × aa: descendencia posible es Aa y aa en partes iguales (1:1). El 50% heredará aa (rubio) y el 50% será Aa (castaño). Esto se ilustra con el cuadro de Punnett.",
  },
  {
    id: 12,
    area: "Ciencias Naturales",
    enunciado:
      "En un ecosistema, los organismos llamados productores son aquellos que:",
    opciones: [
      { letra: "A", texto: "Se alimentan de animales herbívoros y obtienen energía de ellos." },
      { letra: "B", texto: "Descomponen la materia orgánica muerta y la transforman en nutrientes." },
      { letra: "C", texto: "Producen su propio alimento mediante la fotosíntesis usando energía solar." },
      { letra: "D", texto: "Consumen tanto productores como consumidores primarios." },
    ],
    respuesta: "C",
    explicacion:
      "Los productores (plantas, algas, cianobacterias) son organismos autótrofos que convierten la energía solar en energía química mediante la fotosíntesis, siendo la base de las cadenas tróficas.",
  },
  {
    id: 13,
    area: "Ciencias Naturales",
    enunciado:
      "La ley de Newton que establece que \"a toda acción corresponde una reacción igual y de sentido contrario\" se conoce como:",
    opciones: [
      { letra: "A", texto: "Primera ley de Newton o ley de inercia." },
      { letra: "B", texto: "Segunda ley de Newton o ley de la fuerza." },
      { letra: "C", texto: "Tercera ley de Newton o ley de acción y reacción." },
      { letra: "D", texto: "Ley de gravitación universal de Newton." },
    ],
    respuesta: "C",
    explicacion:
      "La tercera ley de Newton (acción-reacción) establece que las fuerzas siempre ocurren en pares: si A ejerce una fuerza sobre B, entonces B ejerce una fuerza de igual magnitud y dirección opuesta sobre A.",
  },

  // ── CIENCIAS SOCIALES ────────────────────────────────────
  {
    id: 14,
    area: "Ciencias Sociales",
    enunciado:
      "¿Cuál fue el principal objetivo del Frente Nacional en Colombia (1958–1974)?",
    opciones: [
      { letra: "A", texto: "Implementar un sistema socialista de gobierno en Colombia." },
      { letra: "B", texto: "Poner fin a la violencia bipartidista alternando el poder entre liberales y conservadores." },
      { letra: "C", texto: "Establecer la independencia económica de Colombia frente a Estados Unidos." },
      { letra: "D", texto: "Unificar militarmente a los países de América del Sur." },
    ],
    respuesta: "B",
    explicacion:
      "El Frente Nacional fue un acuerdo político entre el Partido Liberal y el Partido Conservador para alternar la presidencia cada cuatro años durante 16 años, con el fin de poner fin al periodo de violencia bipartidista conocido como \"La Violencia\".",
  },
  {
    id: 15,
    area: "Ciencias Sociales",
    enunciado:
      "En el contexto del Estado Social de Derecho, como el consagrado en la Constitución Política de Colombia de 1991, esto implica que:",
    opciones: [
      { letra: "A", texto: "El Estado tiene poder absoluto sobre los ciudadanos sin limitaciones legales." },
      { letra: "B", texto: "Solo los ciudadanos con recursos económicos tienen acceso a derechos fundamentales." },
      { letra: "C", texto: "El Estado garantiza los derechos fundamentales y promueve el bienestar de todos los ciudadanos." },
      { letra: "D", texto: "Las leyes del mercado determinan el acceso a los servicios básicos." },
    ],
    respuesta: "C",
    explicacion:
      "Un Estado Social de Derecho combina el respeto a las normas jurídicas con la obligación del Estado de garantizar condiciones de vida digna, derechos fundamentales y acceso a servicios esenciales para todos los ciudadanos.",
  },
  {
    id: 16,
    area: "Ciencias Sociales",
    enunciado:
      "¿Cuál es la importancia geográfica y económica del río Magdalena para Colombia?",
    opciones: [
      { letra: "A", texto: "Es el río más largo de Colombia y desemboca en el océano Pacífico." },
      { letra: "B", texto: "Es la principal arteria fluvial del interior del país y una fuente vital de agua dulce y transporte." },
      { letra: "C", texto: "Marca la frontera natural entre Colombia y Venezuela." },
      { letra: "D", texto: "Es el principal productor de energía hidroeléctrica en Suramérica." },
    ],
    respuesta: "B",
    explicacion:
      "El río Magdalena es el río más importante de Colombia: recorre el interior del país de sur a norte desembocando en el Caribe, ha sido históricamente la principal vía de comunicación interna y es fuente de agua dulce para millones de colombianos.",
  },
  {
    id: 17,
    area: "Ciencias Sociales",
    enunciado:
      "¿Cuál de los siguientes factores explica principalmente el fenómeno de la inflación en una economía?",
    opciones: [
      { letra: "A", texto: "La reducción de las exportaciones nacionales al mercado internacional." },
      { letra: "B", texto: "El aumento de las tasas de interés por parte del banco central." },
      { letra: "C", texto: "El exceso de dinero en circulación respecto a los bienes y servicios disponibles." },
      { letra: "D", texto: "La disminución de la deuda pública del gobierno nacional." },
    ],
    respuesta: "C",
    explicacion:
      "La inflación ocurre cuando hay más dinero circulando en la economía que bienes y servicios disponibles, lo que provoca un alza generalizada de precios. Esta explicación se conoce como teoría cuantitativa del dinero.",
  },

  // ── INGLÉS ───────────────────────────────────────────────
  {
    id: 18,
    area: "Inglés",
    contexto: CONTEXTO_ENGLISH,
    enunciado:
      "According to the text, what makes Colombia's extraordinary biodiversity possible?",
    opciones: [
      { letra: "A", texto: "The large human population that protects native species." },
      { letra: "B", texto: "The variety of ecosystems created by different geographical features." },
      { letra: "C", texto: "The government's strong environmental protection policies." },
      { letra: "D", texto: "The absence of predators in the Amazon rainforest." },
    ],
    respuesta: "B",
    explicacion:
      "The text states: \"The Amazon rainforest, the Andes mountains, and the Pacific and Caribbean coasts create a variety of ecosystems that support this incredible diversity.\" Geographical diversity → ecosystem variety → biodiversity.",
  },
  {
    id: 19,
    area: "Inglés",
    contexto: CONTEXTO_ENGLISH,
    enunciado:
      "In the text, the word \"pose\" (\"deforestation and climate change pose serious threats\") is closest in meaning to:",
    opciones: [
      { letra: "A", texto: "Reduce" },
      { letra: "B", texto: "Eliminate" },
      { letra: "C", texto: "Represent" },
      { letra: "D", texto: "Photograph" },
    ],
    respuesta: "C",
    explicacion:
      "In this context, \"pose\" means \"to present\" or \"to represent.\" Deforestation and climate change represent (pose) serious threats to Colombia's biodiversity. This is a common academic English usage.",
  },
  {
    id: 20,
    area: "Inglés",
    contexto: CONTEXTO_ENGLISH,
    enunciado:
      "What is the main purpose of the text about Colombia?",
    opciones: [
      { letra: "A", texto: "To persuade readers to visit Colombia as a tourist destination." },
      { letra: "B", texto: "To explain the life cycle of bird species in Colombia." },
      { letra: "C", texto: "To present Colombia's biodiversity and the challenges it faces." },
      { letra: "D", texto: "To criticize the Colombian government's environmental policies." },
    ],
    respuesta: "C",
    explicacion:
      "The text first highlights Colombia's remarkable biodiversity (largest bird species count, unique flora and fauna, diverse ecosystems) and then introduces the threats it faces (deforestation, climate change). This informative structure serves to present both the richness and the challenges.",
  },
];

/* ============================================================
   DEFINICIÓN DEL SIMULACRO
============================================================ */

export const SIMULACROS: Record<string, SimulacroDefinicion> = {
  "sim-001": {
    id: "sim-001",
    titulo: "Simulacro ICFES — Saber 11 · Edición 2026",
    descripcion:
      "Simulacro completo con las 5 áreas del ICFES Saber 11. Las preguntas se presentan en orden aleatorio.",
    duracionMinutos: 45,
    totalPreguntas: 20,
    areasEvaluadas: [
      "Lectura Crítica",
      "Matemáticas",
      "Ciencias Naturales",
      "Ciencias Sociales",
      "Inglés",
    ],
    color: "#004aad",
    emoji: "📝",
  },
  "sim-002": {
    id: "sim-002",
    titulo: "Simulacro ICFES — Saber 11 · Entrenamiento II",
    descripcion:
      "Segunda ronda de práctica con énfasis en Matemáticas y Lectura Crítica. Ideal para reforzar las áreas con mayor peso en el puntaje.",
    duracionMinutos: 45,
    totalPreguntas: 20,
    areasEvaluadas: [
      "Lectura Crítica",
      "Matemáticas",
      "Ciencias Naturales",
      "Ciencias Sociales",
      "Inglés",
    ],
    color: "#7c3aed",
    emoji: "🧠",
  },
};

/* ============================================================
   SIMULACROS ASIGNADOS (mock)
============================================================ */

export const SIMULACROS_ASIGNADOS: SimulacroAsignado[] = [
  {
    id: "asig-001",
    simulacroId: "sim-001",
    fechaAsignacion: "2026-03-01",
    fechaLimite: "2026-03-31",
    instrucciones:
      "Responde todas las preguntas. Puedes navegar entre ellas libremente. El tiempo es de 45 minutos. Una vez finalizado el tiempo, el simulacro se entregará automáticamente.",
  },
  {
    id: "asig-002",
    simulacroId: "sim-002",
    fechaAsignacion: "2026-03-10",
    fechaLimite: "2026-04-15",
    instrucciones:
      "Segundo simulacro de entrenamiento. Administra bien tu tiempo y revisa las áreas donde tuviste más dificultades en el primer simulacro.",
  },
];

/* ============================================================
   HELPERS
============================================================ */

export function getPreguntaById(id: number): Pregunta | undefined {
  return BANCO_PREGUNTAS.find((p) => p.id === id);
}

export const AREA_COLORES: Record<string, string> = {
  "Lectura Crítica": "#7c3aed",
  "Matemáticas": "#0059d1",
  "Ciencias Naturales": "#059669",
  "Ciencias Sociales": "#d97706",
  "Inglés": "#db2777",
};

export const AREA_CONTEO: Record<string, number> = {
  "Lectura Crítica": 4,
  "Matemáticas": 5,
  "Ciencias Naturales": 4,
  "Ciencias Sociales": 4,
  "Inglés": 3,
};
