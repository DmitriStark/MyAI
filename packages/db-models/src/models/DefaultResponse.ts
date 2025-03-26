// File: packages/db-models/src/models/DefaultResponse.ts
import { Model, DataTypes, Sequelize } from 'sequelize';

export class DefaultResponse extends Model {
  public id!: number;
  public responseText!: string;
  public context!: string | null;
  public priority!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

export function initDefaultResponseModel(sequelize: Sequelize): typeof DefaultResponse {
  DefaultResponse.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    responseText: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'response_text',
    },
    context: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
  }, {
    sequelize,
    tableName: 'default_responses',
    timestamps: true,
    underscored: true,
  });

  return DefaultResponse;
}