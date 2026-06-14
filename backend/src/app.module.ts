import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { TutoresModule } from './tutores/tutores.module';
import { PacientesModule } from './pacientes/pacientes.module';
import { PrescricoesModule } from './prescricoes/prescricoes.module';
import { AgendamentosModule } from './agendamentos/agendamentos.module';
import { EstoqueModule } from './estoque/estoque.module';
import { ClinicasModule } from './clinicas/clinicas.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LaboratorioModule } from './laboratorio/laboratorio.module';
import { AtendimentosModule } from './atendimentos/atendimentos.module';
import { VacinacoesModule } from './vacinacoes/vacinacoes.module';
import { CobrancasModule } from './cobranças/cobranças.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        // Em dev: log colorido e legível. Em prod: JSON estruturado (uma linha).
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: { singleLine: true, translateTime: 'SYS:HH:MM:ss' },
              },
        genReqId: (req, res) => {
          const id = randomUUID();
          res.setHeader('X-Request-Id', id);
          return id;
        },
        // Anexa contexto do usuário autenticado a cada log de requisição.
        customProps: (req: any) => ({
          userId: req.user?.id,
          clinicaId: req.user?.clinicaId,
        }),
        // Não loga headers (evita vazar cookie/authorization). Só o essencial.
        serializers: {
          req: (req: any) => ({ id: req.id, method: req.method, url: req.url }),
          res: (res: any) => ({ statusCode: res.statusCode }),
        },
        redact: {
          paths: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
          remove: true,
        },
        // Health check é chamado o tempo todo por monitoramento — não polui o log.
        autoLogging: {
          ignore: (req: any) => req.url === '/api/health',
        },
      },
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    CommonModule,
    AuditModule,
    HealthModule,
    AuthModule,
    UsuariosModule,
    TutoresModule,
    PacientesModule,
    AtendimentosModule,
    VacinacoesModule,
    PrescricoesModule,
    AgendamentosModule,
    EstoqueModule,
    ClinicasModule,
    DashboardModule,
    LaboratorioModule,
    CobrancasModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
