import { Module } from '@nestjs/common';
import { EmailIntegrationsController } from './email-integrations.controller';
import { EmailIntegrationsService } from './email-integrations.service';

@Module({
  controllers: [EmailIntegrationsController],
  providers: [EmailIntegrationsService],
  exports: [EmailIntegrationsService],
})
export class EmailIntegrationsModule {}
