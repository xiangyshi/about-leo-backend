import { pgTable, serial, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';

export const ossDocuments = pgTable('oss_documents', {
  id: serial('id').primaryKey(),
  file_name: text('file_name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  metadata: jsonb('metadata'),
});

export const ragVectorEmbeddings = pgTable('rag_vector_embeddings', {
  id: serial('id').primaryKey(),
  file_id: integer('file_id').references(() => ossDocuments.id),
  content: text('content').notNull(),
  embedding: text('embedding'), // We'll handle the vector type in our queries
  createdAt: timestamp('created_at').defaultNow(),
}); 