import { Op } from "sequelize";
import models from "../models";
import templateEngine from "./template-engine";

// Default responses cache
export let defaultResponses: any[] = [];

class ResponseService {
  /**
   * Preload default responses for faster access
   */
  async preloadDefaultResponses(): Promise<void> {
    try {
      console.log("[RESPONSE] Preloading default responses");

      const responses = await models.DefaultResponse.findAll({
        order: [["priority", "DESC"]],
      });

      defaultResponses = responses;
      console.log(
        `[RESPONSE] Successfully preloaded ${responses.length} default responses`
      );
    } catch (error) {
      console.error("[RESPONSE] Error preloading default responses:", error);
      defaultResponses = [];
    }
  }

  /**
   * Safely extract content from a message object (handles Sequelize model)
   * @param message Message object or string
   * @returns Content as string
   */
  private extractMessageContent(message: any): string {
    if (!message) return "";

    // If it's already a string, return it
    if (typeof message === "string") return message;

    // Try to get content from dataValues (Sequelize model)
    if (message.dataValues && message.dataValues.content) {
      return message.dataValues.content;
    }

    // Try to get content directly
    if (message.content) {
      return message.content;
    }

    // If we can't find content, return empty string
    return "";
  }

  /**
   * Generate a response to a user message
   * @param userMessage User's message
   * @param context Conversation context
   * @returns Generated response and metadata
   */
  async generateResponse(
    userMessage: any,
    context: any
  ): Promise<{
    responseText: string;
    usedKnowledge: any[];
    usedDefaultResponse: boolean;
    usedTemplate: boolean;
    templateId: number | null;
    confidence: number;
  }> {
    try {
      // Extract message content safely
      const messageContent = this.extractMessageContent(userMessage);

      if (!messageContent) {
        console.log("[RESPONSE] Empty message content received");
        return {
          responseText: "",
          usedKnowledge: [],
          usedDefaultResponse: false,
          usedTemplate: false,
          templateId: null,
          confidence: 0,
        };
      }

      console.log(
        `[RESPONSE] Processing message: "${messageContent.substring(0, 50)}..."`
      );

      // Extract keywords for knowledge search
      const keywords = this.extractKeywords(messageContent);
      console.log(`[RESPONSE] Extracted keywords: ${keywords.join(", ")}`);
      
      // Check for override knowledge (negative feedback)
      const overrideKnowledge = await this.checkForOverrides(keywords, messageContent);
      
      // Default return values
      let responseText = "";
      let usedKnowledge = [];
      let usedDefaultResponse = false;
      let usedTemplate = false;
      let templateId = null;
      let confidence = 0;
      
      // If we have overrides from negative feedback, use them
      if (overrideKnowledge.length > 0) {
        console.log(`[RESPONSE] Found ${overrideKnowledge.length} override knowledge entries from feedback`);
        
        // Use highest confidence override
        const override = overrideKnowledge.sort((a, b) => 
          this.getKnowledgeConfidence(b) - this.getKnowledgeConfidence(a)
        )[0];
        
        // Find alternative response in the override or use a default
        try {
          const overrideData = JSON.parse(this.getKnowledgeContent(override));
          if (overrideData.alternative_response) {
            responseText = overrideData.alternative_response;
          } else {
            // Default response for overrides
            responseText = "I'm looking into this topic further. Can you tell me more specifically what you're looking for?";
          }
        } catch (e) {
          // Use default response if parsing fails
          responseText = "I'm learning more about this topic. Could you provide additional details about what you need?";
        }
        
        // Set response metadata
        usedKnowledge = [override];
        confidence = 0.75;
        
        return {
          responseText,
          usedKnowledge,
          usedDefaultResponse: false,
          usedTemplate: false,
          templateId: null,
          confidence,
        };
      }

      // Find relevant knowledge
      const relevantKnowledge = await this.findRelevantKnowledge(
        keywords,
        context,
        messageContent
      );
      console.log(
        `[RESPONSE] Found ${relevantKnowledge.length} relevant knowledge entries`
      );

      // Check if we have any feedback-based knowledge with high confidence
      const feedbackKnowledge = relevantKnowledge.filter(k => 
        this.getKnowledgeSource(k).startsWith('feedback:') && 
        this.getKnowledgeConfidence(k) >= 0.7
      );
      
      // If we have relevant knowledge, use it to generate a response
      if (relevantKnowledge.length > 0) {
        // If we have feedback knowledge, prioritize it
        if (feedbackKnowledge.length > 0) {
          console.log(`[RESPONSE] Using ${feedbackKnowledge.length} feedback-based knowledge entries`);
          
          // Generate direct response using feedback knowledge
          const generatedResponse = this.generateDirectResponse(
            messageContent,
            feedbackKnowledge,
            context
          );
          responseText = generatedResponse.response;
          confidence = generatedResponse.confidence;
          usedKnowledge = feedbackKnowledge;
        } else {
          // Try to use a response template first
          const templateResult = await this.tryUseTemplate(
            messageContent,
            relevantKnowledge,
            context
          );

          if (templateResult.success) {
            responseText = templateResult.response;
            usedTemplate = true;
            templateId = templateResult.templateId;
            confidence = templateResult.confidence;
            usedKnowledge = relevantKnowledge;
            console.log(
              `[RESPONSE] Used template #${templateId} with confidence ${confidence}`
            );
          } else {
            // If no template matches, generate a direct response
            const generatedResponse = this.generateDirectResponse(
              messageContent,
              relevantKnowledge,
              context
            );
            responseText = generatedResponse.response;
            confidence = generatedResponse.confidence;
            usedKnowledge = relevantKnowledge;
            console.log(
              `[RESPONSE] Generated direct response with confidence ${confidence}`
            );
          }
        }
      } else {
        // No relevant knowledge, try to use a default response
        try {
          responseText = await this.getDefaultResponse(
            context?.contextType || "general"
          );
          if (responseText && responseText.trim().length > 0) {
            usedDefaultResponse = true;
            confidence = 0.1; // Very low confidence for default responses
            console.log(
              `[RESPONSE] Using default response for context "${
                context?.contextType || "general"
              }"`
            );
          } else {
            // No default response found
            console.warn(
              "[RESPONSE] No default response found, returning empty"
            );
            return {
              responseText: "",
              usedKnowledge: [],
              usedDefaultResponse: false,
              usedTemplate: false,
              templateId: null,
              confidence: 0,
            };
          }
        } catch (defaultError) {
          console.error(
            "[RESPONSE] Error getting default response:",
            defaultError
          );
          return {
            responseText: "",
            usedKnowledge: [],
            usedDefaultResponse: false,
            usedTemplate: false,
            templateId: null,
            confidence: 0,
          };
        }
      }

      return {
        responseText,
        usedKnowledge,
        usedDefaultResponse,
        usedTemplate,
        templateId,
        confidence,
      };
    } catch (error) {
      console.error("[RESPONSE] Error generating response:", error);

      // Return empty result
      return {
        responseText: "",
        usedKnowledge: [],
        usedDefaultResponse: false,
        usedTemplate: false,
        templateId: null,
        confidence: 0,
      };
    }
  }
  
