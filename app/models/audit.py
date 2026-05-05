from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Text

from app.db.database import Base


class Audit(Base):
    __tablename__ = "audits"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(150), nullable=False)
    method = Column(String(10), nullable=False)
    path = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    auth_required = Column(String(10), nullable=False, default="false")

    request_example = Column(Text, nullable=True)
    response_example = Column(Text, nullable=True)

    score = Column(Float, nullable=False)
    risk_level = Column(String(50), nullable=False)

    issues = Column(Text, nullable=False)
    recommendations = Column(Text, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)