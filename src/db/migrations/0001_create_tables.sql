-- Create oss_documents table
CREATE TABLE IF NOT EXISTS oss_documents (
    id SERIAL PRIMARY KEY,
    file_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Create rag_vector_embeddings table
CREATE TABLE IF NOT EXISTS rag_vector_embeddings (
    id SERIAL PRIMARY KEY,
    file_id INTEGER REFERENCES oss_documents(id),
    content TEXT NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
); 