  /**
   * Check for override knowledge entries based on feedback
   * @param keywords Extracted keywords
   * @param messageContent Original message
   * @returns Array of override knowledge entries
   */
  private async checkForOverrides(keywords: string[], messageContent: string): Promise<any[]> {
    try {
      if (keywords.length === 0) {
        return [];
      }
      
      // Build keyword conditions
      const keywordConditions = keywords.map(keyword => ({
        content: {
          [Op.iLike]: `%${keyword}%`
        }
      }));
      
      // Look for override entries that match keywords
      const overrideEntries = await models.Knowledge.findAll({
        where: {
          type: 'override',
          [Op.or]: keywordConditions
        },
        order: [
          ['confidence', 'DESC']
        ],
        limit: 3
      });
      
      return overrideEntries;
    } catch (error) {
      console.error("[RESPONSE] Error checking for overrides:", error);
      return [];
    }
  }

  /**
   * Extract keywords from a message for knowledge search
   * @param message User message
   * @returns Array of keywords
   */
  private extractKeywords(message: string): string[] {
    // Safety check
    if (!message || typeof message !== "string") {
      return [];
    }

    // Simple keyword extraction for now
    // In a real implementation, this would use more sophisticated NLP

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

    try {
      // Tokenize and filter
      const keywords = message
        .toLowerCase()
        .replace(/[^\w\s]/g, "") // Remove punctuation
        .split(/\s+/) // Split by whitespace
        .filter(
          (word) =>
            word.length > 3 && // Filter out short words
            !commonWords.includes(word) && // Filter out common words
            !/^\d+$/.test(word) // Filter out numbers
        );

      // Get unique keywords
      const uniqueKeywords = [...new Set(keywords)];

      // Return top keywords (8 instead of 5 to improve matching)
      return uniqueKeywords.slice(0, 8);
    } catch (error) {
      console.error("[RESPONSE] Error extracting keywords:", error);
      return [];
    }
  }

