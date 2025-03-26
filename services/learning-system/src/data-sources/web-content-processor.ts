import axios from 'axios';
import cheerio from 'cheerio';
import Database from '@ai-assistant/db-models';
import nlpService from '../services/nlp-service';

// Initialize database connection
const db = Database.getInstance();

export class WebContentProcessor {
  /**
   * Process a URL to extract knowledge
   * @param sourceId Learning source ID
   * @param taskId Task ID for tracking progress
   */
  async processUrl(sourceId: number, taskId: number): Promise<void> {
    try {
      // Update task status to processing
      await db.LearningTask.update(
        { 
          status: 'processing',
          progress: 0.1
        },
        { where: { id: taskId } }
      );
      
      // Get the learning source
      const source = await db.LearningSource.findByPk(sourceId);
      
      if (!source || !source.url) {
        throw new Error(`Invalid learning source: ${sourceId}`);
      }
      
      // Update source status to processing
      await source.update({ status: 'processing' });
      
      // Fetch the web page
      const html = await this.fetchWebPage(source.url);
      
      // Update task progress
      await db.LearningTask.update(
        { progress: 0.3 },
        { where: { id: taskId } }
      );
      
      // Extract title and main content
      const { title, content } = this.extractContent(html);
      
      // Update source with content
      await source.update({
        title,
        content,
        lastCrawled: new Date()
      });
      
      // Update task progress
      await db.LearningTask.update(
        { progress: 0.5 },
        { where: { id: taskId } }
      );
      
      // Process content with NLP
      const nlpResults = await nlpService.analyze(content);
      
      // Update task progress
      await db.LearningTask.update(
        { progress: 0.7 },
        { where: { id: taskId } }
      );
      
      // Store extracted knowledge
      await this.storeExtractedKnowledge(source, title, content, nlpResults);
      
      // Update source status to completed
      await source.update({ status: 'processed' });
      
      // Update task status to completed
      await db.LearningTask.update(
        { 
          status: 'completed',
          progress: 1.0,
          completedAt: new Date()
        },
        { where: { id: taskId } }
      );
    } catch (error) {
      console.error('[LEARNING] Error processing URL:', error);
      
      // Update source status to failed
      await db.LearningSource.update(
        { status: 'failed' },
        { where: { id: sourceId } }
      );
      
      // Update task status to failed
      await db.LearningTask.update(
        { 
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
          completedAt: new Date()
        },
        { where: { id: taskId } }
      );
      
      throw error;
    }
  }
  
  /**
   * Fetch a web page
   * @param url URL to fetch
   * @returns HTML content
   */
  private async fetchWebPage(url: string): Promise<string> {
    try {
      // Add http:// if missing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (AI Assistant Learning System) Node.js',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 10000 // 10 seconds timeout
      });
      
      return response.data;
    } catch (error) {
      console.error('[LEARNING] Error fetching web page:', error);
      throw new Error(`Failed to fetch URL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Extract title and main content from HTML
   * @param html HTML content
   * @returns Object with title and content
   */
  private extractContent(html: string): { title: string, content: string } {
    try {
      const $ = cheerio.load(html);
      
      // Extract title
      const title = $('title').text().trim() || 'Untitled';
      
      // Remove scripts, styles, and other non-content elements
      $('script, style, iframe, nav, footer, header, aside').remove();
      
      // Get the main content
      let content = '';
      
      // Try to find the main content area
      const mainSelectors = [
        'main',
        'article',
        '#content',
        '.content',
        '.post',
        '.article',
        '.entry',
        '#main'
      ];
      
      let mainElement = null;
      
      for (const selector of mainSelectors) {
        if ($(selector).length > 0) {
          mainElement = $(selector);
          break;
        }
      }
      
      if (mainElement) {
        // Extract text from main content area
        content = mainElement.text();
      } else {
        // Fall back to body content
        content = $('body').text();
      }
      
      // Clean up the content
      content = this.cleanContent(content);
      
      return { title, content };
    } catch (error) {
      console.error('[LEARNING] Error extracting content:', error);
      throw new Error(`Failed to extract content: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Clean up extracted content
   * @param content Raw content
   * @returns Cleaned content
   */
  private cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
      .trim();
  }
  
  /**
   * Store extracted knowledge from web content
   * @param source Learning source
   * @param title Page title
   * @param content Page content
   * @param nlpResults NLP analysis results
   */
  private async storeExtractedKnowledge(
    source: any,
    title: string,
    content: string,
    nlpResults: any
  ): Promise<void> {
    try {
      // Store the page title as knowledge
      await db.Knowledge.create({
        content: title,
        source: `web:${source.id}`,
        type: 'web_title',
        confidence: 0.7, // Higher confidence for title
        tags: ['web', 'title', source.url]
      });
      
      // Store the main content as knowledge (in chunks if too large)
      const MAX_CHUNK_SIZE = 1000;
      
      if (content.length <= MAX_CHUNK_SIZE) {
        // Store as a single knowledge entry
        await db.Knowledge.create({
          content,
          source: `web:${source.id}`,
          type: 'web_content',
          confidence: 0.5, // Medium confidence for web content
          tags: ['web', 'content', source.url]
        });
      } else {
        // Split into chunks
        const chunks = this.splitContentIntoChunks(content, MAX_CHUNK_SIZE);
        
        for (let i = 0; i < chunks.length; i++) {
          await db.Knowledge.create({
            content: chunks[i],
            source: `web:${source.id}`,
            type: 'web_content',
            confidence: 0.5, // Medium confidence for web content
            tags: ['web', 'content', `chunk:${i+1}/${chunks.length}`, source.url]
          });
        }
      }
      
      // Store extracted entities
      if (nlpResults.entities && nlpResults.entities.length > 0) {
        for (const entity of nlpResults.entities) {
          await db.Knowledge.create({
            content: JSON.stringify(entity),
            source: `web:${source.id}`,
            type: 'entity',
            confidence: 0.4, // Lower confidence for entities from web
            tags: ['web', 'entity', entity.type, source.url]
          });
        }
      }
      
      // Store extracted facts
      if (nlpResults.facts && nlpResults.facts.length > 0) {
        for (const fact of nlpResults.facts) {
          await db.Knowledge.create({
            content: fact.text,
            source: `web:${source.id}`,
            type: 'fact',
            confidence: 0.3, // Even lower confidence for facts from web
            tags: ['web', 'fact', source.url]
          });
        }
      }
    } catch (error) {
      console.error('[LEARNING] Error storing extracted knowledge:', error);
      throw error;
    }
  }
  
  /**
   * Split content into manageable chunks
   * @param content Content to split
   * @param maxChunkSize Maximum chunk size
   * @returns Array of content chunks
   */
  private splitContentIntoChunks(content: string, maxChunkSize: number): string[] {
    const chunks = [];
    const sentences = content.split(/[.!?]+/);
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      
      if (!trimmedSentence) continue;
      
      // If adding this sentence would exceed the chunk size, start a new chunk
      if (currentChunk.length + trimmedSentence.length + 1 > maxChunkSize) {
        chunks.push(currentChunk);
        currentChunk = trimmedSentence + '. ';
      } else {
        currentChunk += trimmedSentence + '. ';
      }
    }
    
    // Add the last chunk if not empty
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }
}