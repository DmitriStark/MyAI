// File: packages/db-models/src/models/LearningSource.ts
import { Model, DataTypes, Sequelize } from 'sequelize';

export class LearningSource extends Model {
  public id!: number;
  public url!: string | null;
  public title!: string | null;
  public content!: string | null;
  public lastCrawled!: Date | null;
  public status!: string | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

export function initLearningSourceModel(sequelize: Sequelize): typeof LearningSource {
  LearningSource.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    url: {
      type: DataTypes.STRING(2048),
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lastCrawled: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_crawled',
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
  }, {
    sequelize,
    tableName: 'learning_sources',
    timestamps: true,
    underscored: true,
  });

  return LearningSource;
}