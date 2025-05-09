import { db } from './index';
import { ragVectorEmbeddings, ossDocuments } from './schema';
import { sql, eq } from 'drizzle-orm';

export async function findSimilarVectors(embedding: number[], limit: number = 5) {
  return await db
    .select({
      id: ragVectorEmbeddings.id,
      content: ragVectorEmbeddings.content,
      fileName: ossDocuments.file_name,
      metadata: ossDocuments.metadata,
      similarity: sql<number>`1 - (${ragVectorEmbeddings.embedding}::vector <=> ${embedding}::vector)`.as('similarity')
    })
    .from(ragVectorEmbeddings)
    .leftJoin(ossDocuments, eq(ossDocuments.id, ragVectorEmbeddings.file_id))
    .orderBy(sql`${ragVectorEmbeddings.embedding}::vector <=> ${embedding}::vector`)
    .limit(limit);
}

export async function insertEmbedding(fileId: number, content: string, embedding: number[]) {
  return await db.insert(ragVectorEmbeddings).values({
    file_id: fileId,
    content,
    embedding: sql`${embedding}::vector`,
  });
} 