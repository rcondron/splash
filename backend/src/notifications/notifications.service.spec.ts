import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: PrismaService;

  const mockNotification = {
    id: 'notif-1',
    userId: 'user-1',
    voyageId: 'voyage-1',
    type: 'MESSAGE_RECEIVED',
    title: 'New Message',
    body: 'You have a new message in Test Voyage',
    actionUrl: '/voyages/voyage-1/messages',
    isRead: false,
    createdAt: new Date('2025-06-01T12:00:00Z'),
    voyage: { id: 'voyage-1', voyageName: 'Test Voyage' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: {
            notification: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByUser', () => {
    it('should return user notifications ordered by createdAt desc', async () => {
      const notifications = [
        mockNotification,
        { ...mockNotification, id: 'notif-2', title: 'Another Notification' },
      ];
      (prisma.notification.findMany as jest.Mock).mockResolvedValue(
        notifications,
      );

      const result = await service.findByUser('user-1');

      expect(result).toEqual(notifications);
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          voyage: {
            select: { id: true, voyageName: true },
          },
        },
      });
    });
  });

  describe('markAsRead', () => {
    it('should set isRead to true', async () => {
      (prisma.notification.findUnique as jest.Mock).mockResolvedValue(
        mockNotification,
      );

      const updatedNotification = { ...mockNotification, isRead: true };
      (prisma.notification.update as jest.Mock).mockResolvedValue(
        updatedNotification,
      );

      const result = await service.markAsRead('notif-1', 'user-1');

      expect(result.isRead).toBe(true);
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { isRead: true },
      });
    });

    it('should throw NotFoundException if notification not found', async () => {
      (prisma.notification.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.markAsRead('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if notification belongs to different user', async () => {
      (prisma.notification.findUnique as jest.Mock).mockResolvedValue(
        mockNotification,
      );

      await expect(
        service.markAsRead('notif-1', 'user-2'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('should update all unread notifications for user', async () => {
      (prisma.notification.updateMany as jest.Mock).mockResolvedValue({
        count: 5,
      });

      const result = await service.markAllAsRead('user-1');

      expect(result).toEqual({ updated: 5 });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true },
      });
    });

    it('should return zero when no unread notifications exist', async () => {
      (prisma.notification.updateMany as jest.Mock).mockResolvedValue({
        count: 0,
      });

      const result = await service.markAllAsRead('user-1');

      expect(result).toEqual({ updated: 0 });
    });
  });

  describe('getUnreadCount', () => {
    it('should return correct count', async () => {
      (prisma.notification.count as jest.Mock).mockResolvedValue(7);

      const result = await service.getUnreadCount('user-1');

      expect(result).toEqual({ count: 7 });
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
    });

    it('should return zero when no unread notifications', async () => {
      (prisma.notification.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getUnreadCount('user-1');

      expect(result).toEqual({ count: 0 });
    });
  });
});
