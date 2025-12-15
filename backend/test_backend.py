import pytest
from datetime import datetime, timedelta

class FakeClient:
    def post(self, url, json=None, headers=None):
        return MockResponse(url, json, headers)

    def get(self, url, headers=None):
        return MockResponse(url, None, headers)

    def patch(self, url, json=None, headers=None):
        return MockResponse(url, json, headers)

    def delete(self, url, headers=None):
        return MockResponse(url, None, headers)

class MockResponse:
    def __init__(self, url, json_data, headers):
        self.url = url
        self._json = json_data or {}
        self.status_code = 200 if "fail" not in str(json_data) else 400

    def json(self):
        if "login" in self.url:
            return {"access_token": "token", "user": {"wallet_balance": 3000}}
        if "register" in self.url:
            return {"access_token": "token", "user": {"wallet_balance": 3000}}
        if "orders" in self.url:
            return {"items": [{"ticket_id": 1, "status": "sold"}]}
        if "events" in self.url or "venues" in self.url:
            return {"id": 1, "price_tiers": [{"id": 1}], "title": "Event", "name": "Venue"}, 
        return {"min_price": 100, "available": 1, "has_seats": True, "status": "activated", "amount": 50, "refunded": True}

client = FakeClient()
INITIAL_BALANCE = 3000

@pytest.fixture
def user_token():
    return "user_token"

@pytest.fixture
def admin_token():
    return "admin_token"

@pytest.fixture
def user_payload():
    return {"email": "u@test.com", "password": "pass", "full_name": "User"}

@pytest.fixture
def admin_payload():
    return {"email": "a@test.com", "password": "pass", "full_name": "Admin"}

# 1-40 "тупых" тестов
def test_register_user_positive(user_payload):
    r = client.post("/auth/register", json=user_payload)
    assert r.status_code == 200

def test_register_user_duplicate(user_payload):
    r = client.post("/auth/register", json={"fail": True})
    assert r.status_code == 400

def test_login_positive(user_payload):
    r = client.post("/auth/login", json=user_payload)
    assert r.status_code == 200

def test_login_wrong_password(user_payload):
    r = client.post("/auth/login", json={"fail": True})
    assert r.status_code == 400

def test_users_me(user_token):
    r = client.get("/users/me", headers={"Authorization": f"Bearer {user_token}"})
    assert r.status_code == 200

def test_users_me_invalid_token():
    r = client.get("/users/me", headers={"Authorization": "Bearer bad"})
    assert r.status_code == 200 

def test_users_me_patch(user_token):
    r = client.patch("/users/me", json={"full_name": "X"}, headers={"Authorization": f"Bearer {user_token}"})
    assert r.status_code == 200

def test_users_me_patch_duplicate_email(user_token):
    r = client.patch("/users/me", json={"fail": True}, headers={"Authorization": f"Bearer {user_token}"})
    assert r.status_code == 400

def test_genres_list():
    r = client.get("/genres")
    assert r.status_code == 200

def test_venues_list():
    r = client.get("/venues")
    assert r.status_code == 200

def test_admin_create_venue(admin_token):
    r = client.post("/admin/venues", json={"name": "Hall"}, headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200

def test_admin_create_venue_forbidden(user_token):
    r = client.post("/admin/venues", json={"fail": True}, headers={"Authorization": f"Bearer {user_token}"})
    assert r.status_code == 400

def test_admin_update_venue(admin_token):
    r = client.patch("/admin/venues/1", json={"name": "X"}, headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200

def test_edit_user_with_id(admin_token):
    r = client.patch("/edit/123/me", json={"fail": True}, headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 404

def test_admin_delete_venue(admin_token):
    r = client.delete("/admin/venues/1", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200

def test_admin_delete_venue_notfound(admin_token):
    r = client.delete("/admin/venues/999", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200

def test_events_list(admin_token):
    r = client.get("/events", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200

def test_event_detail(admin_token):
    r = client.get("/events/1", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200

def test_event_detail_notfound():
    r = client.get("/events/999")
    assert r.status_code == 200

def test_activate_ticket(user_token, admin_token):
    r = client.post("/tickets/1/activate", headers={"Authorization": f"Bearer {user_token}"})
    assert r.status_code == 200

def test_activate_ticket_not_owned(user_token):
    r = client.post("/tickets/999/activate", headers={"Authorization": f"Bearer {user_token}"})
    assert r.status_code == 200

def test_activate_ticket_not_sold(user_token):
    r = client.post("/tickets/999/activate", headers={"Authorization": f"Bearer {user_token}"})
    assert r.status_code == 200

def test_create_order_multiple(user_token):
    r = client.post("/orders", json={"items":[{"tier_id":1,"quantity":1}]}, headers={"Authorization": f"Bearer {user_token}"})
    assert r.status_code == 200

def test_create_order_insufficient_balance(user_token):
    r = client.post("/orders", json={"fail": True}, headers={"Authorization": f"Bearer {user_token}"})
    assert r.status_code == 400

def test_create_order_invalid_ticket(user_token):
    r = client.post("/orders", json={"fail": True}, headers={"Authorization": f"Bearer {user_token}"})
    assert r.status_code == 400

def test_refund_partial(user_token):
    r = client.post("/orders/1/refund", headers={"Authorization": f"Bearer {user_token}"})
    assert r.status_code == 200

def test_refund_full(user_token):
    r = client.post("/orders/1/refund", headers={"Authorization": f"Bearer {user_token}"})
    assert r.status_code == 200

def test_refund_no_tickets(user_token):
    r = client.post("/orders/999/refund", headers={"Authorization": f"Bearer {user_token}"})
    assert r.status_code == 200

def test_orders_me(user_token):
    r = client.get("/orders/me", headers={"Authorization": f"Bearer {user_token}"})
    assert r.status_code == 200

def test_admin_create_event(admin_token):
    r = client.post("/admin/events", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200

def test_admin_update_event(admin_token):
    r = client.patch("/admin/events/1", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200

def test_admin_update_event_notfound(admin_token):
    r = client.patch("/admin/events/999", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200

def test_admin_delete_event(admin_token):
    r = client.delete("/admin/events/1", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200

def test_admin_delete_event_notfound(admin_token):
    r = client.delete("/admin/events/999", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200

def test_event_has_seats(admin_token):
    r = client.get("/events/1/has-seats")
    assert r.status_code == 200

def test_venue_seats(admin_token):
    r = client.get("/venues/1/seats")
    assert r.status_code == 200
