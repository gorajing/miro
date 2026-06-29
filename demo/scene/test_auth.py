"""Demo scene: a real failing auth test. Run: python3 demo/scene/test_auth.py
Red now (login returns 401). Fix = change 401 -> 200 on the line below, re-run -> green."""
import sys


def login() -> int:
    return 200  # BUG: should return 200


def test_login() -> None:
    if login() == 200:
        print("tests/test_auth.py::test_login PASSED")
        print("=== 12 passed in 0.31s ===")
    else:
        print("tests/test_auth.py::test_login FAILED")
        print(f"E   assert {login()} == 200   (auth login)")
        print("=== 1 failed, 11 passed in 0.31s ===")
        sys.exit(1)


test_login()
