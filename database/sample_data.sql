-- Sample Data for Mob13r Affiliate Platform

INSERT INTO partners (name, api_base)
VALUES 
('Velti', 'https://grandprizehero.com/api'),
('Kimia', 'https://api.kimia.com');

INSERT INTO offers (offer_id, name, geo, carrier, partner_cpa, ref_url, request_url, verify_url, partner_id)
VALUES
('OFFR-123ABC', 'Grand Prize Hero', 'IQ', 'Asiacell', 0.8, 'collectcent_api', 
'https://grandprizehero.com/api/requestPinInApp',
'https://grandprizehero.com/api/verifyPinInApp', 1);

INSERT INTO affiliates (name, email, password)
VALUES
('Traffic Company', 'traffic@demo.com', 'pass');
