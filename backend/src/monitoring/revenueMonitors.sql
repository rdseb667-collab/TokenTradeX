-- Revenue Monitoring Queries for Grafana/PostgreSQL
-- Plug these into Grafana PostgreSQL datasource for alerting

-- =====================================================
-- 1) Missing Revenue Events (detect leakage)
-- =====================================================
-- Identifies canonical sources that should have revenue events but don't
WITH sources AS (
  -- Trading fees from completed trades
  SELECT 
    'TRADING_FEES' AS stream,
    id::text AS ref_id,
    created_at AS occurred_at,
    'trade' AS source_table
  FROM trades
  WHERE created_at > NOW() - INTERVAL '30 days'
  
  UNION ALL
  
  -- Withdrawal fees from completed withdrawals
  SELECT 
    'WITHDRAWAL_FEES' AS stream,
    id::text AS ref_id,
    created_at AS occurred_at,
    'transaction' AS source_table
  FROM transactions
  WHERE type = 'withdrawal' 
    AND status = 'completed'
    AND created_at > NOW() - INTERVAL '30 days'
  
  UNION ALL
  
  -- Staking commissions from active positions
  SELECT
    'STAKING_COMMISSIONS' AS stream,
    id::text AS ref_id,
    created_at AS occurred_at,
    'staking_position' AS source_table
  FROM staking_positions
  WHERE status = 'active'
    AND created_at > NOW() - INTERVAL '30 days'
)
SELECT 
  s.stream,
  s.source_table,
  COUNT(*) AS missing_count,
  SUM(1) AS total_sources
FROM sources s
LEFT JOIN revenue_events e 
  ON e.source_type = s.stream 
  AND e.source_id = s.ref_id
WHERE e.id IS NULL
GROUP BY s.stream, s.source_table
HAVING COUNT(*) > 0
ORDER BY missing_count DESC;

-- =====================================================
-- 2) Rounding Loss Detector
-- =====================================================
-- Detects when actual fees collected are less than expected
-- (indicates rounding errors or minimum fee not enforced)
WITH expected_vs_actual AS (
  -- Trading fees
  SELECT 
    'TRADING_FEES' AS stream,
    t.id,
    -- Expected: notional * fee_bps / 10000, min 0.01
    GREATEST(
      (t.price * t.filled_amount * 12) / 10000,  -- 0.12% taker fee
      0.01
    ) AS expected_fee,
    COALESCE(
      (SELECT SUM(gross_amount) 
       FROM revenue_events 
       WHERE source_type = 'TRADING_FEES' 
         AND source_id = t.id::text
      ), 0
    ) AS actual_fee
  FROM trades t
  WHERE t.created_at > NOW() - INTERVAL '7 days'
  
  UNION ALL
  
  -- Withdrawal fees
  SELECT
    'WITHDRAWAL_FEES' AS stream,
    tr.id,
    -- Expected: base + (amount * bps / 10000), min 1.00 USD
    GREATEST(
      0.50 + (tr.amount * 50) / 10000,  -- $0.50 + 0.5%
      1.00
    ) AS expected_fee,
    COALESCE(
      (SELECT SUM(gross_amount)
       FROM revenue_events
       WHERE source_type = 'WITHDRAWAL_FEES'
         AND source_id = tr.id::text
      ), 0
    ) AS actual_fee
  FROM transactions tr
  WHERE tr.type = 'withdrawal'
    AND tr.status = 'completed'
    AND tr.created_at > NOW() - INTERVAL '7 days'
)
SELECT 
  stream,
  COUNT(*) AS affected_count,
  SUM(expected_fee - actual_fee) AS total_rounding_loss,
  AVG(expected_fee - actual_fee) AS avg_loss_per_event,
  MAX(expected_fee - actual_fee) AS max_single_loss
FROM expected_vs_actual
WHERE expected_fee > actual_fee + 0.000001  -- Threshold for floating point precision
GROUP BY stream
HAVING SUM(expected_fee - actual_fee) > 0
ORDER BY total_rounding_loss DESC;

