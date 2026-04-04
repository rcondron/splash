import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VoyagesService } from './voyages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateVoyageDto } from './dto/create-voyage.dto';
import { UpdateVoyageDto } from './dto/update-voyage.dto';
import { VoyageStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ParticipantRole } from '@prisma/client';

class AddParticipantDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsEnum(ParticipantRole)
  role!: ParticipantRole;
}

@Controller('voyages')
@UseGuards(JwtAuthGuard)
export class VoyagesController {
  constructor(private voyagesService: VoyagesService) {}

  @Post()
  create(
    @Body() dto: CreateVoyageDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.voyagesService.create(user.companyId, user.sub, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: VoyageStatus,
    @Query('search') search?: string,
    @Query('vesselName') vesselName?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.voyagesService.findAll(user.companyId, {
      status,
      search,
      vesselName,
      page,
      limit,
    });
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.voyagesService.findOne(id, user.companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVoyageDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.voyagesService.update(id, user.companyId, user.sub, dto);
  }

  @Delete(':id')
  archive(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.voyagesService.archive(id, user.companyId, user.sub);
  }

  @Post(':id/participants')
  addParticipant(
    @Param('id') id: string,
    @Body() dto: AddParticipantDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.voyagesService.addParticipant(id, user.companyId, {
      userId: dto.userId,
      role: dto.role,
    });
  }

  @Delete(':id/participants/:userId')
  removeParticipant(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.voyagesService.removeParticipant(id, userId, user.companyId);
  }
}
