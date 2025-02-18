-- Create API key requests table
CREATE TABLE api_key_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    organization_name TEXT NOT NULL,
    application_name TEXT NOT NULL,
    usage_description TEXT NOT NULL,
    eth_wallet_address TEXT,
    discord_handle TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied')),
    api_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by TEXT,
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create API key usage tracking table
CREATE TABLE api_key_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_key_requests(id),
    date DATE NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    UNIQUE(api_key_id, date)
);

-- Create function to increment request count
CREATE OR REPLACE FUNCTION increment_request_count()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN request_count + 1;
END;
$$;

-- Create indexes for better query performance
CREATE INDEX idx_api_key_requests_status ON api_key_requests(status);
CREATE INDEX idx_api_key_requests_created_at ON api_key_requests(created_at);
CREATE INDEX idx_api_key_usage_date ON api_key_usage(date);

-- Create RLS policies
ALTER TABLE api_key_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage ENABLE ROW LEVEL SECURITY;

-- Policy for creating new requests (anyone can create)
CREATE POLICY "Anyone can create requests"
    ON api_key_requests FOR INSERT
    TO anon
    WITH CHECK (true);

-- Policy for reading own request
CREATE POLICY "Users can view their own requests"
    ON api_key_requests FOR SELECT
    TO anon
    USING (email = auth.jwt()->>'email');

-- Policy for reading all requests (service role only)
CREATE POLICY "Service role can view all requests"
    ON api_key_requests FOR SELECT
    TO service_role
    USING (true);

-- Policy for updating requests (service role only)
CREATE POLICY "Service role can update requests"
    ON api_key_requests FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy for reading usage (service role only)
CREATE POLICY "Service role can view usage"
    ON api_key_usage FOR SELECT
    TO service_role
    USING (true);

-- Policy for updating usage (service role only)
CREATE POLICY "Service role can update usage"
    ON api_key_usage FOR ALL
    TO service_role
    USING (true); 