"""Twilio SMS is a no-op unless secrets are set. Never invent a send."""
from __future__ import annotations

import os


def send_demo(body: str) -> dict:
    sid = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
    token = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
    frm = os.environ.get("TWILIO_FROM_NUMBER", "").strip()
    to = os.environ.get("TWILIO_DEMO_TO_NUMBER", "").strip()
    if not (sid and token and frm and to):
        return {
            "sent": False,
            "reason": "TWILIO_* secrets unset — SMS demo skipped, no message invented.",
        }
    try:
        from twilio.rest import Client
        msg = Client(sid, token).messages.create(from_=frm, to=to, body=body[:140])
        return {"sent": True, "sid": msg.sid}
    except Exception as exc:
        return {"sent": False, "reason": str(exc)}
