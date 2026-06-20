from __future__ import annotations

import json
import os
import re
from typing import Any

PROMPT_TEMPLATE = """You are a TypeScript maintainer for UniSchema, a webhook unification service.

A production webhook payload failed Zod validation when mapped to the ConstituentEvent master schema.

Vendor: {vendor}

Failed payload (JSON):
{payload_json}

Zod validation errors (flattened):
{errors_json}

Current mapper implementation (`src/mappers/{vendor}.ts`):
```typescript
{mapper_source}
```

Requirements:
1. Update ONLY the vendor mapper so the failed payload validates against ConstituentEventSchema.
2. Preserve existing behavior for previously valid payloads.
3. Keep using `toPrimitiveRecord` for the `payload` field.
4. Do not introduce `z.unknown()` or nested object types in the master schema output.
5. Return the COMPLETE updated TypeScript file — no markdown fences, no commentary.
"""


def build_mapper_prompt(
    *,
    vendor: str,
    mapper_source: str,
    raw_payload: Any,
    validation_errors: dict[str, Any],
) -> str:
    return PROMPT_TEMPLATE.format(
        vendor=vendor,
        payload_json=json.dumps(raw_payload, indent=2),
        errors_json=json.dumps(validation_errors, indent=2),
        mapper_source=mapper_source.strip(),
    )


def extract_typescript_source(llm_response: str) -> str:
    fenced = re.search(r"```(?:typescript|ts)?\n([\s\S]*?)```", llm_response)
    if fenced:
        return fenced.group(1).strip()

    return llm_response.strip()
