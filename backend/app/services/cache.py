from __future__ import annotations

import json
import os
import time
from typing import Any

try:
    import redis
except ImportError:  # pragma: no cover - optional production dependency
    redis = None


_memory_cache: dict[str, tuple[float, Any]] = {}
_redis_client = None


def _client():
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    redis_url = os.getenv("REDIS_URL")
    if redis_url and redis is not None:
        try:
            _redis_client = redis.Redis.from_url(redis_url, decode_responses=True)
            _redis_client.ping()
        except Exception:
            _redis_client = False
    else:
        _redis_client = False
    return _redis_client


def cache_get(key: str) -> Any | None:
    client = _client()
    if client:
        try:
            value = client.get(key)
            return json.loads(value) if value else None
        except Exception:
            return None
    expires_at, value = _memory_cache.get(key, (0, None))
    if expires_at > time.time():
        return value
    _memory_cache.pop(key, None)
    return None


def cache_set(key: str, value: Any, ttl_seconds: int = 45) -> None:
    client = _client()
    if client:
        try:
            client.setex(key, ttl_seconds, json.dumps(value))
        except Exception:
            pass
        return
    _memory_cache[key] = (time.time() + ttl_seconds, value)


def cache_delete_prefix(prefix: str) -> None:
    client = _client()
    if client:
        try:
            for key in client.scan_iter(f"{prefix}*"):
                client.delete(key)
        except Exception:
            pass
        return
    for key in list(_memory_cache):
        if key.startswith(prefix):
            _memory_cache.pop(key, None)
