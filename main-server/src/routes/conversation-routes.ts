// src/routes/conversation-routes.ts
import express from 'express';
import { conversationController } from '../controllers/conversation-controller';

const router = express.Router();

// Routes defined with the controller methods
router.get('/user/:userId', (req, res, next) => conversationController.getUserConversations(req, res, next));
router.post('/', (req, res, next) => conversationController.createConversation(req, res, next));
router.get('/:id', (req, res, next) => conversationController.getConversation(req, res, next));
router.put('/:id', (req, res, next) => conversationController.updateConversation(req, res, next));
router.delete('/:id', (req, res, next) => conversationController.deleteConversation(req, res, next));

export default router;