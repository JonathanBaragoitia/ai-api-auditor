from datetime import datetime
from typing import Any, Literal

import json

from pydantic import BaseModel, ConfigDict, Field, field_validator


MAX_EXAMPLE_SIZE_CHARS = 20000


AuditStatus = Literal["pending", "processing", "completed", "failed"]
AuditMode = Literal["security", "rest_design", "documentation", "enterprise"]


class StructuredIssue(BaseModel):
    title: str
    severity: str
    category: str
    evidence: str
    recommendation: str
    fix_suggestion: dict[str, Any] | None = None
    occurrences: int | None = None
    affected_endpoints: list[str | dict[str, Any]] | None = None


class ManualAuditRequest(BaseModel):
    name: str = Field(..., min_length=3, max_length=150)
    method: str = Field(..., min_length=3, max_length=6, examples=["GET", "POST", "PUT", "DELETE"])
    path: str = Field(..., min_length=1, max_length=500, examples=["/users"])
    description: str | None = Field(default=None, max_length=5000)
    auth_required: bool = False
    request_example: dict[str, Any] | None = None
    response_example: dict[str, Any] | None = None

    @field_validator("method")
    @classmethod
    def validate_method(cls, value: str) -> str:
        method = value.strip().upper()
        if method not in {"GET", "POST", "PUT", "PATCH", "DELETE"}:
            raise ValueError("Método HTTP no permitido para auditoría.")
        return method

    @field_validator("path")
    @classmethod
    def validate_path(cls, value: str) -> str:
        path = value.strip()
        if not path.startswith("/"):
            raise ValueError("La ruta debe empezar por '/'.")
        return path

    @field_validator("request_example", "response_example")
    @classmethod
    def validate_example_size(cls, value: dict[str, Any] | None) -> dict[str, Any] | None:
        if value is None:
            return value
        # Limitamos ejemplos manuales para evitar payloads excesivos en DB, logs y prompts IA.
        if len(json.dumps(value, ensure_ascii=False)) > MAX_EXAMPLE_SIZE_CHARS:
            raise ValueError("El ejemplo supera el tamaño máximo permitido.")
        return value


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

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        return value.strip() or "Auditoría API"


class AuditMetadataUpdate(BaseModel):
    notes: str | None = Field(default=None, max_length=5000)
    tags: list[str] = Field(default_factory=list, max_length=20)


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
    notes: str | None = None
    tags: list[str] = Field(default_factory=list)


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
    issues: list[str | StructuredIssue] = Field(default_factory=list)
    recommendations: list[str | dict[str, Any]] = Field(default_factory=list)
    status: AuditStatus = "completed"
    error_message: str | None = None
    audit_mode: AuditMode = "enterprise"
    notes: str | None = None
    tags: list[str] = Field(default_factory=list)
