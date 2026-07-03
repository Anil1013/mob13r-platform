-- Carrier prefix validation table
CREATE TABLE IF NOT EXISTS carrier_prefixes (
  id SERIAL PRIMARY KEY,
  carrier VARCHAR(100) NOT NULL,
  geo CHAR(2) NOT NULL,
  prefix VARCHAR(20) NOT NULL,
  UNIQUE(carrier, geo, prefix)
);

-- =============================================
-- Palestine (PS) — country code 970 / 972
-- =============================================
INSERT INTO carrier_prefixes (carrier, geo, prefix) VALUES
('Jawwal',  'PS', '97059'),
('Jawwal',  'PS', '97259'),
('Jawwal',  'PS', '00970590'),
('Ooredoo', 'PS', '97056'),
('Ooredoo', 'PS', '97256'),
('Ooredoo', 'PS', '00970560')

ON CONFLICT DO NOTHING;

-- =============================================
-- Iraq (IQ) — country code 964
-- =============================================
-- Asiacell:  077x (9647700-9647799)
-- Zain IQ:   078x, 079x
-- Korek:     075x
-- Umniah IQ: 076x
INSERT INTO carrier_prefixes (carrier, geo, prefix) VALUES
('Asiacell', 'IQ', '964077'),
('Asiacell', 'IQ', '00964077'),
('Asiacell', 'IQ', '077'),

('Zain',     'IQ', '964078'),
('Zain',     'IQ', '964079'),
('Zain',     'IQ', '00964078'),
('Zain',     'IQ', '00964079'),
('Zain',     'IQ', '078'),
('Zain',     'IQ', '079'),

('Korek',    'IQ', '964075'),
('Korek',    'IQ', '00964075'),
('Korek',    'IQ', '075'),

('Umniah',   'IQ', '964076'),
('Umniah',   'IQ', '00964076'),
('Umniah',   'IQ', '076')

ON CONFLICT DO NOTHING;

-- =============================================
-- Kuwait (KW) — country code 965
-- =============================================
-- Zain KW:   96x, 97x (start with 9)
-- Ooredoo:   55x, 66x
-- STC:       50x, 51x
INSERT INTO carrier_prefixes (carrier, geo, prefix) VALUES
('Zain',    'KW', '96596'),
('Zain',    'KW', '96597'),
('Zain',    'KW', '0096596'),
('Zain',    'KW', '0096597'),

('Ooredoo', 'KW', '96555'),
('Ooredoo', 'KW', '96566'),
('Ooredoo', 'KW', '0096555'),

('STC',     'KW', '96550'),
('STC',     'KW', '96551'),
('STC',     'KW', '0096550')

ON CONFLICT DO NOTHING;

-- =============================================
-- Jordan (JO) — country code 962
-- =============================================
INSERT INTO carrier_prefixes (carrier, geo, prefix) VALUES
('Zain',    'JO', '96279'),
('Zain',    'JO', '96277'),
('Orange',  'JO', '96278'),
('Umniah',  'JO', '96276'),
('Orange',  'JO', '00962780'),
('Zain',    'JO', '00962790')

ON CONFLICT DO NOTHING;

-- =============================================
-- Saudi Arabia (SA) — country code 966
-- =============================================
INSERT INTO carrier_prefixes (carrier, geo, prefix) VALUES
('STC',     'SA', '9665'),
('Mobily',  'SA', '96656'),
('Zain',    'SA', '96659'),
('STC',     'SA', '009665')

ON CONFLICT DO NOTHING;

-- =============================================
-- Egypt (EG) — country code 20
-- =============================================
INSERT INTO carrier_prefixes (carrier, geo, prefix) VALUES
('Vodafone', 'EG', '2010'),
('Orange',   'EG', '2012'),
('Etisalat', 'EG', '2011'),
('WE',       'EG', '2015'),
('Vodafone', 'EG', '00201')

ON CONFLICT DO NOTHING;

-- =============================================
-- UAE (AE) — country code 971
-- =============================================
INSERT INTO carrier_prefixes (carrier, geo, prefix) VALUES
('Etisalat', 'AE', '97150'),
('Du',       'AE', '97155'),
('Etisalat', 'AE', '009715')

ON CONFLICT DO NOTHING;
