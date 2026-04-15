import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { MessageSource, MessageType } from '@prisma/client';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  companyId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/',
})
export class SplashWebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SplashWebSocketGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connection rejected: no token`);
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify(token, { secret });

      client.userId = payload.sub;
      client.companyId = payload.companyId;

      this.logger.log(
        `Client connected: ${client.id} (user: ${payload.sub})`,
      );
    } catch (error) {
      this.logger.warn(
        `Client ${client.id} connection rejected: invalid token`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinVoyage')
  async handleJoinVoyage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { voyageId: string },
  ) {
    const room = `voyage:${data.voyageId}`;
    await client.join(room);
    this.logger.log(
      `User ${client.userId} joined room ${room}`,
    );
    return { event: 'joinedVoyage', data: { voyageId: data.voyageId } };
  }

  @SubscribeMessage('leaveVoyage')
  async handleLeaveVoyage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { voyageId: string },
  ) {
    const room = `voyage:${data.voyageId}`;
    await client.leave(room);
    this.logger.log(
      `User ${client.userId} left room ${room}`,
    );
    return { event: 'leftVoyage', data: { voyageId: data.voyageId } };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      conversationId: string;
      plainTextBody: string;
      richTextBody?: string;
    },
  ) {
    if (!client.userId) {
      return { event: 'error', data: { message: 'Not authenticated' } };
    }

    try {
      // Create the message in the database
      const message = await this.prisma.message.create({
        data: {
          conversationId: data.conversationId,
          authorUserId: client.userId,
          messageType: MessageType.USER_TEXT,
          plainTextBody: data.plainTextBody,
          richTextBody: data.richTextBody || null,
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

      // Get the conversation to find the voyage room
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: data.conversationId },
        select: { voyageId: true },
      });

      if (conversation) {
        const room = `voyage:${conversation.voyageId}`;
        this.server.to(room).emit('newMessage', {
          message,
          conversationId: data.conversationId,
          voyageId: conversation.voyageId,
        });
      }

      return { event: 'messageSent', data: { messageId: message.id } };
    } catch (error) {
      this.logger.error(`Failed to send message: ${error instanceof Error ? error.message : error}`);
      return { event: 'error', data: { message: 'Failed to send message' } };
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { voyageId: string; conversationId: string; isTyping: boolean },
  ) {
    const room = `voyage:${data.voyageId}`;
    client.to(room).emit('userTyping', {
      userId: client.userId,
      conversationId: data.conversationId,
      isTyping: data.isTyping,
    });
  }

  // ────────── Chat (WhatsApp-style) ──────────

  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    const room = `chat:${data.chatId}`;
    await client.join(room);
    return { event: 'joinedChat', data: { chatId: data.chatId } };
  }

  @SubscribeMessage('leaveChat')
  async handleLeaveChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    const room = `chat:${data.chatId}`;
    await client.leave(room);
    return { event: 'leftChat', data: { chatId: data.chatId } };
  }

  @SubscribeMessage('sendChatMessage')
  async handleSendChatMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; body: string },
  ) {
    if (!client.userId) {
      return { event: 'error', data: { message: 'Not authenticated' } };
    }

    try {
      const message = await this.prisma.chatMessage.create({
        data: {
          chatId: data.chatId,
          senderUserId: client.userId,
          body: data.body,
        },
        include: {
          sender: {
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

      await this.prisma.chat.update({
        where: { id: data.chatId },
        data: { updatedAt: new Date() },
      });

      const room = `chat:${data.chatId}`;
      this.server.to(room).emit('newChatMessage', {
        chatId: data.chatId,
        message,
      });

      return { event: 'chatMessageSent', data: { messageId: message.id } };
    } catch (error) {
      this.logger.error(
        `Failed to send chat message: ${error instanceof Error ? error.message : error}`,
      );
      return { event: 'error', data: { message: 'Failed to send chat message' } };
    }
  }

  @SubscribeMessage('chatTyping')
  async handleChatTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; isTyping: boolean },
  ) {
    const room = `chat:${data.chatId}`;
    client.to(room).emit('chatUserTyping', {
      userId: client.userId,
      chatId: data.chatId,
      isTyping: data.isTyping,
    });
  }

  /**
   * Emit an event to all clients in a voyage room.
   * Can be called from other services to push real-time updates.
   */
  notifyVoyage(
    voyageId: string,
    event: string,
    data: Record<string, any>,
  ) {
    const room = `voyage:${voyageId}`;
    this.server.to(room).emit(event, { ...data, voyageId });
  }

  /**
   * Send a notification to a specific user by finding their connected sockets.
   */
  notifyUser(userId: string, event: string, data: Record<string, any>) {
    const sockets = this.server.sockets.sockets;
    for (const [, socket] of sockets) {
      const authSocket = socket as AuthenticatedSocket;
      if (authSocket.userId === userId) {
        authSocket.emit(event, data);
      }
    }
  }
}
