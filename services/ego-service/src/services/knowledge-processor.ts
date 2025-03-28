import { Op } from "sequelize";
import models from "../models";
import insightService from "./insight-service";

class KnowledgeProcessor {
  /**
   * Process a message in the background to extract deeper insights
   * @param messageId Message ID to process
   * @param userId User ID
   * @param conversationId Conversation ID
   */
  async processMessageBackground(
    messageId: number,
    userId: number,
    conversationId: number
  ): Promise<void> {
    // Process in the next tick to avoid blocking the response
    setImmediate(async () => {
      try {
        console.log(`[EGO] Processing message ${messageId} in the background`);

        // Get the message
        const message = await models.Message.findByPk(messageId);

        if (!message) {
          console.error(`[EGO] Message ${messageId} not found`);
          return;
        }

        // Get conversation context (recent messages)
        const conversationMessages = await models.Message.findAll({
          where: { conversationId },
          order: [["createdAt", "ASC"]],
          limit: 10,
        });

        // Extract deeper patterns and insights
        await this.analyzeConversationPatterns(conversationMessages, userId);

        // Look for knowledge gaps
        await this.identifyKnowledgeGaps(message.dataValues.content);

        // Generate synthesized knowledge
        await this.synthesizeKnowledge(messageId, userId);

        console.log(
          `[EGO] Completed background processing for message ${messageId}`
        );
      } catch (error) {
        console.error(`[EGO] Error in background message processing:`, error);
      }
    });
  }

  /**
   * Analyze patterns in a conversation
   * @param messages Array of messages in the conversation
   * @param userId User ID
   */
  private async analyzeConversationPatterns(
    messages: any[],
    userId: number
  ): Promise<void> {
    try {
      if (messages.length < 3) {
        // Not enough messages to analyze patterns
        return;
      }

      // Extract user messages and assistant responses
      const userMessages = messages.filter((m) => m.sender === "user");
      const assistantMessages = messages.filter(
        (m) => m.sender === "assistant"
      );

      if (userMessages.length < 2 || assistantMessages.length < 2) {
        // Not enough of each type to analyze
        return;
      }

      // Look for repeated questions from the user
      const userContents = userMessages.map((m) => m.content.toLowerCase());
      const repeatedQuestions = this.findRepeatedPhrases(userContents);

      if (repeatedQuestions.length > 0) {
        // User is asking similar questions repeatedly - potential confusion
        await insightService.createInsight({
          type: "repeated_question",
          content: JSON.stringify({
            questions: repeatedQuestions,
            userId,
            messageCount: userMessages.length,
          }),
          source: `conversation_analysis:${messages[0].conversationId}`,
          confidence: 0.7,
        });
      }

      // Check for short responses that might indicate inadequate answers
      const shortResponses = assistantMessages.filter(
        (m) => m.content.length < 50
      );

      if (
        shortResponses.length > 2 &&
        shortResponses.length / assistantMessages.length > 0.5
      ) {
        // More than half of responses are short - potential quality issue
        await insightService.createInsight({
          type: "short_responses",
          content: JSON.stringify({
            shortResponseCount: shortResponses.length,
            totalResponseCount: assistantMessages.length,
            userId,
          }),
          source: `conversation_analysis:${messages[0].conversationId}`,
          confidence: 0.6,
        });
      }
    } catch (error) {
      console.error("[EGO] Error analyzing conversation patterns:", error);
    }
  }

  /**
   * Find repeated phrases in an array of text
   * @param texts Array of text strings
   * @returns Array of repeated phrases
   */
  private findRepeatedPhrases(texts: string[]): string[] {
    const phrases: { [key: string]: number } = {};
    const repeated: string[] = [];

    // Simple approach: look for 3+ word phrases that appear more than once
    for (const text of texts) {
      const words = text.split(/\s+/);

      if (words.length < 3) continue;

      for (let i = 0; i <= words.length - 3; i++) {
        const phrase = words.slice(i, i + 3).join(" ");
        phrases[phrase] = (phrases[phrase] || 0) + 1;

        if (phrases[phrase] > 1 && !repeated.includes(phrase)) {
          repeated.push(phrase);
        }
      }
    }

    return repeated;
  }

