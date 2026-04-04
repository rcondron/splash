import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { FilesService } from './files.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('voyages/:voyageId/files')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  )
  async upload(
    @Param('voyageId', ParseUUIDPipe) voyageId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
    @Query('conversationId') conversationId?: string,
    @Query('messageId') messageId?: string,
  ) {
    return this.filesService.upload(voyageId, file, user, conversationId, messageId);
  }

  @Get('voyages/:voyageId/files')
  async list(@Param('voyageId', ParseUUIDPipe) voyageId: string) {
    return this.filesService.findByVoyage(voyageId);
  }

  @Get('files/:id/download')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { filePath, file } = await this.filesService.getFilePath(id);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.originalFilename}"`,
    );
    res.sendFile(filePath);
  }

  @Delete('files/:id')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.filesService.delete(id, user);
  }
}
