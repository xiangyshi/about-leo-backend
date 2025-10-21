import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { DocumentIndexer } from './documentIndexer';

dotenv.config();

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatBotOptions {
  model?: string;
  maxContextChars?: number;
  systemPrompt?: string;
}

export class ChatBot {
  private openai: OpenAI;
  private documentIndexer: DocumentIndexer;
  private model: string;
  private maxContextChars: number;
  private baseSystemPrompt: string;

  constructor(documentIndexer: DocumentIndexer, options: ChatBotOptions = {}) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required in environment variables');
    }

    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.documentIndexer = documentIndexer;
    this.model = options.model ?? 'gpt-4o-mini';
    this.maxContextChars = options.maxContextChars ?? 6000;
    this.baseSystemPrompt = options.systemPrompt ?? 'You are Leo Shi’s personal AI assistant hosted on his portfolio website. Your goal is to answer questions about Leo’s background, experience, projects, and interests using the provided context. Be accurate, concise, and friendly. If information isn’t available, say so naturally rather than guessing.';
  }

  async ask(question: string, opts?: {
    limit?: number;
    systemPromptOverride?: string;
    history?: ChatMessage[];
  }): Promise<{ answer: string; usedContext: string; sources: Array<{ fileName: string | null; content: string }>; }>
  {
    const limit = opts?.limit ?? 5;

    // Retrieve relevant context using RAG
    const results = await this.documentIndexer.searchSimilarContent(question, limit);

    const sources = results.map(r => ({
      fileName: (r as any).fileName ?? null,
      content: (r as any).content as string,
    }));

    const context = this.buildContextString(sources, this.maxContextChars);

    const systemPrompt = this.composeSystemPrompt(opts?.systemPromptOverride, context);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...(opts?.history ?? []),
      { role: 'user', content: question },
    ];

    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages,
      temperature: 0.2,
    });

    const answer = completion.choices[0]?.message?.content ?? '';

    return {
      answer,
      usedContext: context,
      sources,
    };
  }

  private composeSystemPrompt(override: string | undefined, context: string): string {
    const header = override?.trim().length ? override : this.baseSystemPrompt;
    return `${header}\n\nUser question context about Leo (RAG):\n${context}`.slice(0, 12000);
  }

  private buildContextString(
    sources: Array<{ fileName: string | null; content: string }>,
    maxChars: number,
  ): string {
    const parts: string[] = [];
    let total = 0;

    for (const s of sources) {
      const prefix = s.fileName ? `From ${s.fileName}: ` : '';
      const snippet = `${prefix}${s.content}`;
      if (total + snippet.length > maxChars) {
        const remaining = Math.max(0, maxChars - total);
        if (remaining > 0) {
          parts.push(snippet.slice(0, remaining));
          total += remaining;
        }
        break;
      }
      parts.push(snippet);
      total += snippet.length;
    }

    return parts.join('\n\n');
  }
}


