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
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MessageType } from '@prisma/client';

class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  plainTextBody!: string;

  @IsOptional()
  @IsString()
  richTextBody?: string;

  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;
}

class UpdateMessageDto {
  @IsString()
  @IsNotEmpty()
  plainTextBody!: string;

  @IsOptional()
  @IsString()
  richTextBody?: string;
}

@Controller()
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Post('conversations/:conversationId/messages')
  create(
    @Param('conversationId') conversationId: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.messagesService.create(conversationId, user.sub, user.companyId, {
      plainTextBody: dto.plainTextBody,
      richTextBody: dto.richTextBody,
      messageType: dto.messageType,
    });
  }

  @Get('conversations/:conversationId/messages')
  findByConversation(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: JwtPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.messagesService.findByConversation(
      conversationId,
      user.companyId,
      { cursor, limit },
    );
  }

  @Patch('messages/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMessageDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.messagesService.update(id, user.sub, user.companyId, {
      plainTextBody: dto.plainTextBody,
      richTextBody: dto.richTextBody,
    });
  }

  @Delete('messages/:id')
  delete(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.messagesService.softDelete(id, user.sub, user.companyId);
  }
}
