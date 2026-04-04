import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ConversationType } from '@prisma/client';

class CreateConversationDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsEnum(ConversationType)
  type!: ConversationType;
}

class UpdateConversationDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(ConversationType)
  type?: ConversationType;
}

@Controller()
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @Post('voyages/:voyageId/conversations')
  create(
    @Param('voyageId') voyageId: string,
    @Body() dto: CreateConversationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.conversationsService.create(voyageId, user.sub, user.companyId, {
      title: dto.title,
      type: dto.type,
    });
  }

  @Get('voyages/:voyageId/conversations')
  findByVoyage(
    @Param('voyageId') voyageId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.conversationsService.findByVoyage(voyageId, user.companyId);
  }

  @Get('conversations/:id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.conversationsService.findOne(id, user.companyId);
  }

  @Patch('conversations/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.conversationsService.update(id, user.companyId, dto);
  }
}
