// File: packages/db-models/src/models/ProcessingTask.ts
import { Model, DataTypes, Sequelize } from 'sequelize';

export class ProcessingTask extends Model {
  public id!: number;
  public messageId!: number;
  public status!: string;
  public services!: { [key: string]: string };
  public createdAt!: Date;
  public updatedAt!: Date;
  public completedAt!: Date | null;
}

export function initProcessingTaskModel(sequelize: Sequelize): typeof ProcessingTask {
  ProcessingTask.init({
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
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'pending',
    },
    services: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at',
    },
  }, {
    sequelize,
    tableName: 'processing_tasks',
    timestamps: true,
    underscored: true,
  });

  return ProcessingTask;
}