-- init_schema.sql
-- users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    wallet_balance NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT now()
);

-- genres
CREATE TABLE IF NOT EXISTS genres (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

-- venues
CREATE TABLE IF NOT EXISTS venues (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500),
    seats_map_json JSONB,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT now()
);

-- seats
CREATE TABLE IF NOT EXISTS seats (
    id SERIAL PRIMARY KEY,
    venue_id INT REFERENCES venues (id) ON DELETE CASCADE,
    row_label VARCHAR(50),
    seat_number INT,
    seat_type VARCHAR(50),
    base_price NUMERIC(10, 2) NOT NULL
);

-- events
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    genre_id INT REFERENCES genres (id),
    venue_id INT REFERENCES venues (id),
    start_datetime TIMESTAMP
    WITH
        TIME ZONE NOT NULL,
        end_datetime TIMESTAMP
    WITH
        TIME ZONE,
        poster_url VARCHAR(1000),
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT now()
);

-- price_tiers
CREATE TABLE IF NOT EXISTS price_tiers (
    id SERIAL PRIMARY KEY,
    event_id INT REFERENCES events (id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    capacity INT
);

-- tickets
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    event_id INT REFERENCES events (id) ON DELETE CASCADE,
    seat_id INT REFERENCES seats (id),
    tier_id INT REFERENCES price_tiers (id),
    user_id INT REFERENCES users (id),
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    hold_expires_at TIMESTAMP
    WITH
        TIME ZONE,
        price NUMERIC(10, 2),
        qr_code VARCHAR(255),
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT now()
);

-- orders
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users (id),
    total_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(255),
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT now()
);

-- order_items
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders (id) ON DELETE CASCADE,
    ticket_id INT REFERENCES tickets (id),
    price NUMERIC(10, 2) NOT NULL
);

-- wallet_transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users (id),
    amount NUMERIC(10, 2) NOT NULL,
    reason VARCHAR(500),
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT now()
);

-- Indexes for perf
CREATE INDEX IF NOT EXISTS idx_events_start ON events (start_datetime);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets (status);