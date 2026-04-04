import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { PrismaService } from '../prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';

describe('MessagesService', () => {
  let service: MessagesService;
  let prisma: PrismaService;

  const mockConversation = {
    id: 'conv-1',
    title: 'Test Conversation',
    voyageId: 'voyage-1',
    voyage: { id: 'voyage-1', companyId: 'company-1' },
  };

  const mockMessage = {
    id: 'msg-1',
    conversationId: 'conv-1',
    authorUserId: 'user-1',
    messageType: 'USER_TEXT',
    plainTextBody: 'Hello world',
    richTextBody: null,
    source: 'APP',
    sentAt: new Date('2025-06-01T12:00:00Z'),
    createdAt: new Date('2025-06-01T12:00:00Z'),
    editedAt: null,
    deletedAt: null,
    author: {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      avatarUrl: null,
    },
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
              update: jest.fn().mockResolvedValue({}),
            },
            auditEvent: {
              create: jest.fn().mockResolvedValue({}),
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
    it('should create message and audit event', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(
        mockConversation,
      );
      (prisma.message.create as jest.Mock).mockResolvedValue(mockMessage);

      const result = await service.create('conv-1', 'user-1', 'company-1', {
        plainTextBody: 'Hello world',
      });

      expect(result).toEqual(mockMessage);
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          conversationId: 'conv-1',
          authorUserId: 'user-1',
          messageType: 'USER_TEXT',
          plainTextBody: 'Hello world',
          source: 'APP',
        }),
        include: expect.objectContaining({
          author: expect.any(Object),
        }),
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

    it('should update voyage updatedAt', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(
        mockConversation,
      );
      (prisma.message.create as jest.Mock).mockResolvedValue(mockMessage);

      await service.create('conv-1', 'user-1', 'company-1', {
        plainTextBody: 'Hello world',
      });

      expect(prisma.voyage.update).toHaveBeenCalledWith({
        where: { id: 'voyage-1' },
        data: { updatedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException if conversation not found', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create('nonexistent', 'user-1', 'company-1', {
          plainTextBody: 'Hello',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if company does not match', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(
        mockConversation,
      );

      await expect(
        service.create('conv-1', 'user-1', 'other-company', {
          plainTextBody: 'Hello',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByConversation', () => {
    it('should return paginated messages', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(
        mockConversation,
      );

      const messages = [
        { ...mockMessage, id: 'msg-3', fileAttachments: [] },
        { ...mockMessage, id: 'msg-2', fileAttachments: [] },
        { ...mockMessage, id: 'msg-1', fileAttachments: [] },
      ];
      (prisma.message.findMany as jest.Mock).mockResolvedValue(messages);

      const result = await service.findByConversation(
        'conv-1',
        'company-1',
        { limit: 50 },
      );

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta.hasMore).toBe(false);
      expect(result.meta.nextCursor).toBeNull();
    });

    it('should detect hasMore when extra message returned', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(
        mockConversation,
      );

      // Return limit + 1 messages to trigger hasMore
      const messages = Array.from({ length: 3 }, (_, i) => ({
        ...mockMessage,
        id: `msg-${i}`,
        fileAttachments: [],
      }));
      (prisma.message.findMany as jest.Mock).mockResolvedValue(messages);

      const result = await service.findByConversation(
        'conv-1',
        'company-1',
        { limit: 2 },
      );

      expect(result.meta.hasMore).toBe(true);
      expect(result.meta.nextCursor).toBe('msg-1');
      expect(result.data).toHaveLength(2);
    });

    it('should throw NotFoundException if conversation not found', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findByConversation('nonexistent', 'company-1', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should only allow author to edit', async () => {
      const messageWithConversation = {
        ...mockMessage,
        authorUserId: 'user-1',
        conversation: {
          voyage: { companyId: 'company-1' },
        },
      };
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(
        messageWithConversation,
      );

      await expect(
        service.update('msg-1', 'user-2', 'company-1', {
          plainTextBody: 'Edited',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update message when author matches', async () => {
      const messageWithConversation = {
        ...mockMessage,
        authorUserId: 'user-1',
        conversation: {
          voyage: { companyId: 'company-1' },
        },
      };
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(
        messageWithConversation,
      );

      const updatedMessage = {
        ...mockMessage,
        plainTextBody: 'Edited message',
        editedAt: new Date(),
      };
      (prisma.message.update as jest.Mock).mockResolvedValue(updatedMessage);

      const result = await service.update('msg-1', 'user-1', 'company-1', {
        plainTextBody: 'Edited message',
      });

      expect(result.plainTextBody).toBe('Edited message');
      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-1' },
        data: expect.objectContaining({
          plainTextBody: 'Edited message',
          editedAt: expect.any(Date),
        }),
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException for deleted message', async () => {
      const deletedMessage = {
        ...mockMessage,
        deletedAt: new Date(),
        conversation: {
          voyage: { companyId: 'company-1' },
        },
      };
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(
        deletedMessage,
      );

      await expect(
        service.update('msg-1', 'user-1', 'company-1', {
          plainTextBody: 'Edited',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt', async () => {
      const messageWithConversation = {
        ...mockMessage,
        authorUserId: 'user-1',
        conversation: {
          voyage: { companyId: 'company-1' },
        },
      };
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(
        messageWithConversation,
      );
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

    it('should throw ForbiddenException if not the author', async () => {
      const messageWithConversation = {
        ...mockMessage,
        authorUserId: 'user-1',
        conversation: {
          voyage: { companyId: 'company-1' },
        },
      };
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(
        messageWithConversation,
      );

      await expect(
        service.softDelete('msg-1', 'user-2', 'company-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
