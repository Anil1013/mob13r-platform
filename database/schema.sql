CREATE TABLE affiliates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  role VARCHAR(50) DEFAULT 'affiliate'
);

CREATE TABLE partners (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  api_base TEXT,
  status VARCHAR(50) DEFAULT 'active'
);

CREATE TABLE offers (
  id SERIAL PRIMARY KEY,
  offer_id VARCHAR(100) UNIQUE,
  name VARCHAR(255),
  geo VARCHAR(50),
  carrier VARCHAR(50),
  partner_cpa DECIMAL(10,2),
  ref_url TEXT,
  request_url TEXT,
  verify_url TEXT,
  status VARCHAR(50) DEFAULT 'active'
);

CREATE TABLE affiliate_offers (
  id SERIAL PRIMARY KEY,
  affiliate_id INT REFERENCES affiliates(id),
  offer_id INT REFERENCES offers(id),
  affiliate_cpa DECIMAL(10,2),
  pass_percent INT,
  status VARCHAR(50) DEFAULT 'active'
);