  /**
   * Identify knowledge gaps based on message content
   * @param content Message content
   */
  private async identifyKnowledgeGaps(content: string): Promise<void> {
    try {
      // Look for question phrases that might indicate knowledge gaps
      const questionIndicators = [
        "what is",
        "how do",
        "why does",
        "can you explain",
        "tell me about",
        "define",
        "meaning of",
      ];

      const contentLower = content.toLowerCase();

      for (const indicator of questionIndicators) {
        if (contentLower.includes(indicator)) {
          // Extract the potential topic being asked about
          const indexOfIndicator = contentLower.indexOf(indicator);
          const afterIndicator = content
            .substring(indexOfIndicator + indicator.length)
            .trim();
          const topic = afterIndicator.split(/[.?!,:;]/)[0].trim();

          if (topic && topic.length > 3 && topic.length < 50) {
            // Check if we have knowledge about this topic
            const relatedKnowledge = await models.Knowledge.count({
              where: {
                content: {
                  [Op.iLike]: `%${topic}%`,
                },
              },
            });

            if (relatedKnowledge < 3) {
              // Potential knowledge gap
              await insightService.createInsight({
                type: "knowledge_gap",
                content: JSON.stringify({
                  topic,
                  indicator,
                  relatedKnowledgeCount: relatedKnowledge,
                }),
                source: "message_analysis",
                confidence: 0.5 + (relatedKnowledge === 0 ? 0.3 : 0),
              });
            }
          }

          break; // Only extract one knowledge gap per message
        }
      }
    } catch (error) {
      console.error("[EGO] Error identifying knowledge gaps:", error);
    }
  }

  /**
   * Synthesize new knowledge from existing knowledge
   * @param messageId Message ID that triggered the synthesis
   * @param userId User ID
   */
  private async synthesizeKnowledge(
    messageId: number,
    userId: number
  ): Promise<void> {
    try {
      // Get message content
      const message = await models.Message.findByPk(messageId);

      if (!message) return;
      // Extract potential key terms from the message
      const keyTerms = this.extractKeyTerms(message.dataValues.content);

      if (keyTerms.length === 0) return;

      // Find related knowledge for these terms
      const knowledgePromises = keyTerms.map((term) =>
        models.Knowledge.findAll({
          where: {
            content: {
              [Op.iLike]: `%${term}%`,
            },
          },
          order: [["confidence", "DESC"]],
          limit: 5,
        })
      );

      const knowledgeResults = await Promise.all(knowledgePromises);

      // Flatten and deduplicate knowledge entries
      const knowledgeMap = new Map();
      knowledgeResults.flat().forEach((k) => {
        if (!knowledgeMap.has(k.id)) {
          knowledgeMap.set(k.id, k);
        }
      });

      const relatedKnowledge = Array.from(knowledgeMap.values());

      if (relatedKnowledge.length < 2) return; // Not enough to synthesize

      // Generate synthesized knowledge
      // In a real implementation, this would use more sophisticated techniques
      for (let i = 0; i < relatedKnowledge.length - 1; i++) {
        const k1 = relatedKnowledge[i];
        const k2 = relatedKnowledge[i + 1];

        // Don't synthesize if confidence is too low
        if (k1.confidence < 0.5 || k2.confidence < 0.5) continue;

        // Create a synthesized knowledge insight
        await insightService.createInsight({
          type: "synthesized_knowledge",
          content: JSON.stringify({
            knowledge1: { id: k1.id, content: k1.content, type: k1.type },
            knowledge2: { id: k2.id, content: k2.content, type: k2.type },
            synthesis: `Relationship between ${k1.type} and ${k2.type} based on user query`,
          }),
          source: `message_synthesis:${messageId}`,
          confidence: Math.min(k1.confidence, k2.confidence) * 0.8,
        });
      }
    } catch (error) {
      console.error("[EGO] Error synthesizing knowledge:", error);
    }
  }

