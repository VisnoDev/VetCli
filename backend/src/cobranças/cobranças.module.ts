import { Module } from '@nestjs/common';
import { CobrancasService } from './cobranças.service';
import { CobrancasController } from './cobranças.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CobrancasController],
  providers: [CobrancasService],
})
export class CobrancasModule {}
