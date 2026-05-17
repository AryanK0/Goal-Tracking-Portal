from __future__ import annotations

import uuid


def uid() -> str:
    return uuid.uuid4().hex
