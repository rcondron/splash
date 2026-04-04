import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { RecapsController } from './recaps.controller';
import { RecapsService } from './recaps.service';

@Module({
  imports: [AiModule],
  controllers: [RecapsController],
  providers: [RecapsService],
  exports: [RecapsService],
})
export class RecapsModule {}