  /**
   * Find knowledge relevant to the user's message
   * @param keywords Keywords extracted from the message
   * @param context Conversation context
   * @param originalMessage Original user message for full-text search
   * @returns Array of relevant knowledge entries
   */
  private async findRelevantKnowledge(
    keywords: string[],
    context: any,
    originalMessage: string
  ): Promise<any[]> {
    try {
      // Safety check
      if (!originalMessage || typeof originalMessage !== "string") {
        return [];
      }

      // First, check for high-confidence feedback-based knowledge
      const feedbackEntries = await models.Knowledge.findAll({
        where: {
          source: { [Op.like]: 'feedback:%' },
          confidence: { [Op.gte]: 0.7 }
        },
        order: [
          ['confidence', 'DESC'],
          ['createdAt', 'DESC'],
        ],
        limit: 5
      });
      
      // If we have feedback entries, include them
      let allEntries = [...feedbackEntries];
      
      // Always perform keyword search to supplement results
      if (keywords.length === 0) {
        // If no keywords were extracted, try to use the whole message
        // for a more general search
        const contentEntries = await models.Knowledge.findAll({
          where: {
            content: {
              [Op.iLike]: `%${originalMessage.substring(0, 100)}%`,
            },
            id: {
              [Op.notIn]: allEntries.map(e => e.id)
            }
          },
          order: [
            ["confidence", "DESC"],
            ["lastAccessed", "DESC"],
          ],
          limit: 5,
        });
        
        allEntries = [...allEntries, ...contentEntries];
      } else {
        // Create keyword conditions
        const keywordConditions = keywords.map((keyword) => ({
          content: {
            [Op.iLike]: `%${keyword}%`
          }
        }));

        // Find knowledge entries matching any of the keywords
        const keywordEntries = await models.Knowledge.findAll({
          where: {
            [Op.or]: keywordConditions,
            id: {
              [Op.notIn]: allEntries.map(e => e.id)
            }
          },
          order: [
            ["confidence", "DESC"],
            ["lastAccessed", "DESC"],
          ],
          limit: 10
        });
        
        allEntries = [...allEntries, ...keywordEntries];
      }
      
      // If we have enough entries already, return them
      if (allEntries.length >= 3) {
        return allEntries;
      }

      // If we still need more entries, try broader content matching
      const additionalEntries = await models.Knowledge.findAll({
        where: {
          content: {
            [Op.iLike]: `%${originalMessage.substring(0, 100)}%`
          },
          id: {
            [Op.notIn]: allEntries.map((e) => e.id)
          }
        },
        order: [
          ["confidence", "DESC"],
          ["lastAccessed", "DESC"],
        ],
        limit: 5
      });

      // Combine all results
      return [...allEntries, ...additionalEntries];
    } catch (error) {
      console.error("[RESPONSE] Error finding relevant knowledge:", error);
      return [];
    }
  }

