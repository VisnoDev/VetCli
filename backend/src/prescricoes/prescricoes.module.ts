import { Module } from '@nestjs/common';
import { PrescricoesService } from './prescricoes.service';
import { PrescricoesController } from './prescricoes.controller';

@Module({
  controllers: [PrescricoesController],
  providers: [PrescricoesService],
  exports: [PrescricoesService],
})
export class PrescricoesModule {}
