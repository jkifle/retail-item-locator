"""Application configuration loaded from environment variables."""

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")


def _csv_env(name: str, default: str) -> list[str]:
    return [value.strip() for value in os.environ.get(name, default).split(",") if value.strip()]


@dataclass(frozen=True)
class Config:
    database_url: str | None = os.environ.get("DATABASE_URL")
    log_level: str = os.environ.get("LOG_LEVEL", "INFO")
    log_file: str = os.environ.get("LOG_FILE", "api.log")
    firebase_project_id: str | None = os.environ.get("FIREBASE_PROJECT_ID")
    firebase_credentials_json: str | None = os.environ.get("FIREBASE_CREDENTIALS_JSON")
    cors_origins: list[str] = None
    debug: bool = os.environ.get("FLASK_ENV") == "development"

    def __post_init__(self):
        if self.cors_origins is None:
            object.__setattr__(
                self,
                "cors_origins",
                _csv_env(
                    "CORS_ORIGINS",
                    "https://retail-item-locator.onrender.com,"
                    "https://retail-item-locator-api.onrender.com,"
                    "http://localhost:5173,"
                    "http://localhost:3000",
                ),
            )


config = Config()
