import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
}

export class EmbeddingService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required in environment variables');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small', // or 'text-embedding-3-large' for better quality
        input: text,
      });

      return {
        embedding: response.data[0].embedding,
        tokenCount: response.usage.total_tokens,
      };
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
      });

      return response.data.map((item, index) => ({
        embedding: item.embedding,
        tokenCount: response.usage.total_tokens / texts.length, // Approximate per text
      }));
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw error;
    }
  }
} 