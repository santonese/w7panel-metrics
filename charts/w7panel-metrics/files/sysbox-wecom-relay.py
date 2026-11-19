import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.request import Request, urlopen


WEBHOOK = os.environ["WECOM_WEBHOOK_URL"]


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200 if self.path == "/healthz" else 404)
        self.end_headers()

    def do_POST(self):
        if self.path != "/alerts":
            self.send_error(404)
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 65536:
                raise ValueError("invalid payload size")
            payload = json.loads(self.rfile.read(size))
            alerts = payload["alerts"][:10]
            lines = ["**Sysbox 告警**"]
            for alert in alerts:
                labels = alert["labels"]
                title = alert.get("annotations", {}).get("summary", labels.get("alertname", "unknown"))
                lines.append(f"{alert['status']}: {title} (node: {labels.get('node', 'unknown')})")
            if len(payload["alerts"]) > 10:
                lines.append(f"另有 {len(payload['alerts']) - 10} 条告警")
            body = json.dumps({"msgtype": "markdown", "markdown": {"content": "\n".join(lines)[:4000]}}).encode()
        except (KeyError, ValueError, TypeError):
            self.send_response(400)
            self.end_headers()
            return
        try:
            request = Request(WEBHOOK, body, {"Content-Type": "application/json"})
            with urlopen(request, timeout=10) as response:
                result = json.load(response)
            if result.get("errcode") != 0:
                raise RuntimeError("WeCom rejected notification")
            self.send_response(200)
        except Exception:
            self.send_response(502)
        self.end_headers()


HTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
