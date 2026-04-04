import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

export interface EmailSyncJobData {
  accountId: string;
  userId: string;
  provider: string;
}

@Processor('email-sync')
export class EmailSyncProcessor {
  private readonly logger = new Logger(EmailSyncProcessor.name);

  @Process()
  async handleEmailSync(job: Job<EmailSyncJobData>): Promise<void> {
    const { accountId, userId, provider } = job.data;
    this.logger.log(
      `Starting email sync for account ${accountId} (provider: ${provider}, user: ${userId}, job: ${job.id})`,
    );

    // TODO: Implement actual email sync via provider-specific APIs (e.g. Gmail, Outlook).
    // For now, log what would happen:
    this.logger.log(
      `Would connect to ${provider} for account ${accountId} and fetch new messages`,
    );
    this.logger.log(
      `Would parse incoming emails and match them to existing voyage conversations`,
    );
    this.logger.log(
      `Would create new Message records for any unprocessed emails`,
    );

    this.logger.log(
      `Email sync job ${job.id} completed for account ${accountId} (provider: ${provider})`,
    );
  }
}
