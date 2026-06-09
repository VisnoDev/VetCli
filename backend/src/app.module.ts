import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
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
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    CommonModule,
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
