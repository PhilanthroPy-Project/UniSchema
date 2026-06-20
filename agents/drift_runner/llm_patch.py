from __future__ import annotations

import os
from typing import Any

from llama_index.core.llms import ChatMessage, MessageRole
from llama_index.llms.openai import OpenAI

from .prompt import build_mapper_prompt, extract_typescript_source


def generate_mapper_patch(
    *,
    vendor: str,
    mapper_source: str,
    raw_payload: Any,
    validation_errors: dict[str, Any],
    dry_run: bool,
) -> str:
    prompt = build_mapper_prompt(
        vendor=vendor,
        mapper_source=mapper_source,
        raw_payload=raw_payload,
        validation_errors=validation_errors,
    )

    if dry_run:
        return f"// dry-run prompt for {vendor}\n// {len(prompt)} chars"

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is required for LLM mapper patch generation")

    model = os.environ.get("DRIFT_AGENT_MODEL", "gpt-4o-mini")
    llm = OpenAI(model=model, api_key=api_key)

    response = llm.chat(
        messages=[
            ChatMessage(role=MessageRole.SYSTEM, content="You output production-ready TypeScript only."),
            ChatMessage(role=MessageRole.USER, content=prompt),
        ]
    )

    return extract_typescript_source(response.message.content or "")
