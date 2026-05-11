from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


AuditStatus = Literal["pending", "processing", "completed", "failed"]
AuditMode = Literal["security", "rest_design", "documentation", "enterprise"]


class StructuredIssue(BaseModel):
    title: str
    severity: str
    category: str
    evidence: str
    recommendation: str


class ManualAuditRequest(BaseModel):
    name: str = Field(..., min_length=3, max_length=150)
    method: str = Field(..., examples=["GET", "POST", "PUT", "DELETE"])
    path: str = Field(..., examples=["/users"])
    description: str | None = None
    auth_required: bool = False
    request_example: dict[str, Any] | None = None
    response_example: dict[str, Any] | None = None


class AuditAnalysis(BaseModel):
    score: float
    risk_level: str
    issues: list[str | StructuredIssue]
    recommendations: list[str | dict[str, Any]]
    summary: str | None = None
    technical_observation: str | None = None
    security_observation: str | None = None
    maintainability_observation: str | None = None


class OpenAPIAuditRequest(BaseModel):
    name: str = Field(..., min_length=3, max_length=150)
    openapi_schema: dict[str, Any]
    audit_mode: AuditMode = "enterprise"


class OpenAPIEndpointAnalysis(BaseModel):
    method: str
    path: str
    summary: str | None = None
    score: float
    risk_level: str
    issues: list[str | StructuredIssue]
    recommendations: list[str | dict[str, Any]]
    technical_observation: str | None = None
    security_observation: str | None = None
    maintainability_observation: str | None = None


class AuditResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    method: str
    path: str
    description: str | None
    auth_required: bool
    request_example: dict[str, Any] | None
    response_example: dict[str, Any] | None
    score: float
    risk_level: str
    issues: list[str | StructuredIssue]
    recommendations: list[str | dict[str, Any]]
    summary: str | None = None
    technical_observation: str | None = None
    security_observation: str | None = None
    maintainability_observation: str | None = None
    created_at: datetime
    total_endpoints: int | None = None
    average_score: float | None = None
    global_risk_level: str | None = None
    endpoints: list[OpenAPIEndpointAnalysis] | None = None
    status: AuditStatus = "completed"
    error_message: str | None = None
    audit_mode: AuditMode = "enterprise"


class OpenAPIAuditResponse(BaseModel):
    id: int | None = None
    name: str
    total_endpoints: int
    average_score: float
    global_risk_level: str
    summary: str | None = None
    technical_observation: str | None = None
    security_observation: str | None = None
    maintainability_observation: str | None = None
    endpoints: list[OpenAPIEndpointAnalysis]
    status: AuditStatus = "completed"
    error_message: str | None = None
    audit_mode: AuditMode = "enterprise"
