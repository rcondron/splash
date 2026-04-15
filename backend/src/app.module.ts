import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CompaniesModule } from './companies/companies.module';
import { VoyagesModule } from './voyages/voyages.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { FilesModule } from './files/files.module';
import { AiModule } from './ai/ai.module';
import { ExtractedTermsModule } from './extracted-terms/extracted-terms.module';
import { RecapsModule } from './recaps/recaps.module';
import { DealSnapshotsModule } from './deal-snapshots/deal-snapshots.module';
import { ContractsModule } from './contracts/contracts.module';
import { AuditModule } from './audit/audit.module';
import { SearchModule } from './search/search.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EmailIntegrationsModule } from './email-integrations/email-integrations.module';
import { WebSocketModule } from './websocket/websocket.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PdfModule } from './common/services/pdf.module';
import { JobsModule } from './jobs/jobs.module';
import { ChatsModule } from './chats/chats.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('BULL_REDIS_HOST', 'localhost'),
          port: config.get<number>('BULL_REDIS_PORT', 6379),
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    VoyagesModule,
    ConversationsModule,
    MessagesModule,
    FilesModule,
    AiModule,
    ExtractedTermsModule,
    RecapsModule,
    DealSnapshotsModule,
    ContractsModule,
    AuditModule,
    SearchModule,
    NotificationsModule,
    EmailIntegrationsModule,
    WebSocketModule,
    AnalyticsModule,
    PdfModule,
    JobsModule,
    ChatsModule,
  ],
})
export class AppModule {}
