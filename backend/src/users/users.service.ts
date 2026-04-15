import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma.service';
import { UserRole } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const AVATAR_DIR = 'avatars';
const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

@Injectable()
export class UsersService {
  private readonly uploadRoot = path.resolve(process.cwd(), 'uploads');

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const dir = path.join(this.uploadRoot, AVATAR_DIR);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private publicBaseUrl(): string {
    return this.configService.get<string>('PUBLIC_API_URL', 'http://localhost:3011');
  }

  private extractAvatarFileNameFromUrl(avatarUrl: string | null): string | null {
    if (!avatarUrl) return null;
    const m = avatarUrl.match(/\/users\/avatar\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  private unlinkAvatarFile(fileName: string) {
    const safe = path.basename(fileName);
    const fp = path.join(this.uploadRoot, AVATAR_DIR, safe);
    if (fs.existsSync(fp)) {
      try {
        fs.unlinkSync(fp);
      } catch {
        // ignore
      }
    }
  }

  streamAvatarFile(fileName: string, res: Response) {
    const safe = path.basename(fileName);
    if (safe !== fileName || safe.includes('..')) {
      throw new NotFoundException('Not found');
    }
    const filePath = path.join(this.uploadRoot, AVATAR_DIR, safe);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Not found');
    }

    const ext = path.extname(safe).toLowerCase();
    const mime =
      ext === '.png'
        ? 'image/png'
        : ext === '.gif'
          ? 'image/gif'
          : ext === '.webp'
            ? 'image/webp'
            : 'image/jpeg';

    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(filePath);
  }

  async uploadAvatar(
    userId: string,
    companyId: string,
    file: Express.Multer.File,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Image file is required');
    }
    if (!ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
      throw new BadRequestException(
        'Only JPEG, PNG, GIF, and WebP images are allowed',
      );
    }

    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowedExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const useExt = allowedExt.includes(ext) ? ext : '.jpg';
    const storageName = `${uuidv4()}${useExt}`;
    const destPath = path.join(this.uploadRoot, AVATAR_DIR, storageName);
    fs.writeFileSync(destPath, file.buffer);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.companyId !== companyId) {
      try {
        fs.unlinkSync(destPath);
      } catch {
        // ignore
      }
      throw new ForbiddenException('Cannot update this profile');
    }

    const oldName = this.extractAvatarFileNameFromUrl(user.avatarUrl);
    if (oldName) {
      this.unlinkAvatarFile(oldName);
    }

    const base = this.publicBaseUrl().replace(/\/$/, '');
    const avatarUrl = `${base}/users/avatar/${encodeURIComponent(storageName)}`;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        avatarUrl: true,
        isActive: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        companyId: true,
      },
    });

    return updated;
  }

  async findByCompany(companyId: string) {
    const users = await this.prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        avatarUrl: true,
        isActive: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        companyId: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return users;
  }

  async findOne(id: string, requestingCompanyId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        avatarUrl: true,
        isActive: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        companyId: true,
        company: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.companyId !== requestingCompanyId) {
      throw new ForbiddenException('Cannot access users outside your company');
    }
    return user;
  }

  async update(
    id: string,
    requestingCompanyId: string,
    data: {
      firstName?: string;
      lastName?: string;
      jobTitle?: string;
      avatarUrl?: string;
      isActive?: boolean;
      role?: UserRole;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.companyId !== requestingCompanyId) {
      throw new ForbiddenException('Cannot modify users outside your company');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        avatarUrl: true,
        isActive: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        companyId: true,
      },
    });
    return updated;
  }

  async invite(
    companyId: string,
    data: {
      email: string;
      firstName: string;
      lastName: string;
      role: UserRole;
      jobTitle?: string;
    },
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const tempPassword = uuidv4().slice(0, 12);
    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 12);
    const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        jobTitle: data.jobTitle,
        passwordHash,
        companyId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        isActive: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        companyId: true,
      },
    });

    return { user, tempPassword };
  }
}
