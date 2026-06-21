import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Driver adapter (pg puro en JS) en vez del motor nativo Rust/Tokio: evita los
// panics ("timer has gone away") que ese runtime sufre bajo los límites de
// CPU/procesos de hosting compartido (CloudLinux LVE).
function createAdapter() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return new PrismaPg(pool);
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ adapter: createAdapter() });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Conexión a PostgreSQL establecida');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Conexión a PostgreSQL cerrada');
  }
}
