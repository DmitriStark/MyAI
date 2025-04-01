// src/controllers/message-controller.ts
import { Request, Response, NextFunction } from "express";
import axios from "axios";
import models from "../models";
import { Op } from "sequelize";
import { Sequelize } from "sequelize";

// Define interfaces for request bodies
interface MessageCreateRequest {
  userId: number;
  conversationId: number;
  content: string;
}

interface FeedbackCreateRequest {
  rating?: number;
  feedbackText?: string;
}

export class MessageController {
  /**
   * Get all messages for a conversation
   */
  public async getConversationMessages(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { conversationId } = req.params;

      const messages = await models.Message.findAll({
        where: { conversationId },
        order: [["createdAt", "ASC"]],
      });

      res.status(200).json(messages);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new message and wait for the response
   */
  public async createMessage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId, conversationId, content } =
        req.body as MessageCreateRequest;

      console.log(
        `[MESSAGE] Creating message for conversation ${conversationId} from user ${userId}`
      );

      // Validate conversation exists
      const conversation = await models.Conversation.findByPk(conversationId);
      if (!conversation) {
        console.error(`[MESSAGE] Conversation ${conversationId} not found`);
        res.status(404).json({ message: "Conversation not found" });
        return;
      }

      // Insert user message
      const message = await models.Message.create({
        conversationId,
        sender: "user",
        content,
        processed: false,
      });

      // Safely get the message ID
      const messageId =
        message.id || (message.dataValues && message.dataValues.id);

      // CRITICAL FIX: Ensure we have the correct createdAt value
      const messageCreatedAt =
        message.createdAt ||
        (message.dataValues && message.dataValues.createdAt);

      console.log(
        `[MESSAGE] Created message ${messageId} at ${messageCreatedAt}`
      );

      // Update conversation last_message_at
      await models.Conversation.update(
        { lastMessageAt: new Date() },
        { where: { id: conversationId } }
      );