  /**
   * Extract key terms from text
   * @param text Text to extract terms from
   * @returns Array of key terms
   */
  private extractKeyTerms(text: string): string[] {
    // Simple implementation - remove common words and extract key terms
    const commonWords = [
      "a",
      "an",
      "the",
      "is",
      "are",
      "was",
      "were",
      "to",
      "of",
      "and",
      "in",
      "on",
      "at",
      "by",
      "for",
      "with",
      "about",
      "like",
      "from",
      "but",
      "or",
      "as",
      "what",
      "when",
      "where",
      "why",
      "how",
      "who",
      "which",
      "there",
      "here",
      "this",
      "that",
      "these",
      "those",
      "me",
      "you",
      "it",
      "we",
      "they",
      "their",
      "them",
      "i",
      "my",
      "your",
      "his",
      "her",
      "its",
      "our",
    ];

    // Tokenize and filter
    const tokens = text
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .split(/\s+/) // Split by whitespace
      .filter(
        (word) =>
          word.length > 3 && // Filter out short words
          !commonWords.includes(word) && // Filter out common words
          !/^\d+$/.test(word) // Filter out numbers
      );

    // Get unique tokens
    const uniqueTokens = [...new Set(tokens)];

    // Return top terms (limit to 5)
    return uniqueTokens.slice(0, 5);
  }

  /**
   * Consolidate knowledge in the background
   * @param taskId Task ID for the consolidation
   */
  async consolidateKnowledgeBackground(taskId: number): Promise<void> {
    // Run in the next tick to avoid blocking
    setImmediate(async () => {
      try {
        console.log(`[EGO] Starting knowledge consolidation task ${taskId}`);

        // Update task status
        await models.KnowledgeConsolidation.update(
          { status: "processing" },
          { where: { id: taskId } }
        );

        // Get all knowledge entries with similar content
        const allKnowledge = await models.Knowledge.findAll({
          order: [["confidence", "DESC"]],
        });

        // Update task with knowledge count
        await models.KnowledgeConsolidation.update(
          { knowledgeCount: allKnowledge.length },
          { where: { id: taskId } }
        );

        // Find duplicate or near-duplicate knowledge
        const processed = new Set();
        const similarityPairs = [];

        for (let i = 0; i < allKnowledge.length; i++) {
          if (processed.has(allKnowledge[i].id)) continue;

          for (let j = i + 1; j < allKnowledge.length; j++) {
            if (processed.has(allKnowledge[j].id)) continue;

            const similarity = this.calculateSimilarity(
              allKnowledge[i].content,
              allKnowledge[j].content
            );

            if (similarity > 0.7) {
              similarityPairs.push({
                knowledge1: allKnowledge[i],
                knowledge2: allKnowledge[j],
                similarity,
              });

              processed.add(allKnowledge[j].id);
            }
          }

          processed.add(allKnowledge[i].id);
        }

        // Create insights for similar knowledge
        for (const pair of similarityPairs) {
          await insightService.createInsight({
            type: "knowledge_similarity",
            content: JSON.stringify({
              knowledge1: {
                id: pair.knowledge1.id,
                content: pair.knowledge1.content,
                confidence: pair.knowledge1.confidence,
              },
              knowledge2: {
                id: pair.knowledge2.id,
                content: pair.knowledge2.content,
                confidence: pair.knowledge2.confidence,
              },
              similarity: pair.similarity,
              recommendedAction: pair.similarity > 0.9 ? "merge" : "review",
            }),
            source: `consolidation:${taskId}`,
            confidence: pair.similarity,
          });
        }

        // Look for contradictions
        const contradictions = [];
        processed.clear();

        for (let i = 0; i < allKnowledge.length; i++) {
          if (processed.has(allKnowledge[i].id)) continue;

          for (let j = i + 1; j < allKnowledge.length; j++) {
            if (processed.has(allKnowledge[j].id)) continue;

            const contradiction = this.detectContradiction(
              allKnowledge[i].content,
              allKnowledge[j].content
            );

            if (contradiction) {
              contradictions.push({
                knowledge1: allKnowledge[i],
                knowledge2: allKnowledge[j],
                contradictionType: contradiction,
              });
            }
          }

          processed.add(allKnowledge[i].id);
        }

        // Create insights for contradictions
        for (const pair of contradictions) {
          await insightService.createInsight({
            type: "knowledge_contradiction",
            content: JSON.stringify({
              knowledge1: {
                id: pair.knowledge1.id,
                content: pair.knowledge1.content,
                confidence: pair.knowledge1.confidence,
              },
              knowledge2: {
                id: pair.knowledge2.id,
                content: pair.knowledge2.content,
                confidence: pair.knowledge2.confidence,
              },
              contradictionType: pair.contradictionType,
              recommendedAction: "resolve_contradiction",
            }),
            source: `consolidation:${taskId}`,
            confidence: 0.8,
          });
        }

        // Update task status to completed
        await models.KnowledgeConsolidation.update(
          {
            status: "completed",
            completedAt: new Date(),
          },
          { where: { id: taskId } }
        );

        console.log(`[EGO] Completed knowledge consolidation task ${taskId}`);
      } catch (error) {
        console.error(`[EGO] Error in knowledge consolidation:`, error);

        // Update task status to failed
        await models.KnowledgeConsolidation.update(
          {
            status: "failed",
            completedAt: new Date(),
          },
          { where: { id: taskId } }
        );
      }
    });
  }

