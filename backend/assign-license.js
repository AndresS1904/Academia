const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ACAE_ID = 'cmmya55wv000067np4e2oro9g';

async function run() {
  // 1. Crear producto QUESTION_BANK si no existe
  let product = await prisma.product.findFirst({ where: { type: 'QUESTION_BANK' } });
  if (!product) {
    product = await prisma.product.create({
      data: {
        name: 'Banco de Preguntas Global',
        description: 'Acceso al banco de preguntas globales para generación de simulacros',
        type: 'QUESTION_BANK',
        price: 0,
        currency: 'COP',
        isActive: true,
      },
    });
    console.log('Producto creado:', product.name, '|', product.id);
  } else {
    console.log('Producto ya existe:', product.name, '|', product.id);
  }

  // 2. Verificar si ACAE ya tiene licencia activa
  const existing = await prisma.license.findFirst({
    where: { schoolId: ACAE_ID, productId: product.id, status: 'ACTIVE' },
  });
  if (existing) {
    console.log('ACAE ya tiene licencia activa para este producto:', existing.id);
    await prisma.$disconnect();
    return;
  }

  // 3. Crear licencia sin fecha de vencimiento (permanente)
  const license = await prisma.license.create({
    data: {
      schoolId: ACAE_ID,
      productId: product.id,
      status: 'ACTIVE',
      notes: 'Licencia full asignada manualmente — banco de preguntas global',
    },
  });
  console.log('Licencia creada para ACAE:', license.id);
  console.log('Estado:', license.status, '| Sin vencimiento');

  await prisma.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
