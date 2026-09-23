def test_login_success_returns_access_token(client, make_user):
    user, password, _org = make_user("Sales")

    response = client.post("/api/v1/auth/login", json={"email": user.email, "password": password})

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == 900
    assert len(body["access_token"].split(".")) == 3  # looks like a JWT
    assert "refresh_token" in response.cookies


def test_login_wrong_password_is_unauthenticated_envelope(client, make_user):
    user, _password, _org = make_user("Sales")

    response = client.post("/api/v1/auth/login", json={"email": user.email, "password": "wrong"})

    assert response.status_code == 401
    body = response.json()
    assert body["error"]["code"] == "UNAUTHENTICATED"
    assert "request_id" in body["error"]


def test_login_unknown_email_is_unauthenticated_not_not_found(client):
    """Deliberately doesn't leak whether the email exists."""
    response = client.post(
        "/api/v1/auth/login", json={"email": "nobody@test.dev", "password": "whatever"}
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"


def test_login_validation_error_on_bad_payload(client):
    response = client.post("/api/v1/auth/login", json={"email": "not-an-email"})

    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert any(d["field"] == "password" for d in body["error"]["details"])


def test_me_without_token_is_401(client):
    response = client.get("/api/v1/me")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"


def test_me_returns_role_scoped_permissions(client, make_user):
    user, password, _org = make_user("Finance")
    login = client.post("/api/v1/auth/login", json={"email": user.email, "password": password})
    token = login.json()["access_token"]

    response = client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["email"] == user.email
    assert body["roles"] == ["Finance"]
    assert "finance.invoice:write" in body["permissions"]
    # A Finance user must not implicitly get Sales-only permissions.
    assert "sales.quotation:approve" not in body["permissions"]


def test_admin_has_full_permission_set(client, make_user):
    user, password, _org = make_user("Admin")
    login = client.post("/api/v1/auth/login", json={"email": user.email, "password": password})
    token = login.json()["access_token"]

    response = client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}"})

    permissions = set(response.json()["permissions"])
    assert {
        "identity.user:manage",
        "finance.invoice:write",
        "sales.quotation:approve",
    } <= permissions


def test_refresh_rotates_token_and_old_one_stops_working(client, make_user):
    user, password, _org = make_user("Sales")
    login = client.post("/api/v1/auth/login", json={"email": user.email, "password": password})
    old_refresh_cookie = login.cookies.get("refresh_token")
    assert old_refresh_cookie

    refresh_response = client.post("/api/v1/auth/refresh")
    assert refresh_response.status_code == 200
    assert len(refresh_response.json()["access_token"].split(".")) == 3
    new_refresh_cookie = refresh_response.cookies.get("refresh_token")
    assert new_refresh_cookie and new_refresh_cookie != old_refresh_cookie

    # Old refresh token cookie was revoked on rotation — try it again explicitly.
    client.cookies.set("refresh_token", old_refresh_cookie)
    replay_response = client.post("/api/v1/auth/refresh")
    assert replay_response.status_code == 401


def test_refresh_without_cookie_is_401(client):
    response = client.post("/api/v1/auth/refresh")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"


def test_logout_revokes_refresh_token(client, make_user):
    user, password, _org = make_user("Sales")
    client.post("/api/v1/auth/login", json={"email": user.email, "password": password})

    logout_response = client.post("/api/v1/auth/logout")
    assert logout_response.status_code == 204

    refresh_after_logout = client.post("/api/v1/auth/refresh")
    assert refresh_after_logout.status_code == 401


def test_inactive_user_cannot_login(client, make_user, db_session):
    user, password, _org = make_user("Sales")
    user.is_active = False
    db_session.add(user)
    db_session.commit()

    response = client.post("/api/v1/auth/login", json={"email": user.email, "password": password})

    assert response.status_code == 401
