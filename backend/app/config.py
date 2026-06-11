"""환경변수 로딩 (pydantic-settings).

`.env` 파일에서 값을 읽어온다. 실제 키는 커밋하지 않으며,
키 목록은 `.env.example` 참고.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Anthropic
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-6"

    # OpenAI
    openai_api_key: str = ""
    embedding_model: str = "text-embedding-3-small"
    # Pinecone 인덱스(biz-lunch-reviews)가 512차원으로 생성되어 거기에 맞춤.
    # text-embedding-3-small은 dimensions 파라미터로 출력 차원 축소를 지원.
    embedding_dimensions: int = 512

    # Pinecone
    pinecone_api_key: str = ""
    pinecone_index_name: str = "biz-lunch-reviews"

    # Supabase
    supabase_url: str = ""
    supabase_key: str = ""

    # Kakao
    kakao_api_key: str = ""

    # JWT
    jwt_secret_key: str = "change-me"
    jwt_expire_days: int = 7

    # CORS
    frontend_url: str = "https://biz-lunch-lab.vercel.app"


settings = Settings()
