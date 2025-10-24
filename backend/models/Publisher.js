// backend/models/Publisher.js
import { DataTypes } from "sequelize";

export function initPublisher(sequelize) {
  const Publisher = sequelize.define("Publisher", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  });

  return Publisher;
}
