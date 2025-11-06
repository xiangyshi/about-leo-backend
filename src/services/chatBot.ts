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
    this.baseSystemPrompt = options.systemPrompt ?? `You are Leo Shi's personal AI assistant hosted on his portfolio website. Your goal is to answer questions about Leo's background, experience, projects, and interests using the provided context. Be accurate, concise, and friendly. If information isn't available, say so naturally rather than guessing.

Leo's Resume:
Xiangyu (Leo) Shi xiangy.shi@gmail.com | (858) 568-0271 | Menlo Park, CA 
linkedin.com/in/xleoshi/ | github.com/xiangyshi | about-leo.dev 
EDUCATION 
Carnegie Mellon University, Silicon Valley 
Master of Science, Software Engineering August 2025 – December 2026 
● 1 st Place , CMU-SV Hackathon ( "SafeBark" - NLP Positive Content Replacer ) 
● Software Engineering Methods, Functional Programming, Applied Data Science 

University of California San Diego 
Bachelor of Science, Mathematics - Computer Science September 2021 – March 2025
● Cum Laude , GPA: 3.9, Provost's Honors 
● Data Structures and Algorithms, Object-Oriented Programming, Database Systems, Software Engineering, Computer Systems, Computer Architecture, Design Patterns, Statistical Modeling, Deep Learning, Data Mining 

PROFESSIONAL EXPERIENCE 
J. Craig Venter Institute June 2025 – August 2025 
Data Science & Machine Learning Engineer Intern La Jolla, CA 
● Developed ML-driven applications for protein structure and stability prediction, integrated into a researcher-facing web platform (Express.js + HTML/JS/CSS) with dockerized ML tools on AWS EC2 and Nginx. 
● Designed an orchestration layer with a dynamic job queue for managing tool calls, extendable to Kubernetes environments. 
● Automated data ingestion and preprocessing pipelines through Python, Jupyter and Bash scripting, supporting large-scale proteome translation of thousands of viral sequences (~20k amino acids each). 

Yunming Technology January 2025 – June 2025 
Software Engineer Intern Remote 
● Engineered a modular Retrieval-Augmented Generation (RAG) chatbot system for Customer Relationship Management (CRM) workflows, integrating query reconstruction, semantic search, and real-time responses via Server-Sent Events (SSE). 
● Enhanced document retrieval relevance by ~50% through TF-IDF re-ranking and custom evaluation metrics (Precision@K, MRR), improving CRM agent knowledge responses. 

Human Internet September 2024 – June 2025 
Full Stack Engineer Intern Remote 
● Transformed the humanID developer console by refactoring backend API (Django/REST, MySQL). 
● Boosted SSO reliability by 80% through improved exception handling and JWT-based session flow; dockerized to streamline development across global teams and added support for international phone formats. 
● Collaborated with distributed engineering teams to optimize core API performance and ensure seamless system integration. 

PROJECTS 
SafeBark (CMU-SV Hackathon – 1 st Place) October 2025 
● Real-time NLP pipeline converting toxic comments to positive tone using OpenAI API and Hugging Face. Epistasis Bi-Clustering Algorithm (Scripps Research) September 2024 – March 2025 
● Reduced pipeline runtime from 16 hours to 10 minutes through code profiling and algorithmic optimization. TCDB Classifier Pipeline (UC San Diego) July 2024 – September 2025 
● Designed and built data preprocessing and evaluation workflow for large-scale ML classification tasks. Teacher Analytics Dashboard (STEMz Learning) June 2024 – Present 
● Developed app for multi-classroom data visualization and chat features , served over 200+ teachers and students. 

TECHNICAL SKILLS 
Languages: 
Python, JavaScript (ES6+), TypeScript, Java, C/C++, F#, Bash, SQL 
Frameworks & Libraries: 
React.js, Next.js, Node.js, Express.js, Flask, Django, LangChain, Socket.IO 
Databases & Data Tools: 
MySQL, PostgreSQL, MongoDB, PyTorch, NumPy, Pandas, SciPy, Diffusion Models 
Cloud, DevOps & Other Tools: 
AWS (EC2, S3, RDS), Azure, Docker, Git/GitHub Actions, Vercel, Render, Linux/Unix, UML, REST API, OpenAI API, Hugging Face, Agile, Scrum, CI/CD, PgVector, Nginx`;
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