      // Send to Core Service for processing
      try {
        const coreServiceUrl = process.env.CORE_SERVICE_URL
          ? `${process.env.CORE_SERVICE_URL}/api/process`
          : "http://core-service:3001/api/process";

        console.log(`[MESSAGE] Sending to core service at ${coreServiceUrl}`);

        // Check that the message ID is valid and properly formatted
        if (!messageId) {
          console.error(
            "[MESSAGE] Cannot send to Core Service: No valid message ID found"
          );
          throw new Error("No valid message ID found on created message");
        }

        console.log(`[MESSAGE] Sending message ID: ${messageId}`);

        const coreResponse = await axios.post(coreServiceUrl, {
          messageId: messageId,
          userId,
          conversationId,
        });

        console.log(`[MESSAGE] Core service response: ${coreResponse.status}`);

        // Also send directly to learning system
        const learningSystemUrl = process.env.LEARNING_SYSTEM_URL
          ? `${process.env.LEARNING_SYSTEM_URL}/api/learn`
          : "http://learning-system:3002/api/learn";

        console.log(
          `[MESSAGE] Sending to learning system at ${learningSystemUrl}`
        );

        const learnResponse = await axios.post(learningSystemUrl, {
          content,
          source: `user:${userId}`,
          type: "user_input",
          userId,
          conversationId,
        });

        console.log(
          `[MESSAGE] Learning system response: ${learnResponse.status}`
        );

        // CRITICAL FIX: Store the created timestamp for later use
        const messageTimestamp = messageCreatedAt || new Date();

        // Function to wait for and retrieve the assistant's response
        const waitForResponse = async (maxWaitMs = 10000): Promise<any> => {
          const startTime = Date.now();

          // Keep checking until timeout
          while (Date.now() - startTime < maxWaitMs) {
            try {
              console.log(
                `[MESSAGE] Looking for assistant messages after ${messageTimestamp}`
              );
              console.log(
                `[MESSAGE] Query params: conversationId=${conversationId}, sender=assistant`
              );

              // Check if we have a response
              const responses = await models.Message.findAll({
                where: {
                  conversationId,
                  sender: "assistant",
                  createdAt: {
                    [Op.gt]: messageTimestamp,
                  },
                },
                order: [["createdAt", "DESC"]],
                limit: 1,
              });

              if (responses && responses.length > 0) {
                // Log the complete response object
                console.log(
                  `[MESSAGE] Found response: ${JSON.stringify(responses[0])}`
                );
                return responses[0];
              }

              // Wait 500ms before checking again
              await new Promise((resolve) => setTimeout(resolve, 500));
            } catch (error) {
              console.error(`[MESSAGE] Error checking for response:`, error);
            }
          }

          // Timeout reached, no response found
          return null;
        };

        // Wait up to 5 seconds for the response
        const assistantResponse = await waitForResponse(5000);

        if (assistantResponse) {
          // Response found, return it with the original message
          console.log(
            `[MESSAGE] Returning assistant response: ${assistantResponse.dataValues.id}`
          );

          // Extract content from the response
          const responseContent =
            assistantResponse.content ||
            (assistantResponse.dataValues &&
              assistantResponse.dataValues.content) ||
            "";

          res.status(201).json({
            userMessage: {
              id: messageId,
              content,
              sender: "user",
            },
            assistantResponse: {
              id:
                assistantResponse.id ||
                (assistantResponse.dataValues &&
                  assistantResponse.dataValues.id),
              content: responseContent,
              sender: "assistant",
            },
            status: "complete",
          });
        } else {
          // No response yet, inform the client but don't wait longer
          console.log(
            `[MESSAGE] No immediate response available, returning message ID only`
          );

          res.status(202).json({
            userMessage: {
              id: messageId,
              content,
              sender: "user",
            },
            status: "processing",
            message:
              "Message received, but assistant response is still being generated. Use the status endpoint to check for responses.",
          });

          // Continue monitoring in the background for logging purposes
          let attempts = 0;
          const maxAttempts = 15;
          const checkInterval = 1000;

          const checkResponseInterval = setInterval(async () => {
            attempts++;

            const responses = await models.Message.findAll({
              where: {
                conversationId,
                sender: "assistant",
                createdAt: {
                  [Op.gt]: messageTimestamp,
                },
              },
              order: [["createdAt", "DESC"]],
              limit: 1,
            });

            if (responses && responses.length > 0) {
              clearInterval(checkResponseInterval);
              console.log(
                `[MESSAGE] Background check: Response found after ${attempts} attempts`
              );
            } else if (attempts >= maxAttempts) {
              clearInterval(checkResponseInterval);
              console.warn(
                `[MESSAGE] Background check: No response received after ${maxAttempts} attempts`
              );
            }
          }, checkInterval);
        }
      } catch (error: any) {
        console.error(
          "[MESSAGE] Error forwarding message:",
          error instanceof Error ? error.message : "Unknown error"
        );

        // Try to get more detailed error information
        let errorDetails = "Unknown error";
        if (error.response) {
          errorDetails = `Server responded with status ${
            error.response.status
          }: ${JSON.stringify(error.response.data)}`;
        } else if (error.request) {
          errorDetails = "No response received from server";
        } else {
          errorDetails = error.message || "Unknown error";
        }

        console.error(`[MESSAGE] Error details: ${errorDetails}`);

        res.status(201).json({
          id: messageId,
          status: "Message received but error in processing",
          error: errorDetails,
        });
      }
    } catch (error: unknown) {
      console.error("[MESSAGE] Unexpected error:", error);
      next(error);
    }
  }

  /**
   * Get a specific message
   */
  public async getMessage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const message = await models.Message.findByPk(id);

      if (!message) {
        res.status(404).json({ message: "Message not found" });
        return;
      }

      res.status(200).json(message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add feedback to a message
   */
  public async addFeedback(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { rating, feedbackText } = req.body as FeedbackCreateRequest;

      // Validate message exists
      const message = await models.Message.findByPk(id);
      if (!message) {
        res.status(404).json({ message: "Message not found" });
        return;
      }

      // Insert feedback
      const feedback = await models.Feedback.create({
        messageId: id,
        rating,
        feedbackText,
      });

      // Forward to learning system
      try {
        await axios.post(
          process.env.LEARNING_SYSTEM_URL + "/api/learn/feedback" ||
            "http://learning-system:3002/api/learn/feedback",
          {
            messageId: id,
            feedbackId: feedback.id,
            rating,
            feedbackText,
          }
        );

        res.status(201).json({
          id: feedback.id,
          status: "Feedback received and processing started",
        });
      } catch (error) {
        console.error(
          "Error forwarding feedback:",
          error instanceof Error ? error.message : "Unknown error"
        );
        res.status(201).json({
          id: feedback.id,
          status: "Feedback received but error in processing",
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get polling status - check for responses
   */
  public async checkResponseStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { messageId } = req.params;
      const { conversationId } = req.query;

      if (!conversationId) {
        res
          .status(400)
          .json({ message: "conversationId query parameter is required" });
        return;
      }

      // Get the original message
      const originalMessage = await models.Message.findByPk(messageId);
      if (!originalMessage) {
        res.status(404).json({ message: "Original message not found" });
        return;
      }

      // CRITICAL FIX: Ensure we have the correct createdAt value
      const originalMessageCreatedAt =
        originalMessage.createdAt ||
        (originalMessage.dataValues && originalMessage.dataValues.createdAt) ||
        new Date(0); // Fallback to epoch start if we can't get the timestamp

      // Find response messages
      const responses = await models.Message.findAll({
        where: {
          conversationId,
          sender: "assistant",
          createdAt: {
            [Op.gt]: originalMessageCreatedAt,
          },
        },
        order: [["createdAt", "DESC"]],
        limit: 1,
      });

      if (responses && responses.length > 0) {
        res.status(200).json({
          status: "complete",
          response: responses[0],
        });
      } else {
        res.status(200).json({
          status: "pending",
          message: "Response still being processed",
        });
      }
    } catch (error) {
      next(error);
    }
  }
}

// Export a single instance
export const messageController = new MessageController();
