// backend/models/Publisher.js
import { DataTypes } from "sequelize";
import { sequelize } from "./index.js";

const Publisher = sequelize.define("Publisher", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: DataTypes.STRING,
  website: DataTypes.STRING,
  status: {
    type: DataTypes.STRING,
    defaultValue: "active",
  },
});

export default Publisher;
