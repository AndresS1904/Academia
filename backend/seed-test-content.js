const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const schoolId    = 'cmmya55wv000067np4e2oro9g';
  const adminId     = 'cmmxij4kb0000knj6j68czsr1';
  const courseId    = 'cmq00cvnb00011xahzmjb9lkl';
  const classroomId = 'cmq00dgko0001apkcqcfeh1h7';
  const res1Id      = 'cmq00cvnv00051xahl2i8ddqk'; // recurso Sesión 1

  // ══════════════════════════════════════════════
  //  CURSO — contenido adicional
  // ══════════════════════════════════════════════

  // Material en Sesión 1 (ya existente)
  await p.topicMaterial.create({
    data: {
      resourceId: res1Id,
      title: 'Guía rápida de estudio',
      type: 'PDF',
      externalUrl: 'https://www.w3.org/WAI/WCAG21/wcag21.pdf',
      description: 'Documento de referencia para el curso.',
      order: 0,
    },
  });
  console.log('✅ Material añadido a Sesión 1');

  // Sesión 2 → Tarea
  const les2 = await p.lesson.create({ data: { courseId, title: 'Sesión 2: Actividad Escrita', order: 1 } });
  const res2 = await p.resource.create({
    data: { lessonId: les2.id, title: 'Lectura obligatoria', type: 'PDF', url: 'https://www.w3.org/WAI/WCAG21/wcag21.pdf' },
  });
  await p.topicActivity.create({
    data: {
      resourceId: res2.id,
      title: 'Ensayo sobre la lectura',
      description: 'Escribe un ensayo de mínimo 300 palabras sobre los conceptos vistos en la lectura.',
      instructions: 'Usa los temas tratados. Entrega en formato PDF o Word.',
      maxScore: 20,
      isPublished: true,
      order: 0,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  console.log('✅ Sesión 2 + Tarea creadas');

  // Sesión 3 → Simulacro (ClassQuiz con preguntas del banco)
  const les3 = await p.lesson.create({ data: { courseId, title: 'Sesión 3: Simulacro', order: 2 } });
  const res3 = await p.resource.create({
    data: { lessonId: les3.id, title: 'Instrucciones del simulacro', type: 'LINK', url: 'https://aprova.co' },
  });
  const quiz = await p.classQuiz.create({
    data: {
      resourceId: res3.id,
      title: 'Simulacro de Lenguaje y Matemáticas',
      description: 'Prueba de conocimientos para evaluar el avance del curso.',
      instructions: 'Lee cada pregunta con cuidado. Tienes 30 minutos para completar el simulacro.',
      timeLimit: 30,
      maxAttempts: 2,
      passingScore: 60,
      showResults: true,
      status: 'PUBLISHED',
      order: 0,
    },
  });

  // Tomar 5 preguntas del banco y copiarlas al quiz
  const bankQuestions = await p.question.findMany({
    take: 5,
    include: { options: true },
  });
  for (let i = 0; i < bankQuestions.length; i++) {
    const bq = bankQuestions[i];
    const qq = await p.quizQuestion.create({
      data: { quizId: quiz.id, content: bq.enunciado, points: 1, order: i },
    });
    for (let j = 0; j < bq.options.length; j++) {
      const opt = bq.options[j];
      await p.quizOption.create({
        data: { questionId: qq.id, content: opt.texto, isCorrect: opt.esCorrecta, order: j },
      });
    }
  }
  console.log(`✅ Sesión 3 + Simulacro (${bankQuestions.length} preguntas) creados`);

  // Sesión 4 → Foro
  const les4 = await p.lesson.create({ data: { courseId, title: 'Sesión 4: Foro de Discusión', order: 3 } });
  const res4 = await p.resource.create({
    data: { lessonId: les4.id, title: 'Material de apoyo - Foro', type: 'LINK', url: 'https://aprova.co' },
  });
  const forum = await p.forum.create({
    data: {
      resourceId: res4.id,
      title: 'Reflexiones sobre el curso',
      description: 'Comparte tus opiniones, dudas y aprendizajes de las sesiones anteriores.',
    },
  });
  const thread = await p.forumThread.create({
    data: { forumId: forum.id, authorId: adminId, title: '¿Qué fue lo más interesante del curso hasta ahora?' },
  });
  await p.forumPost.create({
    data: {
      threadId: thread.id,
      authorId: adminId,
      content: 'Hola a todos 👋 Cuéntenme qué tema les pareció más relevante en las primeras sesiones. ¡Participen sin pena!',
    },
  });
  console.log('✅ Sesión 4 + Foro + Hilo inicial creados');

  // ══════════════════════════════════════════════
  //  AULA VIRTUAL — contenido completo
  // ══════════════════════════════════════════════

  // Módulo
  const mod1 = await p.classModule.create({
    data: { classroomId, title: 'Módulo 1: Fundamentos', description: 'Bases conceptuales del área.', order: 0 },
  });

  // Sección 1 → Tema 1 → Unidades de aprendizaje
  const sec1 = await p.classSection.create({ data: { moduleId: mod1.id, title: 'Sección 1: Introducción', order: 0 } });
  const top1 = await p.classTopic.create({
    data: { sectionId: sec1.id, title: 'Tema 1: Conceptos clave', description: 'Vocabulario y definiciones esenciales.', order: 0 },
  });
  await p.learningUnit.create({
    data: {
      topic: { connect: { id: top1.id } },
      title: 'Lectura: Los fundamentos',
      type: 'TEXT',
      content: '<h2>Introducción</h2><p>Bienvenido al aula de prueba. Este contenido de ejemplo permite explorar las funcionalidades del aula virtual.</p><p>Los temas que cubriremos incluyen conceptos clave, ejercicios prácticos y evaluaciones formativas.</p>',
      order: 0,
      isPublished: true,
    },
  });
  await p.learningUnit.create({
    data: {
      topic: { connect: { id: top1.id } },
      title: 'Video: Explicación visual',
      type: 'VIDEO',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      order: 1,
      isPublished: true,
    },
  });

  // Sección 2 → Tema 2 → Unidad
  const sec2 = await p.classSection.create({ data: { moduleId: mod1.id, title: 'Sección 2: Práctica', order: 1 } });
  const top2 = await p.classTopic.create({
    data: { sectionId: sec2.id, title: 'Tema 2: Aplicación práctica', description: 'Ejercicios y casos reales.', order: 0 },
  });
  await p.learningUnit.create({
    data: {
      topic: { connect: { id: top2.id } },
      title: 'Documento de ejercicios',
      type: 'TEXT',
      content: '<h2>Ejercicios prácticos</h2><p>Resuelve los siguientes ejercicios aplicando los conceptos vistos en el Tema 1.</p><p><a href="https://www.w3.org/WAI/WCAG21/wcag21.pdf" target="_blank">📄 Descargar guía de ejercicios</a></p>',
      order: 0,
      isPublished: true,
    },
  });
  console.log('✅ Aula: módulo + 2 secciones + 3 unidades creadas');

  // Tarea del aula (ligada al módulo)
  await p.classActivity.create({
    data: {
      moduleId: mod1.id,
      title: 'Tarea: Resumen del módulo',
      description: 'Elabora un resumen de los temas vistos en el módulo 1.',
      instructions: 'Mínimo 200 palabras. Incluye ejemplos propios. Entrega en PDF.',
      maxScore: 10,
      isPublished: true,
      order: 0,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    },
  });
  console.log('✅ Aula: Tarea creada');

  // Foro del aula
  const classF = await p.forum.create({
    data: {
      classroomId,
      title: 'Preguntas y respuestas del módulo',
      description: 'Espacio para resolver dudas sobre el módulo 1.',
    },
  });
  const classThread = await p.forumThread.create({
    data: { forumId: classF.id, authorId: adminId, title: 'Dudas sobre el Tema 1' },
  });
  await p.forumPost.create({
    data: {
      threadId: classThread.id,
      authorId: adminId,
      content: 'Aquí pueden dejar sus preguntas sobre los conceptos del Tema 1. ¡Estoy para ayudarles! 📚',
    },
  });
  console.log('✅ Aula: Foro + hilo inicial creados');

  // Quiz del aula
  const classQ = await p.classQuiz.create({
    data: {
      classroomId,
      title: 'Quiz rápido del Módulo 1',
      description: 'Evaluación de comprensión de los temas del módulo.',
      timeLimit: 15,
      maxAttempts: 3,
      passingScore: 70,
      showResults: true,
      status: 'PUBLISHED',
      order: 0,
    },
  });
  const cq1 = await p.quizQuestion.create({
    data: { quizId: classQ.id, content: '¿Cuál es el propósito de una unidad de aprendizaje en el aula virtual?', points: 1, order: 0 },
  });
  await p.quizOption.createMany({ data: [
    { questionId: cq1.id, content: 'Decorar la interfaz del sistema', isCorrect: false, order: 0 },
    { questionId: cq1.id, content: 'Organizar y presentar contenido al estudiante', isCorrect: true, order: 1 },
    { questionId: cq1.id, content: 'Reemplazar al docente en el aula', isCorrect: false, order: 2 },
    { questionId: cq1.id, content: 'Generar reportes automáticos', isCorrect: false, order: 3 },
  ]});
  const cq2 = await p.quizQuestion.create({
    data: { quizId: classQ.id, content: 'Si 3x − 7 = 2x + 5, ¿cuál es el valor de x?', points: 1, order: 1 },
  });
  await p.quizOption.createMany({ data: [
    { questionId: cq2.id, content: 'x = 10', isCorrect: false, order: 0 },
    { questionId: cq2.id, content: 'x = 12', isCorrect: true, order: 1 },
    { questionId: cq2.id, content: 'x = 8', isCorrect: false, order: 2 },
    { questionId: cq2.id, content: 'x = 14', isCorrect: false, order: 3 },
  ]});
  const cq3 = await p.quizQuestion.create({
    data: { quizId: classQ.id, content: '¿Qué caracteriza a una buena estrategia de estudio?', points: 1, order: 2 },
  });
  await p.quizOption.createMany({ data: [
    { questionId: cq3.id, content: 'Memorizar sin entender', isCorrect: false, order: 0 },
    { questionId: cq3.id, content: 'Leer en voz alta constantemente', isCorrect: false, order: 1 },
    { questionId: cq3.id, content: 'Comprender, practicar y autoevaluar', isCorrect: true, order: 2 },
    { questionId: cq3.id, content: 'Estudiar sólo la noche antes', isCorrect: false, order: 3 },
  ]});
  console.log('✅ Aula: Quiz con 3 preguntas creado');

  // Resumen
  const course = await p.course.findUnique({ where: { id: courseId }, select: { slug: true } });
  console.log('\n══════════════ RESUMEN ══════════════');
  console.log('Curso slug:', course.slug);
  console.log('Aula ID:', classroomId);
  console.log('Todo listo para Juan Pérez (estudiante@acae.com)');
}

main()
  .catch(e => { console.error('ERROR:', e.message); })
  .finally(() => p.$disconnect());
