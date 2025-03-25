import natural from 'natural';

// Initialize NLP tools from the natural library
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;
const tfidf = new natural.TfIdf();
const analyzer = new natural.SentimentAnalyzer('English', stemmer, 'afinn');

// Interface for NLP analysis results
interface NLPResult {
  entities: any[];
  concepts: any[];
  facts: any[];
  sentiment: number;
  keywords: string[];
}

class NLPService {
  /**
   * Analyze text using NLP techniques
   * @param text Text to analyze
   * @returns NLP analysis results
   */
  async analyze(text: string): Promise<NLPResult> {
    // Default empty result
    const result: NLPResult = {
      entities: [],
      concepts: [],
      facts: [],
      sentiment: 0,
      keywords: []
    };
    
    try {
      // Extract entities (simple implementation - in a real system you would use a proper NER)
      result.entities = await this.extractEntities(text);
      
      // Extract concepts
      result.concepts = await this.extractConcepts(text);
      
      // Extract facts
      result.facts = await this.extractFacts(text);
      
      // Analyze sentiment
      result.sentiment = this.analyzeSentiment(text);
      
      // Extract keywords
      result.keywords = this.extractKeywords(text);
      
      return result;
    } catch (error) {
      console.error('[LEARNING] Error in NLP analysis:', error);
      return result;
    }
  }
  
  /**
   * Extract entities from text
   * @param text Text to analyze
   * @returns Array of entities
   */
  private async extractEntities(text: string): Promise<any[]> {
    const entities: any[] = [];
    
    // Tokenize the text
    const tokens = tokenizer.tokenize(text) || [];
    
    // Simple named entity detection - look for capitalized words
    // (This is a very simplistic approach - in a real system you would use a proper NER)
    let currentEntity = '';
    let inEntity = false;
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      // Skip punctuation and short words
      if (token.length <= 1 || /[^\w\s]/.test(token)) {
        if (inEntity) {
          // End of entity - add it to the list
          entities.push({
            text: currentEntity.trim(),
            type: this.guessEntityType(currentEntity),
            confidence: 0.6
          });
          
          currentEntity = '';
          inEntity = false;
        }
        continue;
      }
      
      // Check if the token is capitalized (potential named entity)
      if (token[0] === token[0].toUpperCase() && token !== 'I') {
        if (inEntity) {
          // Continue current entity
          currentEntity += ' ' + token;
        } else {
          // Start new entity
          currentEntity = token;
          inEntity = true;
        }
      } else {
        if (inEntity) {
          // End of entity - add it to the list
          entities.push({
            text: currentEntity.trim(),
            type: this.guessEntityType(currentEntity),
            confidence: 0.6
          });
          
          currentEntity = '';
          inEntity = false;
        }
      }
    }
    
    // Check if there's a remaining entity
    if (inEntity && currentEntity.trim().length > 0) {
      entities.push({
        text: currentEntity.trim(),
        type: this.guessEntityType(currentEntity),
        confidence: 0.6
      });
    }
    
