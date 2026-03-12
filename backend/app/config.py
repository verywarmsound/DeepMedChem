from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    cors_origins: list[str] = ["*"]
    default_num_conformers: int = 50
    max_conformers: int = 500

    class Config:
        env_prefix = "DMC_"


settings = Settings()
