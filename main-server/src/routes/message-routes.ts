// src/routes/message-routes.ts
import express from 'express';
import { messageController } from '../controllers/message-controller';

const router = express.Router();

// Routes with controller methods
router.get('/conversation/:conversationId', (req, res, next) => 
  messageController.getConversationMessages(req, res, next)
);

router.post('/', (req, res, next) => 
  messageController.createMessage(req, res, next)
);

router.get('/:id', (req, res, next) => 
  messageController.getMessage(req, res, next)
);

router.post('/:id/feedback', (req, res, next) => 
  messageController.addFeedback(req, res, next)
);

export default router;