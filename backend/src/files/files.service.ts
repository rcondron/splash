import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FilesService {
  private readonly uploadDir = path.resolve(process.cwd(), 'uploads');

  constructor(private readonly prisma: PrismaService) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(
    voyageId: string,
    file: Express.Multer.File,
    user: JwtPayload,
    conversationId?: string,
    messageId?: string,
  ) {
    const storageKey = `${uuidv4()}-${file.originalname}`;
    const destPath = path.join(this.uploadDir, storageKey);
    fs.writeFileSync(destPath, file.buffer);

    return this.prisma.fileAttachment.create({
      data: {
        voyageId,
        conversationId: conversationId || null,
        messageId: messageId || null,
        uploadedByUserId: user.sub,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
        storageKey,
      },
    });
  }

  async findByVoyage(voyageId: string) {
    return this.prisma.fileAttachment.findMany({
      where: { voyageId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async findById(id: string) {
    const file = await this.prisma.fileAttachment.findUnique({
      where: { id },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    return file;
  }

  async getFilePath(id: string): Promise<{ filePath: string; file: any }> {
    const file = await this.findById(id);
    const filePath = path.join(this.uploadDir, file.storageKey);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found on disk');
    }
    return { filePath, file };
  }

  async delete(id: string, user: JwtPayload) {
    const file = await this.findById(id);

    if (file.uploadedByUserId !== user.sub && user.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('You can only delete your own files');
    }

    const filePath = path.join(this.uploadDir, file.storageKey);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return this.prisma.fileAttachment.delete({ where: { id } });
  }
}
