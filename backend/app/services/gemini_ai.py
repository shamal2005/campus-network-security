import os
import json
import logging
from typing import Dict, Any, Tuple, Optional
import httpx
from ..models.schemas import RuleExplanation

logger = logging.getLogger(__name__)

# Configurable runtime settings
_runtime_api_key: str = ""
DEFAULT_GEMINI_MODEL = "gemini-1.5-flash"


def set_gemini_api_key(api_key: str):
    """Stores a runtime API key supplied via frontend settings."""
    global _runtime_api_key
    _runtime_api_key = api_key.strip()


def get_gemini_api_key() -> str:
    """Retrieves active Gemini API key from runtime or environment variables."""
    global _runtime_api_key
    if _runtime_api_key:
        return _runtime_api_key
    return os.environ.get("GEMINI_API_KEY", "").strip()


def is_gemini_configured() -> bool:
    """Returns True if a non-empty API key is available."""
    return bool(get_gemini_api_key())


async def test_gemini_key(api_key: Optional[str] = None) -> Tuple[bool, str]:
    """Tests if a Gemini API key is valid and responsive."""
    key = (api_key or get_gemini_api_key()).strip()
    if not key:
        return False, "No Gemini API key provided. Operating in Offline Fallback Mode."

    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{DEFAULT_GEMINI_MODEL}:generateContent?key={key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": "Reply with only the word OK if you can read this."}
                ]
            }
        ],
        "generationConfig": {
            "maxOutputTokens": 10,
            "temperature": 0.0,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(endpoint, json=payload)
            if resp.status_code == 200:
                return True, "Gemini API key is valid and connected successfully."
            else:
                try:
                    err_data = resp.json()
                    err_msg = err_data.get("error", {}).get("message", resp.text)
                except Exception:
                    err_msg = resp.text
                return False, f"Gemini API returned error ({resp.status_code}): {err_msg}"
    except httpx.TimeoutException:
        return False, "Gemini API request timed out after 8 seconds."
    except Exception as e:
        return False, f"Network or connection error reaching Gemini: {str(e)}"


async def generate_gemini_explanation(
    attack_type: str,
    source_ip: str,
    destination_ip: str,
    evidence: Dict[str, Any],
    fallback: RuleExplanation,
    model_name: str = DEFAULT_GEMINI_MODEL,
) -> RuleExplanation:
    """
    Attempts to generate an intelligent cybersecurity explanation using Google Gemini API.
    If the API key is absent, network fails, or output cannot be parsed, gracefully
    returns the verified deterministic offline rule-based explanation with accurate labeling.
    """
    api_key = get_gemini_api_key()
    if not api_key:
        # Strict requirement: Never claim AI generation when offline fallback is used
        return fallback

    prompt = f"""You are a certified campus network security analyst. Analyze the following detected security incident and provide a professional, executive-level technical assessment.

INCIDENT DETAILS:
- Attack Classification: {attack_type}
- Malicious Source IP: {source_ip} (Campus Subnet: {evidence.get('source_vlan', 'Unknown')})
- Targeted Destination IP: {destination_ip} (Campus Subnet: {evidence.get('target_vlan', 'Unknown')})
- Time Window: {evidence.get('time_window', 'N/A')}
- Raw Evidence Summary: {evidence.get('raw_summary', 'N/A')}
- Metrics: {json.dumps(evidence.get('metrics', []))}

INSTRUCTIONS:
You must reply with ONLY a raw JSON object (no markdown code blocks, no ```json formatting, no preamble).
The JSON object must strictly have these 3 string keys:
{{
  "summary": "Concise 1-2 sentence explanation of the technical behavior and attacker intent.",
  "impact": "Specific potential impact on campus infrastructure, servers, student/faculty services.",
  "recommended_action": "Specific network containment recommendation, mentioning Cisco router Extended ACL filtering."
}}
"""

    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 600,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(endpoint, json=payload)
            if resp.status_code != 200:
                logger.warning(
                    f"Gemini API returned status {resp.status_code}. Reverting to offline fallback."
                )
                return fallback

            result = resp.json()
            candidates = result.get("candidates", [])
            if not candidates:
                return fallback

            text_content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            # Clean possible markdown wrapping if the model returned ```json ... ```
            cleaned = text_content.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            elif cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            parsed = json.loads(cleaned)
            summary = parsed.get("summary", "").strip()
            impact = parsed.get("impact", "").strip()
            action = parsed.get("recommended_action", "").strip()

            if summary and impact and action:
                return RuleExplanation(
                    summary=summary,
                    impact=impact,
                    recommended_action=action,
                    is_ai_generated=True,
                    provider=f"Google Gemini AI ({model_name})",
                )
    except Exception as e:
        logger.error(f"Error during Gemini API call: {e}. Using offline fallback.")

    return fallback
