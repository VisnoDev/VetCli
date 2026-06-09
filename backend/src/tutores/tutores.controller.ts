import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TutoresService } from './tutores.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CreateTutorDto } from './dto/create-tutor.dto';
import { UpdateTutorDto } from './dto/update-tutor.dto';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('tutores')
export class TutoresController {
  constructor(private tutoresService: TutoresService) {}

  @RequirePermissions('tutores:read')
  @Get()
  findAll(@Request() req: any, @Query('search') search?: string) {
    return this.tutoresService.findAll(req.user.clinicaId, search);
  }

  @RequirePermissions('tutores:read')
  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.tutoresService.findOne(id, req.user.clinicaId);
  }

  @RequirePermissions('tutores:write')
  @Post()
  create(@Request() req: any, @Body() body: CreateTutorDto) {
    return this.tutoresService.create(req.user.clinicaId, body);
  }

  @RequirePermissions('tutores:write')
  @Put(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() body: UpdateTutorDto) {
    return this.tutoresService.update(id, req.user.clinicaId, body);
  }

  @RequirePermissions('tutores:write')
  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.tutoresService.remove(id, req.user.clinicaId);
  }
}
