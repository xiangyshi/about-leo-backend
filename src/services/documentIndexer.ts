import { DocumentProcessor, DocumentChunk } from './documentProcessor';
import { EmbeddingService } from './embeddingService';
import { db } from '../db/index';
import { ossDocuments, ragVectorEmbeddings } from '../db/schema';
import { sql, eq } from 'drizzle-orm';

export class DocumentIndexer {
  private documentProcessor: DocumentProcessor;
  private embeddingService: EmbeddingService;

  constructor() {
    this.documentProcessor = new DocumentProcessor();
    this.embeddingService = new EmbeddingService();
  }

  async indexDocument(filePath: string): Promise<void> {
    console.log(`Starting to index document: ${filePath}`);
    
    try {
      // 1. Process document into chunks
      const chunks = await this.processDocument(filePath);
      console.log(`Document split into ${chunks.length} chunks`);

      // 2. Check if document already exists
      const fileName = chunks[0].metadata.fileName;
      const existingDoc = await db
        .select()
        .from(ossDocuments)
        .where(eq(ossDocuments.file_name, fileName))
        .limit(1);

      let documentId: number;

      if (existingDoc.length > 0) {
        // Document exists, delete old embeddings and reuse the ID
        documentId = existingDoc[0].id;
        console.log(`Document already exists with ID: ${documentId}, updating...`);
        
        // Delete old embeddings
        await db
          .delete(ragVectorEmbeddings)
          .where(eq(ragVectorEmbeddings.file_id, documentId));
        
        // Update document metadata
        await db
          .update(ossDocuments)
          .set({
            metadata: {
              totalChunks: chunks.length,
              fileType: chunks[0].metadata.fileType,
              indexedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          })
          .where(eq(ossDocuments.id, documentId));
      } else {
        // Create new document record
        const [document] = await db.insert(ossDocuments).values({
          file_name: fileName,
          metadata: {
            totalChunks: chunks.length,
            fileType: chunks[0].metadata.fileType,
            indexedAt: new Date().toISOString(),
          },
        }).returning();

        documentId = document.id;
        console.log(`Created new document record with ID: ${documentId}`);
      }

      // 3. Generate embeddings and store chunks
      await this.processChunksInBatches(chunks, documentId);

      console.log(`Successfully indexed document: ${filePath}`);
    } catch (error) {
      console.error(`Error indexing document ${filePath}:`, error);
      throw error;
    }
  }

  private async processDocument(filePath: string): Promise<DocumentChunk[]> {
    const extension = filePath.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'txt':
        return await this.documentProcessor.processTextFile(filePath);
      case 'md':
        return await this.documentProcessor.processMarkdownFile(filePath);
      case 'json':
        return await this.documentProcessor.processJsonFile(filePath);
      case 'pdf':
        return await this.documentProcessor.processPdfFile(filePath);
      default:
        throw new Error(`Unsupported file type: ${extension}`);
    }
  }

  private async processChunksInBatches(chunks: DocumentChunk[], documentId: number): Promise<void> {
    const batchSize = 20; // Increased batch size for better efficiency
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);
      
      // Generate embeddings for the batch
      const texts = batch.map(chunk => chunk.content);
      const embeddings = await this.embeddingService.generateEmbeddings(texts);
      
      // Store chunks with embeddings in parallel
      const insertPromises = batch.map(async (chunk, j) => {
        const embedding = embeddings[j];
        const vectorString = `[${embedding.embedding.join(',')}]`;
        
        return db.insert(ragVectorEmbeddings).values({
          file_id: documentId,
          content: chunk.content,
          embedding: vectorString,
        });
      });
      
      await Promise.all(insertPromises);
      
      // Smaller delay since we're processing fewer batches
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  async searchSimilarContent(query: string, limit: number = 5): Promise<any[]> {
    // Generate embedding for the query
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    
    // Convert query embedding to PostgreSQL array format
    const queryVectorString = `[${queryEmbedding.embedding.join(',')}]`;
    
    // Search for similar vectors
    const results = await db
      .select({
        id: ragVectorEmbeddings.id,
        content: ragVectorEmbeddings.content,
        fileName: ossDocuments.file_name,
        metadata: ossDocuments.metadata,
        similarity: sql<number>`1 - (${ragVectorEmbeddings.embedding}::vector <=> ${queryVectorString}::vector)`.as('similarity')
      })
      .from(ragVectorEmbeddings)
      .leftJoin(ossDocuments, sql`${ossDocuments.id} = ${ragVectorEmbeddings.file_id}`)
      .orderBy(sql`${ragVectorEmbeddings.embedding}::vector <=> ${queryVectorString}::vector`)
      .limit(limit);
    
    return results;
  }

  async deleteAllDocuments(): Promise<{ deletedDocuments: number; deletedEmbeddings: number }> {
    console.log('Starting to delete all documents and embeddings...');
    
    try {
      // First, get count of documents and embeddings before deletion
      const documentCount = await db.select().from(ossDocuments);
      const embeddingCount = await db.select().from(ragVectorEmbeddings);
      
      // Delete all embeddings first (due to foreign key constraint)
      await db.delete(ragVectorEmbeddings);
      console.log(`Deleted ${embeddingCount.length} embeddings`);
      
      // Delete all documents
      await db.delete(ossDocuments);
      console.log(`Deleted ${documentCount.length} documents`);
      
      console.log('Successfully deleted all documents and embeddings');
      
      return {
        deletedDocuments: documentCount.length,
        deletedEmbeddings: embeddingCount.length
      };
    } catch (error) {
      console.error('Error deleting all documents:', error);
      throw error;
    }
  }
} 