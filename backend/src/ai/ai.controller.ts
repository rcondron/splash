import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiService } from './ai.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('ai/summarize')
  async summarize(@Body('messages') messages: string[]) {
    return this.aiService.summarizeConversation(messages);
  }

  @Post('ai/extract-terms')
  async extractTerms(@Body('text') text: string) {
    return this.aiService.extractTerms(text);
  }

  @Post('voyages/:voyageId/ai/summarize')
  async summarizeVoyage(
    @Param('voyageId', ParseUUIDPipe) voyageId: string,
  ) {
    return this.aiService.summarizeVoyageConversations(voyageId);
  }

  @Post('voyages/:voyageId/ai/extract-terms')
  async extractVoyageTerms(
    @Param('voyageId', ParseUUIDPipe) voyageId: string,
  ) {
    return this.aiService.extractTermsFromVoyageMessages(voyageId);
  }
}
