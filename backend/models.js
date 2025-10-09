import { Sequelize, DataTypes } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

// ✅ Use single DATABASE_URL (Render-friendly)
export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Needed for Render PostgreSQL
    },
  },
  logging: false,
});

// ✅ Initialize Models and Relations
export function initModels() {
  const Partner = sequelize.define("Partner", {
    name: DataTypes.STRING,
    api_base: DataTypes.STRING,
    status: { type: DataTypes.STRING, defaultValue: "active" },
  });

  const Offer = sequelize.define("Offer", {
    offer_id: { type: DataTypes.STRING, unique: true },
    name: DataTypes.STRING,
    geo: DataTypes.STRING,
    carrier: DataTypes.STRING,
    partner_cpa: DataTypes.DECIMAL(10, 2),
    ref_url: DataTypes.STRING,
    request_url: DataTypes.STRING,
    verify_url: DataTypes.STRING,
    status: { type: DataTypes.STRING, defaultValue: "active" },
  });

  const Affiliate = sequelize.define("Affiliate", {
    name: DataTypes.STRING,
    email: { type: DataTypes.STRING, unique: true },
    password: DataTypes.STRING,
    role: { type: DataTypes.STRING, defaultValue: "affiliate" },
  });

  const AffiliateOffer = sequelize.define("AffiliateOffer", {
    affiliate_cpa: DataTypes.DECIMAL(10, 2),
    pass_percent: DataTypes.INTEGER,
    status: { type: DataTypes.STRING, defaultValue: "active" },
  });

  const Click = sequelize.define("Click", {
    ip: DataTypes.STRING,
    geo: DataTypes.STRING,
    carrier: DataTypes.STRING,
    user_agent: DataTypes.STRING,
  });

  const Conversion = sequelize.define("Conversion", {
    msisdn: DataTypes.STRING,
    status: DataTypes.STRING,
    partner_response: DataTypes.JSON,
  });

  const Cap = sequelize.define("Cap", {
    level_type: DataTypes.STRING,
    level_id: DataTypes.STRING,
    geo: DataTypes.STRING,
    carrier: DataTypes.STRING,
    cap_type: DataTypes.STRING,
    cap_value: DataTypes.INTEGER,
    cap_period: DataTypes.STRING,
    current_value: { type: DataTypes.INTEGER, defaultValue: 0 },
    status: { type: DataTypes.STRING, defaultValue: "active" },
  });

  // ✅ Relationships
  Partner.hasMany(Offer);
  Offer.belongsTo(Partner);

  Affiliate.belongsToMany(Offer, { through: AffiliateOffer });
  Offer.belongsToMany(Affiliate, { through: AffiliateOffer });

  Offer.hasMany(Click);
  Click.belongsTo(Offer);
  Click.belongsTo(Affiliate);

  Offer.hasMany(Conversion);
  Conversion.belongsTo(Offer);
  Conversion.belongsTo(Affiliate);

  return { Partner, Offer, Affiliate, AffiliateOffer, Click, Conversion, Cap };
}
