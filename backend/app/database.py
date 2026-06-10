"""Supabase 클라이언트 — service(secret) key로 단일 진입. RLS는 off,
권한 통제는 FastAPI 레이어(auth.py)에서 수행한다.
"""
from supabase import create_client, Client

from app.config import settings

supabase: Client = create_client(settings.supabase_url, settings.supabase_key)
