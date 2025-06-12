-- Add new columns to appointments table
ALTER TABLE appointments 
ADD COLUMN selected_quote_id UUID REFERENCES mechanic_quotes(id),
ADD COLUMN selected_at TIMESTAMP,
ADD COLUMN payment_completed_at TIMESTAMP;

-- Create analytics table
CREATE TABLE quote_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES appointments(id),
  selected_quote_id UUID REFERENCES mechanic_quotes(id),
  total_quotes_received INTEGER,
  selected_price DECIMAL,
  average_price DECIMAL,
  lowest_price DECIMAL,
  price_rank INTEGER, -- 1 = cheapest, 2 = second cheapest, etc
  time_to_selection INTERVAL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create view for mechanic performance analysis
CREATE VIEW mechanic_performance AS
SELECT 
  mp.id,
  mp.full_name,
  mp.business_name,
  COUNT(DISTINCT mq.id) as total_quotes_sent,
  COUNT(DISTINCT CASE WHEN a.selected_mechanic_id = mp.id THEN a.id END) as quotes_won,
  AVG(mq.price) as avg_quote_price,
  COUNT(DISTINCT CASE WHEN a.selected_mechanic_id = mp.id THEN a.id END)::FLOAT / 
    NULLIF(COUNT(DISTINCT mq.id), 0) * 100 as win_rate
FROM mechanic_profiles mp
LEFT JOIN mechanic_quotes mq ON mq.mechanic_id = mp.id
LEFT JOIN appointments a ON a.id = mq.appointment_id
GROUP BY mp.id;

-- Create view for quote analysis
CREATE VIEW quote_analysis AS
SELECT 
  a.id as appointment_id,
  a.created_at as appointment_created,
  a.selected_at,
  a.payment_completed_at,
  qa.total_quotes_received,
  qa.selected_price,
  qa.average_price,
  qa.lowest_price,
  qa.price_rank,
  qa.time_to_selection,
  mp.full_name as selected_mechanic_name,
  mp.business_name as selected_mechanic_business
FROM appointments a
JOIN quote_analytics qa ON qa.appointment_id = a.id
JOIN mechanic_profiles mp ON mp.id = a.selected_mechanic_id; 