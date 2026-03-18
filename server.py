#!/usr/bin/env python3
"""Local API + static server for the agent platform demo."""

from __future__ import annotations

import json
import mimetypes
import os
from copy import deepcopy
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "4173"))
ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "data" / "state.json"

DEFAULT_STATE = {
    "metrics": {
        "conversations_24h": 1284,
        "automation_rate": 73,
        "first_response_sec": 5.4,
        "csat": 4.6,
    },
    "intents": [
        {"name": "Order Status", "volume": 420, "containment": 88, "escalation": 12},
        {"name": "Refund Request", "volume": 196, "containment": 79, "escalation": 21},
        {"name": "Product Search", "volume": 388, "containment": 82, "escalation": 18},
        {"name": "Cancel Subscription", "volume": 88, "containment": 74, "escalation": 26},
    ],
    "node_library": ["Message", "Question", "Condition", "API", "Knowledge Search", "Handoff"],
    "flow": [
        {
            "id": 1,
            "label": "Welcome",
            "message": "Hi! I can help with orders, refunds, and product questions.",
        },
        {"id": 2, "label": "Intent Detection", "message": "Let me understand your request first."},
        {
            "id": 3,
            "label": "Fulfillment",
            "message": "I found your order details. Would you like updates by WhatsApp?",
        },
    ],
    "conversations": [
        "Anika · Order delay · Waiting 2m",
        "Ravi · Refund status · Waiting 30s",
        "Maya · Product recommendation · Bot resolved",
    ],
    "chat": [
        {"role": "bot", "text": "Hello! I am your virtual assistant. What can I help with?"},
        {"role": "user", "text": "Where is my order?"},
        {"role": "bot", "text": "Please share your order ID so I can check the status."},
    ],
    "kb": [
        "Return policy",
        "Shipping SLAs by region",
        "Subscription cancellation process",
    ],
    "channels": [
        {"name": "Website Widget", "connected": True},
        {"name": "WhatsApp", "connected": True},
        {"name": "Instagram", "connected": False},
        {"name": "Facebook Messenger", "connected": False},
        {"name": "Google Business Messages", "connected": False},
        {"name": "Slack (Internal)", "connected": True},
    ],
    "deployments": [],
}


def ensure_state_file() -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not DATA_FILE.exists():
        DATA_FILE.write_text(json.dumps(DEFAULT_STATE, indent=2), encoding="utf-8")


def read_state() -> dict:
    ensure_state_file()
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def write_state(state: dict) -> None:
    DATA_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")


def bot_reply(message: str) -> str:
    text = message.lower()
    if "order" in text:
        return "I can check that. Please share your order ID and registered phone/email."
    if "refund" in text:
        return "Refund requests are usually completed in 5-7 business days after approval."
    if "cancel" in text:
        return "I can help cancel your subscription. Do you want cancellation at period end or immediate?"
    return "Thanks — I understood that. I can connect you to an agent if you want human help."


class AppHandler(BaseHTTPRequestHandler):
    server_version = "AgentPlatformServer/1.0"

    def log_message(self, fmt: str, *args):
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            return self._json({"ok": True, "timestamp": datetime.now(timezone.utc).isoformat()})
        if parsed.path == "/api/state":
            return self._json(read_state())
        return self._static(parsed.path)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/flow":
            payload = self._body_json()
            label = (payload.get("label") or "").strip()
            if not label:
                return self._json({"error": "label is required"}, HTTPStatus.BAD_REQUEST)

            state = read_state()
            next_id = (max((step["id"] for step in state["flow"]), default=0) + 1)
            step = {"id": next_id, "label": label, "message": payload.get("message", "Draft message...")}
            state["flow"].append(step)
            write_state(state)
            return self._json(step, HTTPStatus.CREATED)

        if parsed.path == "/api/kb":
            payload = self._body_json()
            title = (payload.get("title") or "").strip()
            if not title:
                return self._json({"error": "title is required"}, HTTPStatus.BAD_REQUEST)
            state = read_state()
            state["kb"].insert(0, title)
            write_state(state)
            return self._json({"ok": True, "title": title}, HTTPStatus.CREATED)

        if parsed.path == "/api/chat":
            payload = self._body_json()
            text = (payload.get("text") or "").strip()
            if not text:
                return self._json({"error": "text is required"}, HTTPStatus.BAD_REQUEST)
            state = read_state()
            state["chat"].append({"role": "user", "text": text})
            reply = bot_reply(text)
            state["chat"].append({"role": "bot", "text": reply})
            write_state(state)
            return self._json({"reply": reply}, HTTPStatus.CREATED)

        if parsed.path == "/api/simulate":
            state = read_state()
            increment = 8
            state["metrics"]["conversations_24h"] += increment
            write_state(state)
            return self._json({"ok": True, "increment": increment, "conversations_24h": state["metrics"]["conversations_24h"]})


        if parsed.path == "/api/reset":
            reset_state()
            return self._json({"ok": True})

        if parsed.path == "/api/deploy":
            state = read_state()
            deployment = {
                "id": len(state["deployments"]) + 1,
                "channels": [c["name"] for c in state["channels"] if c["connected"]],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            state["deployments"].append(deployment)
            write_state(state)
            return self._json({"ok": True, "deployment": deployment}, HTTPStatus.CREATED)

        return self._json({"error": "Not Found"}, HTTPStatus.NOT_FOUND)

    def do_PUT(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/flow/"):
            flow_id = parsed.path.rsplit("/", 1)[-1]
            if not flow_id.isdigit():
                return self._json({"error": "Invalid flow id"}, HTTPStatus.BAD_REQUEST)

            payload = self._body_json()
            label = (payload.get("label") or "").strip()
            message = (payload.get("message") or "").strip()
            if not label or not message:
                return self._json({"error": "label and message are required"}, HTTPStatus.BAD_REQUEST)

            state = read_state()
            match = next((item for item in state["flow"] if item["id"] == int(flow_id)), None)
            if not match:
                return self._json({"error": "Flow step not found"}, HTTPStatus.NOT_FOUND)

            match["label"] = label
            match["message"] = message
            write_state(state)
            return self._json(match)

        return self._json({"error": "Not Found"}, HTTPStatus.NOT_FOUND)

    def do_PATCH(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/channels/"):
            channel_name = parsed.path.replace("/api/channels/", "", 1)
            channel_name = channel_name.replace("%20", " ")
            state = read_state()
            match = next((c for c in state["channels"] if c["name"] == channel_name), None)
            if not match:
                return self._json({"error": "Channel not found"}, HTTPStatus.NOT_FOUND)

            match["connected"] = not match["connected"]
            write_state(state)
            return self._json(match)

        return self._json({"error": "Not Found"}, HTTPStatus.NOT_FOUND)

    def _body_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length <= 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}

    def _json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _static(self, raw_path: str):
        path = raw_path or "/"
        if path == "/":
            path = "/index.html"
        safe = path.lstrip("/")
        full_path = (ROOT / safe).resolve()

        if not str(full_path).startswith(str(ROOT)) or not full_path.exists() or full_path.is_dir():
            return self._json({"error": "Not Found"}, HTTPStatus.NOT_FOUND)

        content = full_path.read_bytes()
        ctype, _ = mimetypes.guess_type(str(full_path))
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", ctype or "application/octet-stream")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)


def reset_state() -> None:
    write_state(deepcopy(DEFAULT_STATE))


def main() -> None:
    ensure_state_file()
    server = ThreadingHTTPServer((HOST, PORT), AppHandler)
    print(f"Server running on http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
