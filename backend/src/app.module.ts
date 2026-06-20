import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { APP_GUARD } from '@nestjs/core';
import * as Joi from 'joi';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CoursesModule } from './modules/courses/courses.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { SiteContentModule } from './modules/site-content/site-content.module';
import { NewsletterModule } from './modules/newsletter/newsletter.module';
import { LeadsModule } from './modules/leads/leads.module';
import { SimulacrosModule } from './modules/simulacros/simulacros.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { ProgressModule } from './modules/progress/progress.module';
import { EmailModule } from './modules/email/email.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { ProductsModule } from './modules/products/products.module';
import { LicensesModule } from './modules/licenses/licenses.module';
import { AccessModule } from './modules/access/access.module';
import { GroupsModule } from './modules/groups/groups.module';
import { AntiFraudModule } from './modules/anti-fraud/anti-fraud.module';
import { QuestionTagsModule } from './modules/question-tags/question-tags.module';
import { SimulacroGeneratorModule } from './modules/simulacro-generator/simulacro-generator.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ClassroomsModule } from './modules/classrooms/classrooms.module';

const IS_PROD = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL:  Joi.string().required(),
        JWT_SECRET:    Joi.string().min(32).required(),
        FRONTEND_URL:  Joi.string().uri().required(),
        NODE_ENV:      Joi.string().valid('development', 'production', 'test').default('development'),
        PORT:          Joi.number().default(3001),
        JWT_EXPIRES_IN: Joi.string().default('7d'),
        APP_URL:       Joi.string().default('http://localhost:3001'),
        SMTP_HOST:          Joi.string().optional(),
        SMTP_PORT:          Joi.number().default(587),
        SMTP_SECURE:        Joi.string().optional(),
        SMTP_USER:          Joi.string().optional(),
        SMTP_PASS:          Joi.string().optional(),
        SMTP_FROM:          Joi.string().email().optional(),
        ENABLE_EMAIL_TEST:  Joi.string().valid('true', 'false').default('false'),
      }),
      validationOptions: { abortEarly: false },
    }),

    LoggerModule.forRoot({
      pinoHttp: {
        level: IS_PROD ? 'info' : 'debug',
        transport: IS_PROD ? undefined : { target: 'pino-pretty', options: { colorize: true, singleLine: true } },
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        serializers: {
          req(req) { return { method: req.method, url: req.url, ip: req.socket?.remoteAddress }; },
          res(res) { return { statusCode: res.statusCode }; },
        },
      },
    }),

    ScheduleModule.forRoot(),

    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 60,
      },
    ]),

    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    LessonsModule,
    ResourcesModule,
    EnrollmentsModule,
    UploadsModule,
    SiteContentModule,
    NewsletterModule,
    LeadsModule,
    SimulacrosModule,
    QuestionsModule,
    ProgressModule,
    EmailModule,
    SchoolsModule,
    ProductsModule,
    LicensesModule,
    AccessModule,
    GroupsModule,
    AntiFraudModule,
    QuestionTagsModule,
    SimulacroGeneratorModule,
    AnalyticsModule,
    ClassroomsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
