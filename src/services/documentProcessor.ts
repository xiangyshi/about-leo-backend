import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';

export interface DocumentChunk {
  content: string;
  metadata: {
    fileName: string;
    chunkIndex: number;
    totalChunks: number;
    fileType: string;
    sectionType?: string;
  };
}

export class DocumentProcessor {
  private maxChunkSize: number;
  private chunkOverlap: number;

  constructor(maxChunkSize: number = 800, chunkOverlap: number = 50) {
    this.maxChunkSize = maxChunkSize;
    this.chunkOverlap = chunkOverlap;
  }

  async processTextFile(filePath: string): Promise<DocumentChunk[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    
    return this.chunkText(content, fileName, 'text');
  }

  async processMarkdownFile(filePath: string): Promise<DocumentChunk[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    
    return this.chunkMarkdown(content, fileName, 'markdown');
  }

  async processJsonFile(filePath: string): Promise<DocumentChunk[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    
    return this.chunkJson(content, fileName, 'json');
  }

  async processPdfFile(filePath: string): Promise<DocumentChunk[]> {
    const buffer = fs.readFileSync(filePath);
    const data = await pdf(buffer);
    const fileName = path.basename(filePath);
    
    return this.chunkText(data.text, fileName, 'pdf');
  }

  private chunkJson(content: string, fileName: string, fileType: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;
    
    try {
      const data = JSON.parse(content);
      
      // Process General info
      if (data.General?.info) {
        chunks.push({
          content: data.General.info,
          metadata: {
            fileName,
            chunkIndex: chunkIndex++,
            totalChunks: 0,
            fileType,
            sectionType: 'general',
          },
        });
      }
      
      // Process Education
      if (data.Education?.info) {
        chunks.push({
          content: data.Education.info,
          metadata: {
            fileName,
            chunkIndex: chunkIndex++,
            totalChunks: 0,
            fileType,
            sectionType: 'education',
          },
        });
      }
      
      // Process Research Experience
      if (data['Research Experience'] && Array.isArray(data['Research Experience'])) {
        for (const item of data['Research Experience']) {
          if (item.info) {
            chunks.push({
              content: item.info,
              metadata: {
                fileName,
                chunkIndex: chunkIndex++,
                totalChunks: 0,
                fileType,
                sectionType: 'research',
              },
            });
          }
        }
      }
      
      // Process Professional Experience
      if (data['Professional Experience'] && Array.isArray(data['Professional Experience'])) {
        for (const item of data['Professional Experience']) {
          if (item.info) {
            chunks.push({
              content: item.info,
              metadata: {
                fileName,
                chunkIndex: chunkIndex++,
                totalChunks: 0,
                fileType,
                sectionType: 'work',
              },
            });
          }
        }
      }
      
      // Process Project Experience
      if (data['Project Experience'] && Array.isArray(data['Project Experience'])) {
        for (const item of data['Project Experience']) {
          if (item.info) {
            chunks.push({
              content: item.info,
              metadata: {
                fileName,
                chunkIndex: chunkIndex++,
                totalChunks: 0,
                fileType,
                sectionType: 'project',
              },
            });
          }
        }
      }
      
    } catch (error) {
      console.error('Error parsing JSON:', error);
      // Fallback to text processing
      return this.chunkText(content, fileName, fileType);
    }
    
    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });
    
    return chunks;
  }

  private chunkMarkdown(text: string, fileName: string, fileType: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;
    
    // First, split by >> markers to get individual entries
    const entries = text.split(/(?=\*\*>> )/);
    
    for (const entry of entries) {
      const trimmedEntry = entry.trim();
      if (!trimmedEntry) continue;
      
      // Skip if it's just a section header without >> marker
      if (!trimmedEntry.includes('>>') && trimmedEntry.length < 200) {
        // This is likely just a section header, combine with next entry if possible
        continue;
      }
      
      // Extract section type from >> marker
      let sectionType = 'general';
      const sectionMatch = trimmedEntry.match(/\*\*>> (RESEARCH|WORK|PROJECT):/);
      if (sectionMatch) {
        sectionType = sectionMatch[1].toLowerCase();
      } else if (trimmedEntry.includes('EDUCATION')) {
        sectionType = 'education';
      } else if (trimmedEntry.includes('EXPERIENCE')) {
        sectionType = 'experience';
      }
      
      // Clean up the entry - remove excessive whitespace and normalize line breaks
      const cleanedEntry = trimmedEntry
        .replace(/\r\n/g, '\n')
        .replace(/\n\s*\n/g, '\n\n')
        .replace(/\s+/g, ' ')
        .replace(/\n /g, '\n')
        .trim();
      
      // If entry is reasonable size, use as single chunk
      if (cleanedEntry.length <= this.maxChunkSize) {
        chunks.push({
          content: cleanedEntry,
          metadata: {
            fileName,
            chunkIndex,
            totalChunks: 0,
            fileType,
            sectionType,
          },
        });
        chunkIndex++;
      } else {
        // If too large, split by bullet points but keep header with each group
        const subChunks = this.splitLargeEntry(cleanedEntry, fileName, fileType, chunkIndex, sectionType);
        chunks.push(...subChunks);
        chunkIndex += subChunks.length;
      }
    }
    
    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });
    
    return chunks;
  }

  private splitLargeEntry(entry: string, fileName: string, fileType: string, startIndex: number, sectionType: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let chunkIndex = startIndex;
    
    // Split by bullet points
    const lines = entry.split('\n');
    const header: string[] = [];
    const bullets: string[] = [];
    
    // Separate header from bullets
    let foundFirstBullet = false;
    for (const line of lines) {
      if (line.trim().startsWith('- ')) {
        foundFirstBullet = true;
        bullets.push(line.trim());
      } else if (!foundFirstBullet) {
        header.push(line.trim());
      }
    }
    
    const headerText = header.filter(h => h).join(' ');
    
    if (bullets.length === 0) {
      // No bullets, just return the entry as is
      chunks.push({
        content: entry,
        metadata: {
          fileName,
          chunkIndex,
          totalChunks: 0,
          fileType,
          sectionType,
        },
      });
      return chunks;
    }
    
    // Group bullets with header
    let currentBullets: string[] = [];
    
    for (const bullet of bullets) {
      const testContent = headerText + '\n' + currentBullets.concat(bullet).join('\n');
      
      if (testContent.length > this.maxChunkSize && currentBullets.length > 0) {
        // Save current group
        chunks.push({
          content: headerText + '\n' + currentBullets.join('\n'),
          metadata: {
            fileName,
            chunkIndex,
            totalChunks: 0,
            fileType,
            sectionType,
          },
        });
        chunkIndex++;
        currentBullets = [bullet];
      } else {
        currentBullets.push(bullet);
      }
    }
    
    // Add remaining bullets
    if (currentBullets.length > 0) {
      chunks.push({
        content: headerText + '\n' + currentBullets.join('\n'),
        metadata: {
          fileName,
          chunkIndex,
          totalChunks: 0,
          fileType,
          sectionType,
        },
      });
    }
    
    return chunks;
  }

  private chunkText(text: string, fileName: string, fileType: string): DocumentChunk[] {
    // Fallback method for non-markdown files
    const chunks: DocumentChunk[] = [];
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    const words = cleanText.split(/\s+/);
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (const word of words) {
      const testChunk = currentChunk + (currentChunk ? ' ' : '') + word;
      
      if (testChunk.length > this.maxChunkSize && currentChunk) {
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            fileName,
            chunkIndex,
            totalChunks: 0,
            fileType,
          },
        });
        currentChunk = word;
        chunkIndex++;
      } else {
        currentChunk = testChunk;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          fileName,
          chunkIndex,
          totalChunks: 0,
          fileType,
        },
      });
    }
    
    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });
    
    return chunks;
  }
}