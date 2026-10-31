from app.tests.conftest import (
    create_admin,
    create_user,
    get_admin_token,
    get_customer_token,
)


class TestPermissions:
    def test_unauthenticated_access_rejected(self, client, db):
        resp = client.get("/api/cart/")
        assert resp.status_code == 401

        resp = client.get("/api/orders/")
        assert resp.status_code == 401

        resp = client.get("/api/admin/dashboard/")
        assert resp.status_code == 401

    def test_customer_token_cannot_access_admin(self, client, db):
        create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")
        resp = client.get(
            "/api/admin/dashboard/",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 401

    def test_admin_token_accesses_admin_routes(self, client, db):
        create_admin(db, email="admin@test.com", password="admin123")
        token = get_admin_token(client)
        resp = client.get(
            "/api/admin/dashboard/",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200

    def test_admin_token_accesses_customer_routes(self, client, db):
        """Admin token has type='admin', not 'customer', so it should be rejected
        by customer-only endpoints that require get_current_user."""
        create_admin(db, email="admin@test.com", password="admin123")
        token = get_admin_token(client)
        resp = client.get(
            "/api/cart/",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 401

    def test_customer_token_accesses_own_profile(self, client, db):
        create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")
        resp = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["mobile_number"] == "9876543210"

    def test_invalid_token_rejected(self, client, db):
        resp = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalidtoken123"},
        )
        assert resp.status_code == 401

    def test_no_auth_header_rejected(self, client, db):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401
