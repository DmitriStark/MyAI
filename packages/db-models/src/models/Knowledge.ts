// File: packages/db-models/src/models/Knowledge.ts
import { Model, DataTypes, Sequelize } from 'sequelize';

export class Knowledge extends Model {
  public id!: number;
  public content!: string;
  public source!: string | null;
  public type!: string;
  public confidence!: number;
  public tags!: string[];
  public lastAccessed!: Date | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

export function initKnowledgeModel(sequelize: Sequelize): typeof Knowledge {
  Knowledge.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    source: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    confidence: {
      type: DataTypes.FLOAT,
      defaultValue: 0.5,
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    lastAccessed: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_accessed',
    },
  }, {
    sequelize,
    tableName: 'knowledge',
    timestamps: true,
    underscored: true,
  });

  return Knowledge;
}