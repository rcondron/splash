import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { UserRole } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

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
