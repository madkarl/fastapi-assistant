from core.session import get_session_sync
from authentication.schema import User
from authentication.tool import hash_password


def create_root_user():
    with get_session_sync() as session:
        user = User(
            username="root", name="root", root=True, password=hash_password("root")
        )
        session.add(user)
        session.commit()

        print("Add root user successfully.")
