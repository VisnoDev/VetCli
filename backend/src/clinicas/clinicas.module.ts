import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { ClinicasService } from './clinicas.service';
import { ClinicasController } from './clinicas.controller';

@Module({
  controllers: [ClinicasController],
  providers: [ClinicasService, RolesGuard],
})
export class ClinicasModule {}
