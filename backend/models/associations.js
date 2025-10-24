// backend/models/associations.js

export function setupAssociations({ Publisher, Advertiser }) {
  // Example: one publisher can have many advertisers
  Publisher.hasMany(Advertiser, {
    foreignKey: "publisherId",
    as: "advertisers",
  });

  Advertiser.belongsTo(Publisher, {
    foreignKey: "publisherId",
    as: "publisher",
  });

  console.log("✅ Associations setup completed (Publisher ↔ Advertiser).");
}
