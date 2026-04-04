import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface ConnectEmailDto {
  provider: string;
  emailAddress: string;
  accessToken: string;
  refreshToken: string;
}

export interface ImportEmailDto {
  from: string;
  to: string[];
  subject: string;
  body: string;
  sentAt: string;
}

@Injectable()
export class EmailIntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async connect(dto: ConnectEmailDto, userId: string) {
    // V1 stub: store the integration account record
    // In production, this would handle OAuth flows
    return this.prisma.emailIntegrationAccount.create({
      data: {
        userId,
        provider: dto.provider,
        emailAddress: dto.emailAddress,
        accessTokenEncrypted: dto.accessToken, // V1: stored as-is; production would encrypt
        refreshTokenEncrypted: dto.refreshToken,
        syncStatus: 'active',
      },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.emailIntegrationAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        provider: true,
        emailAddress: true,
        syncStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async importEmail(voyageId: string, dto: ImportEmailDto, userId: string) {
    // Find or create a placeholder email integration account for manual imports
    let account = await this.prisma.emailIntegrationAccount.findFirst({
      where: { userId, provider: 'manual' },
    });

    if (!account) {
      account = await this.prisma.emailIntegrationAccount.create({
        data: {
          userId,
          provider: 'manual',
          emailAddress: 'manual-import',
          accessTokenEncrypted: '',
          refreshTokenEncrypted: '',
          syncStatus: 'active',
        },
      });
    }

    return this.prisma.importedEmail.create({
      data: {
        voyageId,
        emailIntegrationAccountId: account.id,
        fromAddress: dto.from,
        toAddressesJson: dto.to,
        subject: dto.subject,
        bodyText: dto.body,
        sentAt: new Date(dto.sentAt),
      },
    });
  }

  async findEmailsByVoyage(voyageId: string) {
    return this.prisma.importedEmail.findMany({
      where: { voyageId },
      orderBy: { sentAt: 'desc' },
      select: {
        id: true,
        fromAddress: true,
        toAddressesJson: true,
        ccAddressesJson: true,
        subject: true,
        bodyText: true,
        sentAt: true,
        createdAt: true,
        emailIntegrationAccount: {
          select: {
            id: true,
            provider: true,
            emailAddress: true,
          },
        },
      },
    });
  }
}
