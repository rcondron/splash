import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AiModule } from '../ai/ai.module';
import { AiExtractionProcessor } from './ai-extraction.processor';
import { RecapGenerationProcessor } from './recap-generation.processor';
import { EmailSyncProcessor } from './email-sync.processor';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'ai-extraction' },
      { name: 'recap-generation' },
      { name: 'email-sync' },
    ),
    AiModule,
  ],
  providers: [
    AiExtractionProcessor,
    RecapGenerationProcessor,
    EmailSyncProcessor,
  ],
  exports: [BullModule],
})
export class JobsModule {}
