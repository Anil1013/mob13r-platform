// backend/models/Advertiser.js
import { DataTypes } from "sequelize";
import { sequelize } from "./index.js";

const Advertiser = sequelize.define("Advertiser", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  contact_email: DataTypes.STRING,
  offer_url: DataTypes.TEXT,
  status: {
    type: DataTypes.STRING,
    defaultValue: "active",
  },
});

export default Advertiser;
