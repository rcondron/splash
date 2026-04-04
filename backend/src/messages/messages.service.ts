import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MessageType, MessageSource } from '@prisma/client';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async create(
    conversationId: string,
    userId: string,
    companyId: string,
    data: {
      plainTextBody: string;
      richTextBody?: string;
      messageType?: MessageType;
    },
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        voyage: { select: { id: true, companyId: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (conversation.voyage.companyId !== companyId) {
      throw new ForbiddenException('Cannot send messages in this conversation');
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        authorUserId: userId,
        messageType: data.messageType || MessageType.USER_TEXT,
        plainTextBody: data.plainTextBody,
        richTextBody: data.richTextBody,
        source: MessageSource.APP,
        sentAt: new Date(),
      },
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
    });

    // Update voyage updatedAt to reflect new activity
    await this.prisma.voyage.update({
      where: { id: conversation.voyage.id },
      data: { updatedAt: new Date() },
    });

    // Create audit event for message creation
    await this.prisma.auditEvent.create({
      data: {
        voyageId: conversation.voyage.id,
        actorUserId: userId,
        eventType: 'MESSAGE_SENT',
        entityType: 'Message',
        entityId: message.id,
        metadataJson: {
          conversationId,
          messageType: message.messageType,
        },
      },
    });

    return message;
  }

  async findByConversation(
    conversationId: string,
    companyId: string,
    options: {
      cursor?: string;
      limit?: number;
    },
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        voyage: { select: { companyId: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (conversation.voyage.companyId !== companyId) {
      throw new ForbiddenException(
        'Cannot access messages in this conversation',
      );
    }

    const limit = options.limit || 50;

    const where: {
      conversationId: string;
      deletedAt: null;
      id?: { lt: string };
    } = {
      conversationId,
      deletedAt: null,
    };

    if (options.cursor) {
      where.id = { lt: options.cursor };
    }

    const messages = await this.prisma.message.findMany({
      where,
      take: limit + 1, // fetch one extra to determine hasMore
      orderBy: { createdAt: 'desc' },
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
        fileAttachments: {
          select: {
            id: true,
            originalFilename: true,
            mimeType: true,
            fileSizeBytes: true,
          },
        },
      },
    });

    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop();
    }

    const nextCursor = hasMore ? messages[messages.length - 1].id : null;

    return {
      data: messages.reverse(), // return oldest-first
      meta: {
        hasMore,
        nextCursor,
      },
    };
  }

  async update(
    id: string,
    userId: string,
    companyId: string,
    data: { plainTextBody: string; richTextBody?: string },
  ) {
    const message = await this.prisma.message.findUnique({
      where: { id },
      include: {
        conversation: {
          include: {
            voyage: { select: { companyId: true } },
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (message.conversation.voyage.companyId !== companyId) {
      throw new ForbiddenException('Cannot edit this message');
    }
    if (message.authorUserId !== userId) {
      throw new ForbiddenException('Can only edit your own messages');
    }
    if (message.deletedAt) {
      throw new NotFoundException('Message has been deleted');
    }

    return this.prisma.message.update({
      where: { id },
      data: {
        plainTextBody: data.plainTextBody,
        richTextBody: data.richTextBody,
        editedAt: new Date(),
      },
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
    });
  }

  async softDelete(id: string, userId: string, companyId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id },
      include: {
        conversation: {
          include: {
            voyage: { select: { companyId: true } },
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (message.conversation.voyage.companyId !== companyId) {
      throw new ForbiddenException('Cannot delete this message');
    }
    if (message.authorUserId !== userId) {
      throw new ForbiddenException('Can only delete your own messages');
    }

    await this.prisma.message.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { deleted: true };
  }
}