  /**
   * Calculate similarity between two text strings
   * @param text1 First text
   * @param text2 Second text
   * @returns Similarity score (0-1)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    // Simple implementation of Jaccard similarity
    const set1 = new Set(text1.toLowerCase().split(/\s+/));
    const set2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...set1].filter((word) => set2.has(word)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Detect contradictions between knowledge entries
   * @param text1 First text
   * @param text2 Second text
   * @returns Contradiction type or null if no contradiction
   */
  private detectContradiction(text1: string, text2: string): string | null {
    // This is a simplified implementation
    // In a real system, this would use more sophisticated NLP

    const negationWords = [
      "not",
      "never",
      "no",
      "don't",
      "doesn't",
      "can't",
      "cannot",
      "isn't",
      "won't",
    ];

    // Check if one text contains negation of the other
    const text1Lower = text1.toLowerCase();
    const text2Lower = text2.toLowerCase();

    // If the texts are too different, they're not likely to be contradictions
    const similarity = this.calculateSimilarity(text1Lower, text2Lower);
    if (similarity < 0.3) return null;

    // Check for direct negation patterns
    for (const word of negationWords) {
      if (
        (text1Lower.includes(word) && !text2Lower.includes(word)) ||
        (!text1Lower.includes(word) && text2Lower.includes(word))
      ) {
        return "negation";
      }
    }

    // Check for opposing statements patterns
    const opposingPairs = [
      ["always", "never"],
      ["true", "false"],
      ["yes", "no"],
      ["can", "cannot"],
      ["does", "does not"],
      ["is", "is not"],
    ];

    for (const [word1, word2] of opposingPairs) {
      if (
        (text1Lower.includes(word1) && text2Lower.includes(word2)) ||
        (text1Lower.includes(word2) && text2Lower.includes(word1))
      ) {
        return "opposing_statement";
      }
    }

    return null;
  }
}
const knowledgeProcessor = new KnowledgeProcessor();

export default knowledgeProcessor;
