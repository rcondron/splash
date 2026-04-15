import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ChatsService } from './chats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import {
  IsArray,
  IsNotEmpty,
  IsString,
  ArrayMinSize,
} from 'class-validator';

class CreateDirectChatDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}

class CreateGroupChatDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  memberIds!: string[];
}

class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  body!: string;
}

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatsController {
  constructor(private chatsService: ChatsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.chatsService.listChats(user.sub);
  }

  @Post('direct')
  createDirect(
    @Body() dto: CreateDirectChatDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.chatsService.createDirect(user.sub, user.companyId, dto.userId);
  }

  @Post('group')
  createGroup(
    @Body() dto: CreateGroupChatDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.chatsService.createGroup(user.sub, user.companyId, {
      name: dto.name,
      memberIds: dto.memberIds,
    });
  }

  @Get('attachments/:attachmentId/download')
  async downloadAttachment(
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const { filePath, attachment } =
      await this.chatsService.getAttachmentDiskPath(attachmentId, user.sub);
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(attachment.originalFilename)}"`,
    );
    res.sendFile(filePath);
  }

  @Get(':id')
  getChat(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.chatsService.getChat(id, user.sub);
  }

  @Get(':id/messages')
  getMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.chatsService.getMessages(id, user.sub, { cursor, limit });
  }

  @Delete(':id/messages/:messageId')
  deleteMessage(
    @Param('id', ParseUUIDPipe) chatId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.chatsService.deleteMessage(chatId, messageId, user.sub);
  }

  @Post(':id/messages/media')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  sendMedia(
    @Param('id', ParseUUIDPipe) chatId: string,
    @Body('caption') caption: string | undefined,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.chatsService.sendMessageWithMedia(chatId, user.sub, file, caption);
  }

  @Post(':id/messages')
  sendMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.chatsService.sendMessage(id, user.sub, dto.body);
  }

  @Post(':id/read')
  markRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.chatsService.markRead(id, user.sub);
  }
}