  /**
   * Try to use a response template
   * @param userMessage User's message
   * @param knowledge Relevant knowledge entries
   * @param context Conversation context
   * @returns Template response result
   */
  private async tryUseTemplate(
    userMessage: string,
    knowledge: any[],
    context: any
  ): Promise<{
    success: boolean;
    response: string;
    templateId: number | null;
    confidence: number;
  }> {
    try {
      // Get suitable templates based on context
      const contextType =
        context && context.contextType ? context.contextType : "general";

      const templates = await models.ResponseTemplate.findAll({
        where: {
          [Op.or]: [
            { context: contextType },
            { context: null }, // General templates
          ],
        },
        order: [["usage", "DESC"]],
        limit: 5,
      });

      if (templates.length === 0) {
        return {
          success: false,
          response: "",
          templateId: null,
          confidence: 0,
        };
      }

      // Prepare data for template engine
      const templateData = {
        userMessage,
        knowledge: knowledge.map((k) => ({
          content: this.parseKnowledgeContent(this.getKnowledgeContent(k)),
          type: this.getKnowledgeType(k),
          confidence: this.getKnowledgeConfidence(k),
          source: this.getKnowledgeSource(k)
        })),
        context
      };

      // Try each template
      for (const template of templates) {
        try {
          const templateContent = this.getTemplateContent(template);
          if (!templateContent) continue;

          const renderedResponse = templateEngine.render(
            templateContent,
            templateData
          );

          // If the template rendered successfully, use it
          if (renderedResponse && renderedResponse.length > 0) {
            return {
              success: true,
              response: renderedResponse,
              templateId: this.getTemplateId(template),
              confidence: 0.7, // Higher confidence for template-based responses
            };
          }
        } catch (templateError) {
          console.error(`[RESPONSE] Error rendering template:`, templateError);
          // Continue to the next template
        }
      }

      // If no template worked, return failure
      return {
        success: false,
        response: "",
        templateId: null,
        confidence: 0,
      };
    } catch (error) {
      console.error("[RESPONSE] Error using templates:", error);
      return {
        success: false,
        response: "",
        templateId: null,
        confidence: 0,
      };
    }
  }

  /**
   * Safely get template content from template object
   */
  private getTemplateContent(template: any): string {
    if (!template) return "";

    if (template.dataValues && template.dataValues.template) {
      return template.dataValues.template;
    }

    if (template.template) {
      return template.template;
    }

    return "";
  }

  /**
   * Safely get template ID from template object
   */
  private getTemplateId(template: any): number | null {
    if (!template) return null;

    if (template.dataValues && template.dataValues.id) {
      return template.dataValues.id;
    }

    if (template.id) {
      return template.id;
    }

    return null;
  }

  /**
   * Safely get knowledge content from knowledge object
   */
  private getKnowledgeContent(knowledge: any): string {
    if (!knowledge) return "";

    if (knowledge.dataValues && knowledge.dataValues.content) {
      return knowledge.dataValues.content;
    }

    if (knowledge.content) {
      return knowledge.content;
    }

    return "";
  }
  
  /**
   * Safely get knowledge source from knowledge object
   */
  private getKnowledgeSource(knowledge: any): string {
    if (!knowledge) return "";

    if (knowledge.dataValues && knowledge.dataValues.source) {
      return knowledge.dataValues.source;
    }

    if (knowledge.source) {
      return knowledge.source;
    }

    return "";
  }

  /**
   * Safely get knowledge type from knowledge object
   */
  private getKnowledgeType(knowledge: any): string {
    if (!knowledge) return "unknown";

    if (knowledge.dataValues && knowledge.dataValues.type) {
      return knowledge.dataValues.type;
    }

    if (knowledge.type) {
      return knowledge.type;
    }

    return "unknown";
  }

  /**
   * Safely get knowledge confidence from knowledge object
   */
  private getKnowledgeConfidence(knowledge: any): number {
    if (!knowledge) return 0;

    if (
      knowledge.dataValues &&
      typeof knowledge.dataValues.confidence === "number"
    ) {
      return knowledge.dataValues.confidence;
    }

    if (typeof knowledge.confidence === "number") {
      return knowledge.confidence;
    }

    return 0;
  }

