import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';

export interface ExtractedTermResult {
  termType: string;
  rawValue: string;
  normalizedValue: string;
  confidence: number;
}

export interface AiResponse<T> {
  data: T;
  model: string;
  promptVersion: string;
  source: string;
}

interface AiProvider {
  complete(prompt: string, systemPrompt?: string): Promise<string>;
  readonly name: string;
  readonly model: string;
}

// ─── Mock Provider ────────────────────────────────────────────

class MockAiProvider implements AiProvider {
  readonly name = 'mock';
  readonly model = 'mock-v1';

  async complete(prompt: string): Promise<string> {
    // Return structured JSON based on what the prompt is asking for
    if (prompt.includes('"task":"summarize"')) {
      return JSON.stringify({
        summary:
          'The parties discussed vessel nomination, laycan dates, and freight rate. ' +
          'Key points include agreement on load port Rotterdam, discharge port Singapore, ' +
          'and a preliminary freight rate of $15.50/MT. Laycan window proposed as 15-20 of next month.',
      });
    }

    if (prompt.includes('"task":"extract-terms"')) {
      return JSON.stringify({
        terms: [
          {
            termType: 'VESSEL',
            rawValue: 'MV Pacific Star',
            normalizedValue: 'MV PACIFIC STAR',
            confidence: 0.92,
          },
          {
            termType: 'LOAD_PORT',
            rawValue: 'Rotterdam',
            normalizedValue: 'ROTTERDAM, NETHERLANDS',
            confidence: 0.97,
          },
          {
            termType: 'DISCHARGE_PORT',
            rawValue: 'Singapore',
            normalizedValue: 'SINGAPORE',
            confidence: 0.95,
          },
          {
            termType: 'FREIGHT_RATE',
            rawValue: '$15.50 per metric ton',
            normalizedValue: '15.50 USD/MT',
            confidence: 0.88,
          },
          {
            termType: 'LAYCAN',
            rawValue: '15-20 next month',
            normalizedValue: '15-20',
            confidence: 0.78,
          },
        ],
      });
    }

    if (prompt.includes('"task":"generate-recap"')) {
      return JSON.stringify({
        recap:
          '# Voyage Recap\n\n' +
          '## Vessel\n- **Vessel Name:** MV Pacific Star\n\n' +
          '## Cargo\n- **Type:** Grain (Wheat)\n- **Quantity:** 50,000 MT +/- 5%\n\n' +
          '## Ports\n- **Load Port:** Rotterdam, Netherlands\n- **Discharge Port:** Singapore\n\n' +
          '## Dates\n- **Laycan:** 15-20 of agreed month\n\n' +
          '## Commercial Terms\n- **Freight Rate:** USD 15.50/MT\n- **Demurrage:** USD 25,000 PDPR\n' +
          '- **Despatch:** USD 12,500 PDPR (half demurrage)\n\n' +
          '## Charter Party\n- **CP Form:** GENCON 2022\n\n' +
          '## Commissions\n- **Brokerage:** 2.5% TFC\n\n' +
          '---\n*Generated from accepted terms. Subject to review and confirmation by all parties.*',
      });
    }

    if (prompt.includes('"task":"generate-contract"')) {
      return JSON.stringify({
        contract:
          '# Charter Party Contract\n\n' +
          '## PART I\n\n' +
          '**1. Shipbroker:** [Broker Name]\n\n' +
          '**2. Place and date of Charter Party:** [Place], [Date]\n\n' +
          '**3. Owners / Place of business:** [Owner details]\n\n' +
          '**4. Charterers / Place of business:** [Charterer details]\n\n' +
          '**5. Vessel\'s name:** MV Pacific Star\n\n' +
          '**6. GT/NT:** [TBD]\n\n' +
          '**7. DWT all told on summer load line:** [TBD]\n\n' +
          '**8. Present position:** [TBD]\n\n' +
          '**9. Loading port(s):** Rotterdam, Netherlands\n\n' +
          '**10. Discharging port(s):** Singapore\n\n' +
          '**11. Cargo:** Grain (Wheat), 50,000 MT +/- 5%\n\n' +
          '**12. Freight rate:** USD 15.50 per metric ton\n\n' +
          '**13. Laycan:** 15-20 of agreed month\n\n' +
          '**14. Demurrage rate:** USD 25,000 per day pro rata\n\n' +
          '**15. Brokerage commission:** 2.5% of total freight\n\n' +
          '\n## PART II\n\n' +
          'Standard GENCON 2022 terms and conditions apply.\n\n' +
          '---\n*Draft contract generated from recap. Subject to legal review.*',
      });
    }

    return JSON.stringify({ result: 'Mock AI response' });
  }
}

// ─── OpenAI-Compatible Provider ───────────────────────────────

class OpenAiCompatibleProvider implements AiProvider {
  readonly name = 'openai-compatible';
  readonly model: string;
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly logger = new Logger('OpenAiCompatibleProvider');

  constructor(apiUrl: string, apiKey: string, model?: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.model = model || 'gpt-4';
  }

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(`${this.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`AI API error: ${response.status} - ${errorBody}`);
      throw new Error(`AI API request failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0].message.content;
  }
}

// ─── AI Service ───────────────────────────────────────────────

