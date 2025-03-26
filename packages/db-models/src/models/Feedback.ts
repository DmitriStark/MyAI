// File: packages/db-models/src/models/Feedback.ts
import { Model, DataTypes, Sequelize } from 'sequelize';

export class Feedback extends Model {
  public id!: number;
  public messageId!: number;
  public rating!: number | null;
  public feedbackText!: string | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

export function initFeedbackModel(sequelize: Sequelize): typeof Feedback {
  Feedback.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    messageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'messages',
        key: 'id',
      },
      field: 'message_id',
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    feedbackText: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'feedback_text',
    },
  }, {
    sequelize,
    tableName: 'feedback',
    timestamps: true,
    underscored: true,
  });

  return Feedback;
}