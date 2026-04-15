import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ChatAttachmentKind, ChatType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ChatsService {
  private readonly uploadDir = path.resolve(process.cwd(), 'uploads');

  constructor(private prisma: PrismaService) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  private readonly memberSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    avatarUrl: true,
  };

  private readonly attachmentSelect = {
    id: true,
    kind: true,
    originalFilename: true,
    mimeType: true,
    fileSizeBytes: true,
  };

  private lastMessageInclude = {
    orderBy: { sentAt: 'desc' as const },
    take: 1,
    include: {
      sender: { select: this.memberSelect },
      attachments: { select: this.attachmentSelect },
    },
  };

  private classifyKind(mime: string): ChatAttachmentKind {
    if (mime.startsWith('image/')) return ChatAttachmentKind.IMAGE;
    if (mime.startsWith('video/')) return ChatAttachmentKind.VIDEO;
    return ChatAttachmentKind.DOCUMENT;
  }

  async createDirect(userId: string, companyId: string, otherUserId: string) {
    if (userId === otherUserId) {
      throw new BadRequestException('Cannot create a chat with yourself');
    }

    const otherUser = await this.prisma.user.findFirst({
      where: { id: otherUserId, companyId },
    });
    if (!otherUser) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.prisma.chat.findFirst({
      where: {
        companyId,
        chatType: ChatType.DIRECT,
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: otherUserId } } },
        ],
      },
      include: {
        members: { include: { user: { select: this.memberSelect } } },
        messages: this.lastMessageInclude,
      },
    });

    if (existing) return this.formatChat(existing, userId);

    const chat = await this.prisma.chat.create({
      data: {
        companyId,
        chatType: ChatType.DIRECT,
        createdById: userId,
        members: {
          create: [{ userId }, { userId: otherUserId }],
        },
      },
      include: {
        members: { include: { user: { select: this.memberSelect } } },
        messages: this.lastMessageInclude,
      },
    });

    return this.formatChat(chat, userId);
  }

  async createGroup(
    userId: string,
    companyId: string,
    data: { name: string; memberIds: string[] },
  ) {
    const uniqueIds = [...new Set([userId, ...data.memberIds])];

    const users = await this.prisma.user.findMany({
      where: { id: { in: uniqueIds }, companyId },
      select: { id: true },
    });
    if (users.length !== uniqueIds.length) {
      throw new BadRequestException('One or more users not found');
    }

    const chat = await this.prisma.chat.create({
      data: {
        companyId,
        chatType: ChatType.GROUP,
        name: data.name,
        createdById: userId,
        members: {
          create: uniqueIds.map((id) => ({
            userId: id,
            isAdmin: id === userId,
          })),
        },
      },
      include: {
        members: { include: { user: { select: this.memberSelect } } },
        messages: this.lastMessageInclude,
      },
    });

    return this.formatChat(chat, userId);
  }

  async listChats(userId: string) {
    const chats = await this.prisma.chat.findMany({
      where: {
        members: { some: { userId, leftAt: null } },
      },
      include: {
        members: {
          where: { leftAt: null },
          include: { user: { select: this.memberSelect } },
        },
        messages: this.lastMessageInclude,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return chats.map((c) => this.formatChat(c, userId));
  }

  async getChat(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findFirst({
      where: {
        id: chatId,
        members: { some: { userId, leftAt: null } },
      },
      include: {
        members: {
          where: { leftAt: null },
          include: { user: { select: this.memberSelect } },
        },
        messages: this.lastMessageInclude,
      },
    });

    if (!chat) throw new NotFoundException('Chat not found');
    return this.formatChat(chat, userId);
  }

  async getMessages(
    chatId: string,
    userId: string,
    options: { cursor?: string; limit?: number },
  ) {
    const isMember = await this.prisma.chatMember.findFirst({
      where: { chatId, userId, leftAt: null },
    });
    if (!isMember) throw new ForbiddenException('Not a member of this chat');

    const limit = options.limit || 50;

    const where: Record<string, unknown> = {
      chatId,
    };
    if (options.cursor) {
      where.sentAt = { lt: new Date(options.cursor as string) };
    }

    const messages = await this.prisma.chatMessage.findMany({
      where,
      take: limit + 1,
      orderBy: { sentAt: 'desc' },
      include: {
        sender: { select: this.memberSelect },
        attachments: { select: this.attachmentSelect },
      },
    });

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    return {
      data: messages.reverse().map((m) => this.toMessageDto(m)),
      meta: {
        hasMore,
        nextCursor: hasMore ? messages[0]?.sentAt?.toISOString() : null,
      },
    };
  }

  async deleteMessage(chatId: string, messageId: string, userId: string) {
    const message = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, chatId },
      include: { attachments: true },
    });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderUserId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }
    if (message.deletedAt) {
      throw new BadRequestException('Message already deleted');
    }

    const isMember = await this.prisma.chatMember.findFirst({
      where: { chatId, userId, leftAt: null },
    });
    if (!isMember) throw new ForbiddenException('Not a member of this chat');

    await this.prisma.$transaction(async (tx) => {
      for (const a of message.attachments) {
        const fp = path.join(this.uploadDir, a.storageKey);
        if (fs.existsSync(fp)) {
          try {
            fs.unlinkSync(fp);
          } catch {
            // ignore disk errors
          }
        }
      }
      await tx.chatMessageAttachment.deleteMany({
        where: { chatMessageId: messageId },
      });
      await tx.chatMessage.update({
        where: { id: messageId },
        data: {
          deletedAt: new Date(),
          body: '',
        },
      });
      await tx.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      });
    });

    const updated = await this.prisma.chatMessage.findUniqueOrThrow({
      where: { id: messageId },
      include: {
        sender: { select: this.memberSelect },
        attachments: { select: this.attachmentSelect },
      },
    });

    return this.toMessageDto(updated);
  }

  private toMessageDto(m: {
    id: string;
    chatId: string;
    senderUserId: string;
    body: string;
    sentAt: Date;
    editedAt: Date | null;
    deletedAt: Date | null;
    sender: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      avatarUrl: string | null;
    };
    attachments: Array<{
      id: string;
      kind: ChatAttachmentKind;
      originalFilename: string;
      mimeType: string;
      fileSizeBytes: number;
    }>;
  }) {
    if (m.deletedAt) {
      return {
        id: m.id,
        chatId: m.chatId,
        senderUserId: m.senderUserId,
        body: '',
        sentAt: m.sentAt,
        editedAt: m.editedAt,
        deletedAt: m.deletedAt,
        sender: m.sender,
        attachments: [] as typeof m.attachments,
      };
    }
    return {
      ...m,
      deletedAt: null,
    };
  }

  async sendMessage(chatId: string, userId: string, body: string) {
    const isMember = await this.prisma.chatMember.findFirst({
      where: { chatId, userId, leftAt: null },
    });
    if (!isMember) throw new ForbiddenException('Not a member of this chat');

    const [message] = await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: { chatId, senderUserId: userId, body },
        include: {
          sender: { select: this.memberSelect },
          attachments: { select: this.attachmentSelect },
        },
      }),
      this.prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return this.toMessageDto(message);
  }

  async sendMessageWithMedia(
    chatId: string,
    userId: string,
    file: Express.Multer.File,
    caption?: string,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File is required');
    }

    const isMember = await this.prisma.chatMember.findFirst({
      where: { chatId, userId, leftAt: null },
    });
    if (!isMember) throw new ForbiddenException('Not a member of this chat');

    const kind = this.classifyKind(file.mimetype);
    const safeName = path.basename(file.originalname || 'file').replace(
      /[^a-zA-Z0-9._-]/g,
      '_',
    );
    const storageKey = `${uuidv4()}-${safeName}`;
    const destPath = path.join(this.uploadDir, storageKey);
    fs.writeFileSync(destPath, file.buffer);

    const textBody = caption?.trim() ?? '';

    const [message] = await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: {
          chatId,
          senderUserId: userId,
          body: textBody,
          attachments: {
            create: [
              {
                kind,
                originalFilename: file.originalname || safeName,
                mimeType: file.mimetype || 'application/octet-stream',
                fileSizeBytes: file.size,
                storageKey,
              },
            ],
          },
        },
        include: {
          sender: { select: this.memberSelect },
          attachments: { select: this.attachmentSelect },
        },
      }),
      this.prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return this.toMessageDto(message);
  }

  private async assertAttachmentAccess(attachmentId: string, userId: string) {
    const att = await this.prisma.chatMessageAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        message: { select: { chatId: true } },
      },
    });
    if (!att) throw new NotFoundException('Attachment not found');

    const member = await this.prisma.chatMember.findFirst({
      where: {
        chatId: att.message.chatId,
        userId,
        leftAt: null,
      },
    });
    if (!member) throw new ForbiddenException('Cannot access this file');

    return att;
  }

  async getAttachmentDiskPath(attachmentId: string, userId: string) {
    const att = await this.assertAttachmentAccess(attachmentId, userId);
    const filePath = path.join(this.uploadDir, att.storageKey);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found on disk');
    }
    return { filePath, attachment: att };
  }

  async markRead(chatId: string, userId: string) {
    await this.prisma.chatMember.updateMany({
      where: { chatId, userId },
      data: { lastReadAt: new Date() },
    });
    return { ok: true };
  }

  private previewLineForMessage(msg: {
    body: string;
    deletedAt?: Date | null;
    attachments?: { kind: string; originalFilename: string }[];
  }): string {
    if (msg.deletedAt) return 'Message deleted';
    if (msg.body?.trim()) return msg.body.trim();
    const atts = msg.attachments ?? [];
    if (atts.length === 0) return '';
    if (atts.length > 1) {
      return `${this.attachmentKindLabel(atts[0].kind)} (${atts.length} files)`;
    }
    return this.attachmentKindLabel(atts[0].kind, atts[0].originalFilename);
  }

  private attachmentKindLabel(kind: string, filename?: string): string {
    switch (kind) {
      case 'IMAGE':
        return '📷 Photo';
      case 'VIDEO':
        return '🎬 Video';
      default:
        return filename ? `📎 ${filename}` : '📎 File';
    }
  }

  private formatChat(chat: {
    id: string;
    chatType: string;
    name: string | null;
    avatarUrl: string | null;
    members: Array<{ user: { id: string; firstName: string; lastName: string; email: string; avatarUrl: string | null } }>;
    messages: Array<{
      id: string;
      body: string;
      sentAt: Date;
      deletedAt?: Date | null;
      sender: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl: string | null;
      };
      attachments?: Array<{
        id: string;
        kind: string;
        originalFilename: string;
        mimeType: string;
        fileSizeBytes: number;
      }>;
    }>;
    createdAt: Date;
    updatedAt: Date;
  }, currentUserId: string) {
    const members = chat.members.map((m) => m.user);
    let displayName = chat.name;
    let avatarUrl = chat.avatarUrl;

    if (chat.chatType === 'DIRECT') {
      const other = chat.members.find(
        (m) => m.user.id !== currentUserId,
      );
      if (other) {
        displayName = `${other.user.firstName} ${other.user.lastName}`;
        avatarUrl = other.user.avatarUrl;
      }
    }

    const lastMessage = chat.messages?.[0] || null;

    return {
      id: chat.id,
      chatType: chat.chatType,
      name: displayName,
      avatarUrl,
      members,
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            body: lastMessage.deletedAt ? '' : lastMessage.body,
            preview: this.previewLineForMessage(lastMessage),
            deletedAt: lastMessage.deletedAt ?? null,
            attachments: lastMessage.deletedAt
              ? []
              : (lastMessage.attachments ?? []).map((a) => ({
                  id: a.id,
                  kind: a.kind,
                  originalFilename: a.originalFilename,
                })),
            sentAt: lastMessage.sentAt,
            sender: lastMessage.sender,
          }
        : null,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
  }
}
