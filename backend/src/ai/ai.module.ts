import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'ai-extraction' }),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
