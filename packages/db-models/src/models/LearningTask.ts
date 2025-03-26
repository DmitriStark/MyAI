// File: packages/db-models/src/models/LearningTask.ts
import { Model, DataTypes, Sequelize } from 'sequelize';

export class LearningTask extends Model {
  public id!: number;
  public type!: string;
  public sourceId!: string | null;
  public sourceType!: string;
  public status!: string;
  public progress!: number;
  public error!: string | null;
  public createdAt!: Date;
  public updatedAt!: Date;
  public completedAt!: Date | null;
}

export function initLearningTaskModel(sequelize: Sequelize): typeof LearningTask {
  LearningTask.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    sourceId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'source_id',
    },
    sourceType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'source_type',
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'pending',
    },
    progress: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at',
    },
  }, {
    sequelize,
    tableName: 'learning_tasks',
    timestamps: true,
    underscored: true,
  });

  return LearningTask;
}