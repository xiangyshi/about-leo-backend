ALTER TABLE "rag_vector_embeddings" ALTER COLUMN "embedding" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "oss_documents" ADD COLUMN "file_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "oss_documents" DROP COLUMN IF EXISTS "name";