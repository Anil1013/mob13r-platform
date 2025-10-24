// backend/models/Advertiser.js
import { DataTypes } from "sequelize";

export function initAdvertiser(sequelize) {
  const Advertiser = sequelize.define("Advertiser", {
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
    api_base: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  });

  return Advertiser;
}
