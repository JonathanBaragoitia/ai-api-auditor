from app.db.database import Base, engine
from app.models.audit import Audit  # noqa: F401
from app.models.user import User  # noqa: F401


def init_db():
    Base.metadata.create_all(bind=engine)
