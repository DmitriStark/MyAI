// File: packages/db-models/src/models/User.ts
import { Model, DataTypes, Sequelize } from 'sequelize';

export class User extends Model {
  public id!: number;
  public username!: string;
  public preferences!: object;
  public createdAt!: Date;
  public updatedAt!: Date;
}

export function initUserModel(sequelize: Sequelize): typeof User {
  User.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: false,
    },
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    sequelize,
    tableName: 'users',
    timestamps: true,
    underscored: true,
  });

  return User;
}