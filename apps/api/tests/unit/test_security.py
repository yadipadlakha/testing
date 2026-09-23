import uuid

import jwt
import pytest

from app.core import security


def test_hash_password_and_verify_roundtrip():
    hashed = security.hash_password("correct horse battery staple")
    assert hashed != "correct horse battery staple"
    assert security.verify_password("correct horse battery staple", hashed)


def test_verify_password_rejects_wrong_password():
    hashed = security.hash_password("correct horse battery staple")
    assert not security.verify_password("wrong password", hashed)


def test_hash_token_is_deterministic():
    value = security.create_refresh_token_value()
    assert security.hash_token(value) == security.hash_token(value)


def test_hash_token_differs_for_different_values():
    a = security.create_refresh_token_value()
    b = security.create_refresh_token_value()
    assert security.hash_token(a) != security.hash_token(b)


def test_create_and_decode_access_token_roundtrip():
    user_id = uuid.uuid4()
    org_id = uuid.uuid4()
    token = security.create_access_token(user_id=user_id, organization_id=org_id, roles=["Sales"])

    payload = security.decode_access_token(token)

    assert payload["sub"] == str(user_id)
    assert payload["org"] == str(org_id)
    assert payload["roles"] == ["Sales"]
    assert payload["principal_type"] == "INTERNAL"
    assert payload["aud"] == "internal-app"


def test_decode_access_token_rejects_wrong_audience():
    token = security.create_access_token(
        user_id=uuid.uuid4(), organization_id=uuid.uuid4(), roles=[], audience="b2b-portal"
    )
    with pytest.raises(jwt.InvalidAudienceError):
        security.decode_access_token(token, audience="internal-app")


def test_decode_access_token_rejects_tampered_token():
    token = security.create_access_token(
        user_id=uuid.uuid4(), organization_id=uuid.uuid4(), roles=[]
    )
    tampered = token[:-1] + ("A" if token[-1] != "A" else "B")
    with pytest.raises(jwt.PyJWTError):
        security.decode_access_token(tampered)