    return entities;
  }
  
  /**
   * Try to guess the type of an entity based on its text
   * @param entity Entity text
   * @returns Guessed entity type
   */
  private guessEntityType(entity: string): string {
    // Simple rules to guess entity types
    // In a real system, you would use a trained classifier or external NER
    
    const text = entity.toLowerCase();
    
    // Location indicators
    if (text.includes('street') || 
        text.includes('avenue') || 
        text.includes('road') || 
        text.includes('drive') ||
        text.includes('city') ||
        text.includes('town') ||
        text.includes('country')) {
      return 'location';
    }
    
    // Person indicators
    if (text.includes('mr') || 
        text.includes('mrs') || 
        text.includes('ms') || 
        text.includes('dr') ||
        text.includes('prof')) {
      return 'person';
    }
    
    // Organization indicators
    if (text.includes('inc') || 
        text.includes('corp') || 
        text.includes('ltd') || 
        text.includes('company') ||
        text.includes('organization') ||
        text.includes('corporation')) {
      return 'organization';
    }
    
    // Date indicators
    if (text.includes('january') || 
        text.includes('february') || 
        text.includes('march') || 
        text.includes('april') ||
        text.includes('may') ||
        text.includes('june') ||
        text.includes('july') ||
        text.includes('august') ||
        text.includes('september') ||
        text.includes('october') ||
        text.includes('november') ||
        text.includes('december') ||
        /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(text)) {
      return 'date';
    }
    
    // Default
    return 'unknown';
  }
  
  /**
   * Extract concepts from text
   * @param text Text to analyze
   * @returns Array of concepts
   */
  private async extractConcepts(text: string): Promise<any[]> {
    // In a real implementation, this would use a more sophisticated approach
    // For now, we'll use TF-IDF to identify important terms
    
    const concepts: any[] = [];
    
    // Create a new TF-IDF instance instead of trying to reset the existing one
    const documentTfidf = new natural.TfIdf();
    
    // Add the document
    documentTfidf.addDocument(text);
    
    // Get the top terms
    const terms: { term: string; tfidf: number }[] = [];
    
    documentTfidf.listTerms(0).forEach(item => {
      // Skip short terms and numbers
      if (item.term.length > 3 && isNaN(Number(item.term))) {
        terms.push({
          term: item.term,
          tfidf: item.tfidf
        });
      }
    });
    
    // Sort by TF-IDF score
    terms.sort((a, b) => b.tfidf - a.tfidf);
    
    // Take the top terms as concepts
    const topTerms = terms.slice(0, 5);
    
    topTerms.forEach(term => {
      concepts.push({
        text: term.term,
        score: term.tfidf,
        type: 'concept'
      });
    });
    
    return concepts;
  }
  
  /**
   * Extract facts from text
   * @param text Text to analyze
   * @returns Array of facts
   */
  private async extractFacts(text: string): Promise<any[]> {
    // In a real implementation, this would use a more sophisticated approach
    // For now, we'll do a simple search for sentences that look like facts
    
    const facts: any[] = [];
    
    // Split into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    
    // Indicators of factual statements
    const factIndicators = [
      'is', 'are', 'was', 'were', 'has', 'have', 'can', 'will',
      'means', 'refers', 'equals', 'consists', 'contains'
    ];
    
    // Check each sentence
    sentences.forEach(sentence => {
      const clean = sentence.trim();
      
      // Skip short sentences
      if (clean.split(' ').length < 4) {
        return;
      }
      
      // Check if the sentence contains a fact indicator
      const hasFactIndicator = factIndicators.some(indicator => 
        new RegExp(`\\b${indicator}\\b`, 'i').test(clean)
      );
      
      if (hasFactIndicator) {
        facts.push({
          text: clean,
          confidence: 0.5,
          type: 'fact'
        });
      }
    });
    
    return facts;
  }
  
  /**
   * Analyze sentiment of text
   * @param text Text to analyze
   * @returns Sentiment score (-5 to 5)
   */
  private analyzeSentiment(text: string): number {
    // Tokenize and stem the words
    const tokens = tokenizer.tokenize(text) || [];
    const stems = tokens.map(token => stemmer.stem(token));
    
    // Get sentiment score
    const sentiment = analyzer.getSentiment(stems);
    
    return sentiment;
  }
  
  /**
   * Extract keywords from text
   * @param text Text to analyze
   * @returns Array of keywords
   */
  private extractKeywords(text: string): string[] {
    // Tokenize
    const tokens = tokenizer.tokenize(text) || [];
    
    // Remove stop words and short words
    const stopWords = natural.stopwords;
    const keywords = tokens.filter(token => 
      token.length > 3 && 
      !stopWords.includes(token.toLowerCase()) &&
      isNaN(Number(token))
    );
    
    // Get unique keywords
    const uniqueKeywords = [...new Set(keywords)];
    
    // Limit to top 10 keywords
    return uniqueKeywords.slice(0, 10);
  }
}

export default new NLPService();