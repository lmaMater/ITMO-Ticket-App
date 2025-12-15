import os
import time
import random
import uuid
from datetime import datetime, timedelta
from faker import Faker
import psycopg2
from psycopg2.extras import execute_values, Json
from passlib.hash import argon2

faker = Faker("ru_RU")

PGHOST = os.environ.get("PGHOST", "db")
PGPORT = int(os.environ.get("PGPORT", 5432))
PGUSER = os.environ.get("PGUSER", "myuser")
PGPASSWORD = os.environ.get("PGPASSWORD", "mypassword")
PGDATABASE = os.environ.get("PGDATABASE", "mydatabase")

DSN = f"host={PGHOST} port={PGPORT} dbname={PGDATABASE} user={PGUSER} password={PGPASSWORD}"

def wait_for_db(max_attempts=30, delay=2.0):
    attempts = 0
    while attempts < max_attempts:
        try:
            conn = psycopg2.connect(DSN)
            conn.close()
            print("DB is up")
            return True
        except Exception as e:
            attempts += 1
            print(f"DB not ready yet ({attempts}/{max_attempts}): {e}")
            time.sleep(delay)
    return False

def insert_genres(cur):
    names = ["Концерт", "Выставка", "Фестиваль", "Театр", "Лекция", "Джаз", "EDM"]
    for n in names:
        cur.execute("INSERT INTO genres (name) VALUES (%s) ON CONFLICT (name) DO NOTHING", (n,))
    print("Genres inserted/checked")

def insert_venues_and_seats(cur):
    venues = []
    for i in range(2):
        name = faker.company()[:120]
        address = faker.address().replace("\n", ", ")
        seats_map = {}
        cur.execute(
            "INSERT INTO venues (name, address, seats_map_json) VALUES (%s, %s, %s) RETURNING id",
            (name, address, Json(seats_map))
        )
        vid = cur.fetchone()[0]
        venues.append(vid)

        seat_rows = [chr(ord("A") + r) for r in range(20)]
        seats_to_insert = []
        for row in seat_rows:
            for sn in range(1, 11):
                seat_type = random.choice(["standard", "vip"])
                base_price = 2000.00 if seat_type == "vip" else 1000.00
                seats_to_insert.append((vid, row, sn, seat_type, base_price))
        execute_values(
            cur,
            "INSERT INTO seats (venue_id, row_label, seat_number, seat_type, base_price) VALUES %s",
            seats_to_insert
        )
        print(f"Venue {vid} and its seats inserted ({len(seats_to_insert)})")
    return venues

def insert_events_and_tiers_and_tickets(cur, venues):
    cur.execute("SELECT id FROM genres")
    genre_ids = [r[0] for r in cur.fetchall()]
    assert genre_ids, "No genres found"

    tier_price_map = { "VIP": 8000.0, "Standard": 3000.0, "Budget": 1500.0, "Dancefloor": 1000.0 }

    for i in range(6):
        venue_id = random.choice(venues)
        genre_id = random.choice(genre_ids)
        start_dt = datetime.utcnow() + timedelta(days=random.randint(1, 60), hours=random.randint(0,23))
        end_dt = start_dt + timedelta(hours=3)
        title = faker.catch_phrase()[:200]
        description = faker.text(max_nb_chars=300)
        poster = ""

        cur.execute(
            """INSERT INTO events (title, description, genre_id, venue_id, start_datetime, end_datetime, poster_url)
               VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
            (title, description, genre_id, venue_id, start_dt, end_dt, poster)
        )
        event_id = cur.fetchone()[0]

        tiers = [
            ("VIP", 8000.00, 20),
            ("Standard", 3000.00, 100),
            ("Budget", 1500.00, 80),
            ("Dancefloor", 1000.00, 50)
        ]
        tier_ids = []
        for name, price, capacity in tiers:
            cur.execute(
                "INSERT INTO price_tiers (event_id, name, price, capacity) VALUES (%s,%s,%s,%s) RETURNING id",
                (event_id, name, price, capacity)
            )
            tier_ids.append(cur.fetchone()[0])

        cur.execute("SELECT id FROM seats WHERE venue_id = %s", (venue_id,))
        seat_ids = [r[0] for r in cur.fetchall()]
        random.shuffle(seat_ids)

        tickets_to_insert = []
        seat_index = 0
        for tid, (name, _, capacity) in zip(tier_ids, tiers):
            cap = capacity if capacity else 0
            for _ in range(cap):
                sid = None
                if name != "Dancefloor":
                    if seat_index >= len(seat_ids):
                        break
                    sid = seat_ids[seat_index]
                    seat_index += 1
                price = tier_price_map.get(name, 1500.0)
                qr = str(uuid.uuid4())
                tickets_to_insert.append((event_id, sid, tid, None, "available", None, price, qr))

        if tickets_to_insert:
            execute_values(
                cur,
                """INSERT INTO tickets (event_id, seat_id, tier_id, user_id, status, hold_expires_at, price, qr_code)
                   VALUES %s""",
                tickets_to_insert
            )
        print(f"Event {event_id}: tiers and {len(tickets_to_insert)} tickets created")

def insert_admin(cur):
    admin_email = "admin@admin.com"
    admin_password = "admin123"
    admin_name = "Admin"

    password_hash = argon2.hash(admin_password)

    cur.execute(
        """
        INSERT INTO users (email, password_hash, full_name, role, wallet_balance)
        VALUES (%s, %s, %s, 'admin', 0)
        ON CONFLICT (email) DO NOTHING
        """,
        (admin_email, password_hash, admin_name)
    )

    print("Admin user ensured: admin@admin.com / admin123")


def main():
    if not wait_for_db():
        print("DB not available, exiting")
        return

    conn = psycopg2.connect(DSN)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        insert_genres(cur)
        insert_admin(cur)
        venues = insert_venues_and_seats(cur)
        insert_events_and_tiers_and_tickets(cur, venues)
        conn.commit()
        print("Data generation finished successfully")
    except Exception as e:
        conn.rollback()
        print("Error during data generation:", e)
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
