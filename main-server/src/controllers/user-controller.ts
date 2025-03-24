// src/controllers/user-controller.ts
import { Request, Response, NextFunction } from 'express';
import models from '../models';

// Define interfaces for request bodies
interface UserCreateRequest {
  username: string;
  preferences?: Record<string, any>;
}

interface UserUpdateRequest {
  username?: string;
  preferences?: Record<string, any>;
}

export class UserController {
  /**
   * Get all users
   */
  public async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await models.User.findAll({
        attributes: ['id', 'username', 'createdAt']
      });
      
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new user
   */
  public async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, preferences } = req.body as UserCreateRequest;
      
      // Check if username exists
      const existingUser = await models.User.findOne({
        where: { username }
      });
      
      if (existingUser) {
        res.status(409).json({ message: 'Username already exists' });
        return;
      }
      
      // Create user
      const user = await models.User.create({
        username,
        preferences: preferences || {}
      });
      
      // Return user without preferences for security
      const safeUser = {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt
      };
      
      res.status(201).json(safeUser);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific user
   */
  public async getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const user = await models.User.findByPk(id, {
        attributes: ['id', 'username', 'preferences', 'createdAt']
      });
      
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a user
   */
  public async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { username, preferences } = req.body as UserUpdateRequest;
      
      // Check if user exists
      const user = await models.User.findByPk(id);
      
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      
      // Check if username is already taken by another user
      if (username && username !== user.username) {
        const existingUser = await models.User.findOne({
          where: { username }
        });
        
        if (existingUser) {
          res.status(409).json({ message: 'Username already exists' });
          return;
        }
      }
      
      // Update user
      await user.update({
        username: username || user.username,
        preferences: preferences || user.preferences
      });
      
      // Return updated user without sensitive fields
      const updatedUser = {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
      
      res.status(200).json(updatedUser);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a user
   */
  public async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      // Check if user exists
      const user = await models.User.findByPk(id);
      
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      
      // Delete user
      await user.destroy();
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
}

// Export a single instance
export const userController = new UserController();