  /**
   * Generate a direct response based on knowledge
   * @param userMessage User's message
   * @param knowledge Relevant knowledge entries
   * @param context Conversation context
   * @returns Generated response and confidence
   */
  private generateDirectResponse(
    userMessage: string,
    knowledge: any[],
    context: any
  ): {
    response: string;
    confidence: number;
  } {
    try {
      // Sort knowledge by confidence
      const sortedKnowledge = [...knowledge].sort(
        (a, b) =>
          this.getKnowledgeConfidence(b) - this.getKnowledgeConfidence(a)
      );

      // Check if we have feedback-based knowledge first
      const feedbackKnowledge = sortedKnowledge.filter(k =>
        this.getKnowledgeSource(k).startsWith('feedback:')
      );
      
      if (feedbackKnowledge.length > 0) {
        // Use feedback knowledge directly with high confidence
        return {
          response: this.formatKnowledgeResponse(feedbackKnowledge, context, false),
          confidence: 0.85 // Higher confidence for feedback-based responses
        };
      }

      // Get high-confidence knowledge
      const highConfidenceKnowledge = sortedKnowledge.filter(
        (k) => this.getKnowledgeConfidence(k) > 0.7
      );

      // If we have high-confidence knowledge, use it directly
      if (highConfidenceKnowledge.length > 0) {
        return {
          response: this.formatKnowledgeResponse(
            highConfidenceKnowledge,
            context,
            false
          ),
          confidence: 0.8,
        };
      }

      // Get medium-confidence knowledge
      const mediumConfidenceKnowledge = sortedKnowledge.filter(
        (k) => this.getKnowledgeConfidence(k) > 0.4
      );

      // If we have medium-confidence knowledge, use it with uncertainty
      if (mediumConfidenceKnowledge.length > 0) {
        return {
          response: this.formatKnowledgeResponse(
            mediumConfidenceKnowledge,
            context,
            true
          ),
          confidence: 0.5,
        };
      }

      // If we only have low-confidence knowledge, use it with high uncertainty
      return {
        response: `I'm not entirely sure, but ${this.formatKnowledgeResponse(
          sortedKnowledge,
          context,
          true
        ).toLowerCase()}`,
        confidence: 0.3,
      };
    } catch (error) {
      console.error("[RESPONSE] Error generating direct response:", error);
      return {
        response: "",
        confidence: 0.1,
      };
    }
  }

  /**
   * Format a response from knowledge entries
   * @param knowledge Knowledge entries to use
   * @param context Conversation context
   * @param withUncertainty Whether to express uncertainty
   * @returns Formatted response
   */
  private formatKnowledgeResponse(
    knowledge: any[],
    context: any,
    withUncertainty: boolean
  ): string {
    try {
      // Safety check
      if (!knowledge || knowledge.length === 0) {
        return "";
      }

      // Use the top 1-2 knowledge entries
      const topKnowledge = knowledge.slice(0, 2);

      // Format the response based on knowledge types
      let response = "";

      // If all knowledge is the same type, format accordingly
      const knowledgeTypes = new Set(
        topKnowledge.map((k) => this.getKnowledgeType(k))
      );

      if (knowledgeTypes.size === 1) {
        const type = this.getKnowledgeType(topKnowledge[0]);

        switch (type) {
          case "fact":
            // For facts, just join them
            response = topKnowledge
              .map((k) => this.cleanContent(this.getKnowledgeContent(k)))
              .join(". ");
            break;

          case "entity":
            // For entities, format as descriptions
            response = topKnowledge
              .map((k) => {
                const entity = this.parseKnowledgeContent(
                  this.getKnowledgeContent(k)
                );
                return `${entity.text || "This"} is ${
                  entity.type === "unknown" ? "a" : `a ${entity.type}`
                }`;
              })
              .join(". ");
            break;

          case "concept":
            // For concepts, describe them
            response = topKnowledge
              .map((k) => {
                const concept = this.parseKnowledgeContent(
                  this.getKnowledgeContent(k)
                );
                return `${concept.text || "This"} is an important concept`;
              })
              .join(". ");
            break;
            
          case "feedback":
            // For feedback, use content directly with high confidence
            response = topKnowledge
              .map((k) => this.cleanContent(this.getKnowledgeContent(k)))
              .join(". ");
            break;

          default:
            // For other types, just use the content directly
            response = topKnowledge
              .map((k) => this.cleanContent(this.getKnowledgeContent(k)))
              .join(". ");
        }
      } else {
        // Mixed knowledge types, just combine them
        response = topKnowledge
          .map((k) => this.cleanContent(this.getKnowledgeContent(k)))
          .join(". ");
      }

      // Add uncertainty if needed
      if (withUncertainty) {
        const uncertaintyPhrases = [
          "Based on what I've learned",
          "From what I understand",
          "According to my knowledge",
          "From the information I have",
        ];

        const randomPhrase =
          uncertaintyPhrases[
            Math.floor(Math.random() * uncertaintyPhrases.length)
          ];
        response = `${randomPhrase}, ${response.toLowerCase()}`;
      }

      return response || "";
    } catch (error) {
      console.error("[RESPONSE] Error formatting knowledge response:", error);
      return "";
    }
  }

