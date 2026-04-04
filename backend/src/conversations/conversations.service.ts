import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ConversationType } from '@prisma/client';

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  async create(
    voyageId: string,
    userId: string,
    companyId: string,
    data: { title: string; type: ConversationType },
  ) {
    const voyage = await this.prisma.voyage.findUnique({
      where: { id: voyageId },
    });
    if (!voyage) {
      throw new NotFoundException('Voyage not found');
    }
    if (voyage.companyId !== companyId) {
      throw new ForbiddenException('Cannot create conversations in this voyage');
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        voyageId,
        title: data.title,
        type: data.type,
        createdByUserId: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        voyageId,
        actorUserId: userId,
        eventType: 'CONVERSATION_CREATED',
        entityType: 'Conversation',
        entityId: conversation.id,
        metadataJson: { title: data.title, type: data.type },
      },
    });

    return conversation;
  }

  async findByVoyage(voyageId: string, companyId: string) {
    const voyage = await this.prisma.voyage.findUnique({
      where: { id: voyageId },
    });
    if (!voyage) {
      throw new NotFoundException('Voyage not found');
    }
    if (voyage.companyId !== companyId) {
      throw new ForbiddenException('Cannot access conversations in this voyage');
    }

    return this.prisma.conversation.findMany({
      where: { voyageId },
      orderBy: { updatedAt: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { messages: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            plainTextBody: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  async findOne(id: string, companyId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        voyage: {
          select: {
            id: true,
            voyageName: true,
            companyId: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { messages: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          where: { deletedAt: null },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (conversation.voyage.companyId !== companyId) {
      throw new ForbiddenException('Cannot access this conversation');
    }

    // Reverse messages so they are oldest-first for the client
    conversation.messages.reverse();

    return conversation;
  }

  async update(
    id: string,
    companyId: string,
    data: { title?: string; type?: ConversationType },
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        voyage: { select: { companyId: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (conversation.voyage.companyId !== companyId) {
      throw new ForbiddenException('Cannot modify this conversation');
    }

    return this.prisma.conversation.update({
      where: { id },
      data,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });
  }
}
