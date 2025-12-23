
import json
from datetime import datetime

def score_agent_log(log):
    transcript = " ".join([line.get("text", "") for line in log.get("transcript", [])])
    score = {
        "agent_id": log.get("agent_id"),
        "contact": log.get("contact_name"),
        "timestamp": log.get("timestamp"),
        "price_claim": "€" in transcript or "Euro" in transcript,
        "legal_claim": any(keyword in transcript.lower() for keyword in ["gesetz", "rechtlich", "erlaubt", "illegal"]),
        "stop_triggered": log.get("stop_triggered", False),
        "placeholder_used": "PLACEHOLDER" in log.get("result", ""),
    }
    score["risk"] = int(score["price_claim"]) + int(score["legal_claim"]) - int(score["stop_triggered"])
    return score

# Sample usage
if __name__ == "__main__":
    with open("sample_call_log.json") as f:
        log_data = json.load(f)
    result = score_agent_log(log_data)
    print(json.dumps(result, indent=2))
