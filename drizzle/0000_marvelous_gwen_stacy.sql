CREATE TABLE IF NOT EXISTS "oss_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rag_vector_embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_id" integer,
	"content" text NOT NULL,
	"embedding" "vector(1536)",
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rag_vector_embeddings" ADD CONSTRAINT "rag_vector_embeddings_file_id_oss_documents_id_fk" FOREIGN KEY ("file_id") REFERENCES "oss_documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
