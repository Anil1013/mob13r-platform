-- Carrier prefix validation table
CREATE TABLE IF NOT EXISTS carrier_prefixes (
  id SERIAL PRIMARY KEY,
  carrier VARCHAR(100) NOT NULL,
  geo CHAR(2) NOT NULL,
  prefix VARCHAR(20) NOT NULL,
  UNIQUE(carrier, geo, prefix)
);

-- Common Middle East / Asia carrier prefixes
INSERT INTO carrier_prefixes (carrier, geo, prefix) VALUES
-- Palestine
('Jawwal', 'PS', '970-59'),
('Jawwal', 'PS', '972-59'),
('Ooredoo', 'PS', '970-56'),
('Ooredoo', 'PS', '972-56'),
-- Jordan
('Zain', 'JO', '962-79'),
('Zain', 'JO', '962-77'),
('Orange', 'JO', '962-77'),
('Umniah', 'JO', '962-78'),
-- Iraq
('Zain', 'IQ', '964-77'),
('Zain', 'IQ', '964-78'),
('Asiacell', 'IQ', '964-77'),
('Korek', 'IQ', '964-75'),
-- Kuwait
('Zain', 'KW', '965-96'),
('Zain', 'KW', '965-97'),
('Ooredoo', 'KW', '965-55'),
('STC', 'KW', '965-50'),
-- Saudi Arabia
('STC', 'SA', '966-5'),
('Mobily', 'SA', '966-56'),
('Zain', 'SA', '966-59'),
-- Egypt
('Vodafone', 'EG', '20-10'),
('Orange', 'EG', '20-12'),
('Etisalat', 'EG', '20-11'),
-- UAE
('Etisalat', 'AE', '971-50'),
('Du', 'AE', '971-55')
ON CONFLICT DO NOTHING;
