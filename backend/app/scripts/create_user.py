from ..database import SessionLocal, get_db
from ..models import User
from ..auth import hash_password
import getpass

db = SessionLocal()


username = input("Enter username: ")
password = getpass.getpass("Enter password: ")
password_hash = hash_password(password)

user = User(username=username, password_hash=password_hash)

db.add(user)
db.commit()
print(f"User '{username}' created successfully.")
