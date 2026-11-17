from app.tests.conftest import create_user, get_customer_token


class TestAuth:
    def test_register_customer(self, client, db):
        resp = client.post(
            "/api/auth/register",
            json={
                "mobile_number": "9876543210",
                "password": "password123",
                "full_name": "New User",
                "email": "new@test.com",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_register_duplicate_mobile(self, client, db):
        create_user(db, mobile="9876543210")
        resp = client.post(
            "/api/auth/register",
            json={
                "mobile_number": "9876543210",
                "password": "password123",
                "full_name": "Dup",
            },
        )
        assert resp.status_code == 409

    def test_login_valid(self, client, db):
        create_user(db, mobile="9876543210", password="password123")
        resp = client.post(
            "/api/auth/login",
            json={"mobile_number": "9876543210", "password": "password123"},
        )
        assert resp.status_code == 200
        token = resp.json()["access_token"]
        assert token

    def test_login_invalid_password(self, client, db):
        create_user(db, mobile="9876543210", password="password123")
        resp = client.post(
            "/api/auth/login",
            json={"mobile_number": "9876543210", "password": "wrong"},
        )
        assert resp.status_code == 401

    def test_login_nonexistent_mobile(self, client, db):
        resp = client.post(
            "/api/auth/login",
            json={"mobile_number": "0000000000", "password": "password"},
        )
        assert resp.status_code == 401

    def test_get_current_user(self, client, db):
        create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")
        resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["mobile_number"] == "9876543210"
        assert data["full_name"] == "Test User"

    def test_update_profile(self, client, db):
        create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")
        resp = client.put(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            json={"full_name": "Updated Name"},
        )
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "Updated Name"

    def test_password_reset_flow(self, client, db):
        from app.services.auth import AuthService

        create_user(db, mobile="9876543210", password="password123")
        token = AuthService(db).request_password_reset("9876543210")
        assert token is not None

        resp = client.post(
            "/api/auth/password-reset/confirm",
            json={"token": token, "new_password": "newpassword123"},
        )
        assert resp.status_code == 200

        resp = client.post(
            "/api/auth/login",
            json={"mobile_number": "9876543210", "password": "newpassword123"},
        )
        assert resp.status_code == 200

    def test_password_reset_invalid_token(self, client, db):
        resp = client.post(
            "/api/auth/password-reset/confirm",
            json={"token": "invalid", "new_password": "newpassword123"},
        )
        assert resp.status_code == 400


class TestAddresses:
    def test_crud_addresses(self, client, db):
        create_user(db, mobile="9876543210")
        token = get_customer_token(client, "9876543210")

        resp = client.post(
            "/api/auth/me/addresses",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "label": "Home",
                "full_name": "Test User",
                "address_line1": "123 Main St",
                "city": "Mumbai",
                "state": "MH",
                "pincode": "400001",
                "phone_number": "9876543210",
                "is_default": True,
            },
        )
        assert resp.status_code == 200
        addr_id = resp.json()["id"]
        assert resp.json()["is_default"] is True

        resp = client.get(
            "/api/auth/me/addresses",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 1

        resp = client.put(
            f"/api/auth/me/addresses/{addr_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"city": "Pune"},
        )
        assert resp.status_code == 200
        assert resp.json()["city"] == "Pune"

        resp = client.delete(
            f"/api/auth/me/addresses/{addr_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200

    def test_google_login_creates_account(self, client, db, monkeypatch):
        from app.services import google_auth

        monkeypatch.setattr(
            google_auth,
            "verify_credential",
            lambda credential: {
                "email": "google.user@example.com",
                "name": "Google User",
                "email_verified": True,
                "sub": "google-123",
            },
        )

        resp = client.post("/api/auth/google", json={"credential": "fake-token"})
        assert resp.status_code == 200
        token = resp.json()["access_token"]

        me = client.get(
            "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
        )
        assert me.status_code == 200
        body = me.json()
        assert body["email"] == "google.user@example.com"
        assert body["full_name"] == "Google User"
        assert body["mobile_number"] is None

        resp2 = client.post("/api/auth/google", json={"credential": "fake-token"})
        assert resp2.status_code == 200
        me2 = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {resp2.json()['access_token']}"},
        )
        assert me2.json()["id"] == body["id"]

    def test_google_login_rejects_invalid_credential(self, client, db, monkeypatch):
        from fastapi import HTTPException

        from app.services import google_auth

        def boom(credential):
            raise HTTPException(status_code=401, detail="Invalid Google credential")

        monkeypatch.setattr(google_auth, "verify_credential", boom)

        resp = client.post("/api/auth/google", json={"credential": "bad"})
        assert resp.status_code == 401
