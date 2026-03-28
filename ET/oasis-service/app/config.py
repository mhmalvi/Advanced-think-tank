"""Configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """OASIS service configuration."""

    # Anthropic
    anthropic_api_key: str = ""
    llm_model: str = "claude-haiku-4-5-20251001"

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # Pinecone
    pinecone_api_key: str = ""
    pinecone_index: str = "advanced-think-tank"

    # Simulation defaults
    max_agents: int = 50
    max_steps: int = 3
    default_agent_count: int = 50

    # Data directory for temporary OASIS SQLite files
    data_dir: str = "/app/data"

    class Config:
        env_prefix = "OASIS_"
        # Also read unprefixed vars for Supabase/Pinecone
        env_file = ".env"


settings = Settings()
