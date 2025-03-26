// File: packages/db-models/src/models/Conversation.ts
import { Model, DataTypes, Sequelize } from 'sequelize';

export class Conversation extends Model {
  public id!: number;
  public userId!: number;
  public title!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public lastMessageAt!: Date;
}

export function initConversationModel(sequelize: Sequelize): typeof Conversation {
  Conversation.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      field: 'user_id',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'last_message_at',
    },
  }, {
    sequelize,
    tableName: 'conversations',
    timestamps: true,
    underscored: true,
  });

  return Conversation;
}