from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.database import Base


class Audit(Base):
    __tablename__ = "audits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    user = relationship("User", back_populates="audits")

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
    summary = Column(Text, nullable=True)
    technical_observation = Column(Text, nullable=True)
    security_observation = Column(Text, nullable=True)
    maintainability_observation = Column(Text, nullable=True)

    total_endpoints = Column(Integer, nullable=True)
    average_score = Column(Float, nullable=True)
    global_risk_level = Column(String(50), nullable=True)
    openapi_endpoints = Column(Text, nullable=True)
    audit_mode = Column(String(30), nullable=False, default="enterprise")

    status = Column(String(20), nullable=False, default="completed")
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
