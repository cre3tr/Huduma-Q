import random
import string

SERVICE_PREFIXES = {
    "new_id": "NID",
    "replace_id": "RID",
    "collect_id": "COL",
}

def generate_code(service: str) -> str:
    prefix = SERVICE_PREFIXES.get(service, "HQ")
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{prefix}-{suffix}"
