from fastapi.testclient import TestClient
from src.app import app, activities

client = TestClient(app)


def reset_participants(activity, email):
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)


def test_get_activities_returns_activities():
    r = client.get("/activities")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    # check a few expected activities
    assert "Chess Club" in data
    assert "Programming Class" in data


def test_signup_success_and_cleanup():
    activity = "Programming Class"
    email = "pytest.user@mergington.edu"

    reset_participants(activity, email)

    # signup
    r = client.post(f"/activities/{activity}/signup?email={email}")
    assert r.status_code == 200
    assert "Signed up" in r.json()["message"]

    # verify present in GET
    r2 = client.get("/activities")
    assert r2.status_code == 200
    assert email in r2.json()[activity]["participants"]

    # cleanup
    activities[activity]["participants"].remove(email)


def test_signup_already_registered_returns_400():
    activity = "Chess Club"
    email = "existing@test.edu"

    # ensure present
    if email not in activities[activity]["participants"]:
        activities[activity]["participants"].append(email)

    r = client.post(f"/activities/{activity}/signup?email={email}")
    assert r.status_code == 400
    assert "already signed up" in r.json()["detail"].lower()

    # cleanup
    activities[activity]["participants"].remove(email)


def test_signup_activity_not_found_returns_404():
    r = client.post("/activities/NonExistentActivity/signup?email=x@x.com")
    assert r.status_code == 404


def test_unregister_success_and_cleanup():
    activity = "Tennis Club"
    email = "to.remove@mergington.edu"

    # ensure present
    if email not in activities[activity]["participants"]:
        activities[activity]["participants"].append(email)

    r = client.delete(f"/activities/{activity}/signup?email={email}")
    assert r.status_code == 200
    assert "Removed" in r.json()["message"]

    # verify removed
    r2 = client.get("/activities")
    assert email not in r2.json()[activity]["participants"]


def test_unregister_not_signed_up_returns_400():
    activity = "Debate Team"
    email = "not.present@mergington.edu"

    # ensure not present
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    r = client.delete(f"/activities/{activity}/signup?email={email}")
    assert r.status_code == 400
    assert "not signed up" in r.json()["detail"].lower()


def test_unregister_activity_not_found_returns_404():
    r = client.delete("/activities/NoSuch/signup?email=a@b.com")
    assert r.status_code == 404
