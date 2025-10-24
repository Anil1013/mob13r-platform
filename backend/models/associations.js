// backend/models/associations.js
import Publisher from "./Publisher.js";
import Advertiser from "./Advertiser.js";


export function setupAssociations({ Publisher, Advertiser }) {
  Publisher.hasMany(Advertiser, { foreignKey: "publisherId" });
  Advertiser.belongsTo(Publisher, { foreignKey: "publisherId" });
}

export { Publisher, Advertiser };
