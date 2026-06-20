const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// Metadata por pregunta — basada en enunciado y área
const metadata = [
  // Lectura Crítica
  { id: 'cmmxij4ns0003knj69i8uaalt', competence: 'Comprensión e interpretación', topic: 'Propósito del texto', component: 'Semántico', gradeLevel: 11, year: 2024, sourceType: 'PROPIA' },
  { id: 'cmmxij4o70008knj6d7n7s1d7', competence: 'Reflexión y evaluación', topic: 'Textos argumentativos', component: 'Pragmático', gradeLevel: 11, year: 2024, sourceType: 'PROPIA' },
  { id: 'cmmxij4o9000dknj6wvbum8mq', competence: 'Comprensión e interpretación', topic: 'Vocabulario en contexto', component: 'Semántico', gradeLevel: 11, year: 2024, sourceType: 'PROPIA' },
  { id: 'cmmxij4oa000iknj6w0xtap5b', competence: 'Reflexión y evaluación', topic: 'Textos informativos', component: 'Pragmático', gradeLevel: 11, year: 2024, sourceType: 'PROPIA' },

  // Matemáticas
  { id: 'cmmxij4oc000nknj6xmuivhdw', competence: 'Formulación y ejecución', topic: 'Álgebra lineal', component: 'Numérico-variacional', gradeLevel: 11, year: 2024, sourceType: 'PROPIA' },
  { id: 'cmmxij4od000sknj6ydwwjj9g', competence: 'Interpretación y representación', topic: 'Conjuntos y conteo', component: 'Numérico-variacional', gradeLevel: 11, year: 2024, sourceType: 'PROPIA' },
  { id: 'cmmxij4of000xknj62smg6vi8', competence: 'Formulación y ejecución', topic: 'Geometría plana', component: 'Geométrico-métrico', gradeLevel: 11, year: 2024, sourceType: 'PROPIA' },
  { id: 'cmmxij4og0012knj6qnzk1qsi', competence: 'Formulación y ejecución', topic: 'Porcentajes y proporciones', component: 'Numérico-variacional', gradeLevel: 11, year: 2024, sourceType: 'PROPIA' },
  { id: 'cmmxij4oi0017knj6sv2ji3ih', competence: 'Argumentación', topic: 'Patrones y sucesiones', component: 'Numérico-variacional', gradeLevel: 11, year: 2024, sourceType: 'PROPIA' },

  // Ciencias Naturales
  { id: 'cmmxij4ol001cknj6jw1uuom7', competence: 'Explicar', topic: 'Biología celular', component: 'Biología', gradeLevel: 11, year: 2024, sourceType: 'PROPIA' },
  { id: 'cmmxij4on001hknj6pii2fhrl', competence: 'Indagar', topic: 'Genética', component: 'Biología', gradeLevel: 11, year: 2024, sourceType: 'PROPIA' },
  { id: 'cmmxij4op001mknj6qjds55d8', competence: 'Explicar', topic: 'Ecología', component: 'Biología', gradeLevel: 11, year: 2024, sourceType: 'PROPIA' },
  { id: 'cmmxij4oq001rknj66yupo707', competence: 'Indagar', topic: 'Mecánica', component: 'Física', gradeLevel: 11, year: 2024, sourceType: 'PROPIA' },

  // Ciencias Sociales
  { id: 'cmmxij4or001wknj63x1oxond', competence: 'Interpretación y análisis de perspectivas', topic: 'Historia de Colombia siglo XX', component: 'Historia', gradeLevel: 11, year: 2024, sourceType: 'PROPIA' },
  { id: 'cmmxij4ou0021knj6j3ude2ky', competence: 'Pensamiento sistémico', topic: 'Constitución Política', component: 'Política', gradeLevel: 11, year: 2024, sourceType: 'PROPIA' },
  { id: 'cmmxij4ow0026knj6pmya9uyr', competence: 'Pensamiento sistémico', topic: 'Geografía de Colombia', component: 'Geografía', gradeLevel: 11, year: 2024, sourceType: 'PROPIA' },
  { id: 'cmmxij4oy002bknj68uk99p71', competence: 'Interpretación y análisis de perspectivas', topic: 'Desarrollo económico', component: 'Economía', gradeLevel: 11, year: 2024, sourceType: 'PROPIA' },

  // Inglés
  { id: 'cmmxij4p0002gknj6c6a7wepz', competence: 'Reading Comprehension', topic: 'Locating specific information', component: 'Reading', gradeLevel: 11, year: 2024, sourceType: 'PROPIA' },
  { id: 'cmmxij4p1002lknj69825f43v', competence: 'Reading Comprehension', topic: 'Vocabulary in context', component: 'Reading', gradeLevel: 11, year: 2024, sourceType: 'PROPIA' },
  { id: 'cmmxij4p3002qknj6snwzkokp', competence: 'Reading Comprehension', topic: 'Main idea and purpose', component: 'Reading', gradeLevel: 11, year: 2024, sourceType: 'PROPIA' },
];

async function main() {
  let updated = 0;
  for (const m of metadata) {
    const { id, ...data } = m;
    await p.question.update({ where: { id }, data });
    updated++;
    console.log(`✓ ${id.slice(-8)} — ${data.topic}`);
  }
  console.log(`\nActualizadas ${updated} preguntas.`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());