-- =====================================================
-- 3) Program Toggle Misconfiguration Detector
-- =====================================================
-- Detects contradictory settings (enabled but 0% rollout, or disabled but >0% rollout)
-- Note: Assumes you have a revenue_programs or feature_flags table
-- Adjust table/column names as needed
SELECT 
  'REVENUE_CONFIG_MISMATCH' AS alert_type,
  stream_name AS program,
  is_enabled,
  rollout_percentage,
  CASE 
    WHEN is_enabled = true AND rollout_percentage = 0 
      THEN 'Enabled but 0% rollout - no revenue being collected'
    WHEN is_enabled = false AND rollout_percentage > 0 
      THEN 'Disabled but rollout > 0% - inconsistent state'
  END AS issue
FROM revenue_streams
WHERE (is_enabled = true AND rollout_percentage = 0)
   OR (is_enabled = false AND rollout_percentage > 0);

-- =====================================================
-- 4) Daily Revenue Ledger Integrity Check
-- =====================================================
-- Ensures ledger aggregations match raw event totals
WITH event_totals AS (
  SELECT
    user_id,
    source_type AS stream,
    DATE(created_at) AS period,
    currency,
    SUM(gross_amount) AS total_gross,
    SUM(net_amount) AS total_net
  FROM revenue_events
  WHERE created_at > NOW() - INTERVAL '7 days'
  GROUP BY user_id, source_type, DATE(created_at), currency
),
ledger_totals AS (
  SELECT
    user_id,
    stream,
    period,
    currency,
    gross,
    net
  FROM revenue_ledger
  WHERE period > NOW() - INTERVAL '7 days'
)
SELECT
  COALESCE(e.user_id, l.user_id) AS user_id,
  COALESCE(e.stream, l.stream) AS stream,
  COALESCE(e.period, l.period) AS period,
  e.total_gross AS events_gross,
  l.gross AS ledger_gross,
  ABS(COALESCE(e.total_gross, 0) - COALESCE(l.gross, 0)) AS gross_diff,
  CASE
    WHEN e.user_id IS NULL THEN 'Missing in events'
    WHEN l.user_id IS NULL THEN 'Missing in ledger'
    WHEN ABS(COALESCE(e.total_gross, 0) - COALESCE(l.gross, 0)) > 0.01 THEN 'Mismatch'
    ELSE 'OK'
  END AS status
FROM event_totals e
FULL OUTER JOIN ledger_totals l
  ON e.user_id = l.user_id
  AND e.stream = l.stream
  AND e.period = l.period
  AND e.currency = l.currency
WHERE ABS(COALESCE(e.total_gross, 0) - COALESCE(l.gross, 0)) > 0.01
   OR e.user_id IS NULL
   OR l.user_id IS NULL
ORDER BY gross_diff DESC
LIMIT 100;

-- =====================================================
-- 5) Fee Exemption Expiry Alert
-- =====================================================
-- Shows users with expiring fee exemptions (next 7 days)
SELECT
  fe.user_id,
  u.email,
  fe.reason,
  fe.expires_at,
  EXTRACT(EPOCH FROM (fe.expires_at - NOW())) / 86400 AS days_until_expiry
FROM fee_exempt_allowlist fe
JOIN users u ON u.id = fe.user_id
WHERE fe.expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
ORDER BY fe.expires_at ASC;

-- =====================================================
-- 6) Top Revenue Generators (Last 30 Days)
-- =====================================================
SELECT
  rl.user_id,
  u.email,
  rl.stream,
  SUM(rl.gross) AS total_gross,
  SUM(rl.net) AS total_net,
  COUNT(DISTINCT rl.period) AS active_days
FROM revenue_ledger rl
JOIN users u ON u.id = rl.user_id
WHERE rl.period > NOW() - INTERVAL '30 days'
GROUP BY rl.user_id, u.email, rl.stream
ORDER BY total_gross DESC
LIMIT 50;
