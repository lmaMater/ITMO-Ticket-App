-- Создание таблиц
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    email VARCHAR(50) UNIQUE
);

CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE
);

CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    city_id INT REFERENCES cities (id)
);

CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE
);

CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100),
    description TEXT,
    event_date DATE,
    location_id INT REFERENCES locations (id)
);

CREATE TABLE IF NOT EXISTS event_tags (
    event_id INT REFERENCES events (id),
    tag_id INT REFERENCES tags (id),
    PRIMARY KEY (event_id, tag_id)
);