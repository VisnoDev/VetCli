import { Module } from '@nestjs/common';
import { VacinacoesService } from './vacinacoes.service';
import { VacinacoesController } from './vacinacoes.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VacinacoesController],
  providers: [VacinacoesService],
})
export class VacinacoesModule {}
