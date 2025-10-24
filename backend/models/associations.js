// backend/models/associations.js
import Publisher from "./Publisher.js";
import Advertiser from "./Advertiser.js";

// Example relation: one advertiser can have many publishers
Advertiser.hasMany(Publisher, { foreignKey: "advertiserId" });
Publisher.belongsTo(Advertiser, { foreignKey: "advertiserId" });

export { Publisher, Advertiser };
