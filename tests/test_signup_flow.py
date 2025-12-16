from fastapi.testclient import TestClient
from src.app import app, activities

client = TestClient(app)


def test_signup_adds_participant_and_get_reflects_change():
    activity = "Chess Club"
    email = "test.student@mergington.edu"

    # Ensure email not already present
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    # Signup
    r = client.post(f"/activities/{activity}/signup?email={email}")
    assert r.status_code == 200
    assert "Signed up" in r.json()["message"]

    # Fetch activities and assert participant present
    r2 = client.get("/activities")
    assert r2.status_code == 200
    assert email in r2.json()[activity]["participants"]

    # cleanup
    activities[activity]["participants"].remove(email)
