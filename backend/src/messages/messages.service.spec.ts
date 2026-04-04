import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { PrismaService } from '../prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { MessageType, MessageSource } from '@prisma/client';

describe('MessagesService', () => {
  let service: MessagesService;
  let prisma: PrismaService;

  const mockAuthor = {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    avatarUrl: null,
  };

  const mockConversation = {
    id: 'conv-1',
    voyage: { id: 'voyage-1', companyId: 'company-1' },
  };

  const mockMessage = {
    id: 'msg-1',
    conversationId: 'conv-1',
    authorUserId: 'user-1',
    messageType: MessageType.USER_TEXT,
    plainTextBody: 'Hello world',
    richTextBody: null,
    source: MessageSource.APP,
    sentAt: new Date(),
    editedAt: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: mockAuthor,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: PrismaService,
          useValue: {
            conversation: {
              findUnique: jest.fn(),
            },
            message: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            voyage: {
              update: jest.fn(),
            },
            auditEvent: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: AnalyticsService,
          useValue: {
            track: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a message, audit event, and update voyage.updatedAt', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);
      (prisma.message.create as jest.Mock).mockResolvedValue(mockMessage);
      (prisma.voyage.update as jest.Mock).mockResolvedValue({});
      (prisma.auditEvent.create as jest.Mock).mockResolvedValue({});

      const result = await service.create('conv-1', 'user-1', 'company-1', {
        plainTextBody: 'Hello world',
      });

      expect(result).toEqual(mockMessage);

      expect(prisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          conversationId: 'conv-1',
          authorUserId: 'user-1',
          messageType: MessageType.USER_TEXT,
          plainTextBody: 'Hello world',
          source: MessageSource.APP,
        }),
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

      expect(prisma.voyage.update).toHaveBeenCalledWith({
        where: { id: 'voyage-1' },
        data: { updatedAt: expect.any(Date) },
      });

      expect(prisma.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          voyageId: 'voyage-1',
          actorUserId: 'user-1',
          eventType: 'MESSAGE_SENT',
          entityType: 'Message',
          entityId: 'msg-1',
        }),
      });
    });

    it('should throw NotFoundException when conversation does not exist', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create('conv-1', 'user-1', 'company-1', {
          plainTextBody: 'Hello',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when company does not match', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);

      await expect(
        service.create('conv-1', 'user-1', 'other-company', {
          plainTextBody: 'Hello',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByConversation', () => {
    it('should return paginated results', async () => {
      const conversation = {
        id: 'conv-1',
        voyage: { companyId: 'company-1' },
      };
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(conversation);

      const messages = [
        { ...mockMessage, id: 'msg-3' },
        { ...mockMessage, id: 'msg-2' },
        { ...mockMessage, id: 'msg-1' },
      ];
      (prisma.message.findMany as jest.Mock).mockResolvedValue(messages);

      const result = await service.findByConversation('conv-1', 'company-1', {
        limit: 50,
      });

      expect(result.data).toHaveLength(3);
      // Messages are reversed to be oldest-first
      expect(result.data[0].id).toBe('msg-1');
      expect(result.meta.hasMore).toBe(false);
      expect(result.meta.nextCursor).toBeNull();
    });

    it('should return hasMore=true and nextCursor when more results exist', async () => {
      const conversation = {
        id: 'conv-1',
        voyage: { companyId: 'company-1' },
      };
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(conversation);

      // Return limit+1 messages to indicate hasMore
      const messages = [
        { ...mockMessage, id: 'msg-3' },
        { ...mockMessage, id: 'msg-2' },
        { ...mockMessage, id: 'msg-1' },
      ];
      (prisma.message.findMany as jest.Mock).mockResolvedValue(messages);

      const result = await service.findByConversation('conv-1', 'company-1', {
        limit: 2,
      });

      expect(result.meta.hasMore).toBe(true);
      expect(result.meta.nextCursor).toBe('msg-2');
      expect(result.data).toHaveLength(2);
    });

    it('should throw NotFoundException when conversation not found', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findByConversation('conv-1', 'company-1', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when company does not match', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue({
        id: 'conv-1',
        voyage: { companyId: 'company-1' },
      });

      await expect(
        service.findByConversation('conv-1', 'other-company', {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should modify message text and set editedAt', async () => {
      const existingMessage = {
        ...mockMessage,
        conversation: {
          ...mockConversation,
          voyage: { companyId: 'company-1' },
        },
      };
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(existingMessage);

      const updatedMessage = {
        ...mockMessage,
        plainTextBody: 'Updated text',
        editedAt: new Date(),
      };
      (prisma.message.update as jest.Mock).mockResolvedValue(updatedMessage);

      const result = await service.update('msg-1', 'user-1', 'company-1', {
        plainTextBody: 'Updated text',
      });

      expect(result.plainTextBody).toBe('Updated text');
      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-1' },
        data: {
          plainTextBody: 'Updated text',
          richTextBody: undefined,
          editedAt: expect.any(Date),
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
    });

    it('should throw NotFoundException when message not found', async () => {
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('msg-1', 'user-1', 'company-1', {
          plainTextBody: 'Updated',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      const existingMessage = {
        ...mockMessage,
        authorUserId: 'other-user',
        conversation: {
          ...mockConversation,
          voyage: { companyId: 'company-1' },
        },
      };
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(existingMessage);

      await expect(
        service.update('msg-1', 'user-1', 'company-1', {
          plainTextBody: 'Updated',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when message is deleted', async () => {
      const existingMessage = {
        ...mockMessage,
        deletedAt: new Date(),
        conversation: {
          ...mockConversation,
          voyage: { companyId: 'company-1' },
        },
      };
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(existingMessage);

      await expect(
        service.update('msg-1', 'user-1', 'company-1', {
          plainTextBody: 'Updated',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt on the message', async () => {
      const existingMessage = {
        ...mockMessage,
        conversation: {
          ...mockConversation,
          voyage: { companyId: 'company-1' },
        },
      };
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(existingMessage);
      (prisma.message.update as jest.Mock).mockResolvedValue({
        ...mockMessage,
        deletedAt: new Date(),
      });

      const result = await service.softDelete('msg-1', 'user-1', 'company-1');

      expect(result).toEqual({ deleted: true });
      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException when message not found', async () => {
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.softDelete('msg-1', 'user-1', 'company-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      const existingMessage = {
        ...mockMessage,
        authorUserId: 'other-user',
        conversation: {
          ...mockConversation,
          voyage: { companyId: 'company-1' },
        },
      };
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(existingMessage);

      await expect(
        service.softDelete('msg-1', 'user-1', 'company-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when company does not match', async () => {
      const existingMessage = {
        ...mockMessage,
        conversation: {
          ...mockConversation,
          voyage: { companyId: 'company-1' },
        },
      };
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(existingMessage);

      await expect(
        service.softDelete('msg-1', 'user-1', 'other-company'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