@Injectable()
export class AiService {
  private readonly provider: AiProvider;
  private readonly promptVersion = '1.0.0';
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const apiUrl = this.config.get<string>('AI_API_URL');
    const apiKey = this.config.get<string>('AI_API_KEY');
    const aiModel = this.config.get<string>('AI_MODEL');

    if (apiUrl && apiKey) {
      this.provider = new OpenAiCompatibleProvider(apiUrl, apiKey, aiModel);
      this.logger.log('Using OpenAI-compatible AI provider');
    } else {
      this.provider = new MockAiProvider();
      this.logger.log('Using mock AI provider (no AI_API_URL/AI_API_KEY set)');
    }
  }

  async summarizeConversation(
    messages: string[],
  ): Promise<AiResponse<string>> {
    const prompt = JSON.stringify({
      task: 'summarize',
      instructions:
        'Summarize the following maritime chartering conversation messages. ' +
        'Focus on key commercial terms discussed, agreements reached, and open items. ' +
        'Return JSON with a "summary" field.',
      messages,
    });

    const raw = await this.provider.complete(prompt, SYSTEM_PROMPT);
    const parsed = this.safeParseJson(raw);

    return {
      data: parsed.summary || raw,
      model: this.provider.model,
      promptVersion: this.promptVersion,
      source: this.provider.name,
    };
  }

  async extractTerms(
    text: string,
  ): Promise<AiResponse<ExtractedTermResult[]>> {
    const prompt = JSON.stringify({
      task: 'extract-terms',
      instructions:
        'Extract maritime chartering terms from the following text. ' +
        'For each term found, provide termType (one of: VESSEL, CARGO, QUANTITY, LOAD_PORT, ' +
        'DISCHARGE_PORT, LAYCAN, FREIGHT_RATE, DEMURRAGE, DESPATCH, COMMISSION, PAYMENT_TERMS, CP_FORM, OTHER), ' +
        'rawValue, normalizedValue, and confidence (0-1). ' +
        'Return JSON with a "terms" array.',
      text,
    });

    const raw = await this.provider.complete(prompt, SYSTEM_PROMPT);
    const parsed = this.safeParseJson(raw);

    return {
      data: parsed.terms || [],
      model: this.provider.model,
      promptVersion: this.promptVersion,
      source: this.provider.name,
    };
  }

  async generateRecap(
    terms: Record<string, any>,
    voyageInfo: Record<string, any>,
  ): Promise<AiResponse<string>> {
    const prompt = JSON.stringify({
      task: 'generate-recap',
      instructions:
        'Generate a structured voyage recap in Markdown format from the accepted terms and voyage information. ' +
        'Organize by sections: Vessel, Cargo, Ports, Dates, Commercial Terms, Charter Party, Commissions. ' +
        'Return JSON with a "recap" field containing the markdown.',
      terms,
      voyageInfo,
    });

    const raw = await this.provider.complete(prompt, SYSTEM_PROMPT);
    const parsed = this.safeParseJson(raw);

    return {
      data: parsed.recap || raw,
      model: this.provider.model,
      promptVersion: this.promptVersion,
      source: this.provider.name,
    };
  }

  async generateContractDraft(
    recap: Record<string, any>,
    templateName: string,
  ): Promise<AiResponse<string>> {
    const prompt = JSON.stringify({
      task: 'generate-contract',
      instructions:
        `Generate a charter party contract draft in Markdown format based on the ${templateName} template. ` +
        'Use the recap data to fill in the commercial terms. Mark unknown fields with [TBD]. ' +
        'Return JSON with a "contract" field containing the markdown.',
      recap,
      templateName,
    });

    const raw = await this.provider.complete(prompt, SYSTEM_PROMPT);
    const parsed = this.safeParseJson(raw);

    return {
      data: parsed.contract || raw,
      model: this.provider.model,
      promptVersion: this.promptVersion,
      source: this.provider.name,
    };
  }

  async summarizeVoyageConversations(voyageId: string): Promise<AiResponse<string>> {
    const messages = await this.prisma.message.findMany({
      where: { conversation: { voyageId } },
      orderBy: { sentAt: 'asc' },
      select: { plainTextBody: true, sentAt: true },
      take: 200,
    });

    const texts = messages.map(
      (m) => `[${m.sentAt.toISOString()}] ${m.plainTextBody}`,
    );
    return this.summarizeConversation(texts);
  }

  async extractTermsFromVoyageMessages(
    voyageId: string,
  ): Promise<AiResponse<ExtractedTermResult[]>> {
    const messages = await this.prisma.message.findMany({
      where: { conversation: { voyageId } },
      orderBy: { sentAt: 'asc' },
      select: { plainTextBody: true },
      take: 200,
    });

    const combined = messages.map((m) => m.plainTextBody).join('\n');
    return this.extractTerms(combined);
  }

  private safeParseJson(text: string): any {
    try {
      return JSON.parse(text);
    } catch {
      // Try to extract JSON from markdown code blocks
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        try {
          return JSON.parse(match[1].trim());
        } catch {
          // fall through
        }
      }
      this.logger.warn('Failed to parse AI response as JSON');
      return {};
    }
  }
}

const SYSTEM_PROMPT =
  'You are an expert maritime chartering assistant. You help extract terms, ' +
  'summarize negotiations, and draft charter party documents. Always respond with valid JSON.';