  /**
   * Clean up knowledge content for response
   * @param content Knowledge content
   * @returns Cleaned content
   */
  private cleanContent(content: string): string {
    if (!content) return "";

    // Try to parse JSON content
    try {
      const parsed = JSON.parse(content);

      // Handle different object structures
      if (parsed.text) {
        return parsed.text;
      } else if (parsed.content) {
        return parsed.content;
      } else {
        return JSON.stringify(parsed);
      }
    } catch (e) {
      // Not JSON, return as is
      return content;
    }
  }

  /**
   * Parse knowledge content, handling JSON if needed
   * @param content Knowledge content
   * @returns Parsed content
   */
  private parseKnowledgeContent(content: string): any {
    if (!content) return { text: "", type: "unknown" };

    try {
      return JSON.parse(content);
    } catch (e) {
      // Not JSON, return as text
      return { text: content, type: "text" };
    }
  }

  /**
   * Get a default response from the database
   * @param context Context type for selecting an appropriate response
   * @returns Default response text
   */
  private async getDefaultResponse(
    context: string = "general"
  ): Promise<string> {
    try {
      console.log(
        `[RESPONSE] Getting default response for context: ${context}`
      );

      // Try to get from in-memory cache first
      if (defaultResponses && defaultResponses.length > 0) {
        console.log(
          `[RESPONSE] Checking ${defaultResponses.length} cached default responses`
        );

        // Find context-specific responses
        const contextResponses = defaultResponses.filter((r) => {
          const responseContext = r.dataValues
            ? r.dataValues.context
            : r.context;
          return responseContext === context;
        });

        if (contextResponses.length > 0) {
          // Choose a random response from the context-specific ones
          const randomIndex = Math.floor(
            Math.random() * contextResponses.length
          );
          const response = contextResponses[randomIndex];
          const responseText = response.dataValues
            ? response.dataValues.responseText
            : response.responseText;
          console.log(`[RESPONSE] Using cached ${context} response`);
          return responseText;
        }

        // If no context-specific responses, use general ones
        const generalResponses = defaultResponses.filter((r) => {
          const responseContext = r.dataValues
            ? r.dataValues.context
            : r.context;
          return !responseContext || responseContext === "general";
        });

        if (generalResponses.length > 0) {
          // Choose a random response from the general ones
          const randomIndex = Math.floor(
            Math.random() * generalResponses.length
          );
          const response = generalResponses[randomIndex];
          const responseText = response.dataValues
            ? response.dataValues.responseText
            : response.responseText;
          console.log(`[RESPONSE] Using cached general response`);
          return responseText;
        }
      }

      console.log(`[RESPONSE] No suitable cached responses, querying database`);

      // If no loaded responses or none found, fetch from the database
      const dbResponses = await models.DefaultResponse.findAll({
        where: {
          [Op.or]: [{ context }, { context: "general" }],
        },
        order: [
          ["priority", "DESC"],
          [models.sequelize.fn("RANDOM"), "ASC"],
        ],
        limit: 1,
      });

      console.log(
        `[RESPONSE] Database query returned ${dbResponses.length} responses`
      );

      if (dbResponses.length > 0) {
        const responseText = dbResponses[0].dataValues
          ? dbResponses[0].dataValues.responseText
          : dbResponses[0].responseText;

        // Add to cache for future use
        if (
          !defaultResponses.some(
            (r) =>
              (r.dataValues?.id || r.id) ===
              (dbResponses[0].dataValues?.id || dbResponses[0].id)
          )
        ) {
          defaultResponses.push(dbResponses[0]);
        }

        console.log(`[RESPONSE] Using database response`);
        return responseText;
      }

      // If we still have no responses, log this
      console.warn(
        `[RESPONSE] No default responses found in database for context: ${context}`
      );

      // Return empty string to indicate no default response was found
      return "";
    } catch (error) {
      console.error("[RESPONSE] Error getting default response:", error);
      return "";
    }
  }
}

export default new ResponseService();