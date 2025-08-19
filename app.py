from flask import Flask, request, jsonify, render_template
from language_tool_python import LanguageTool
import os

app = Flask(__name__)

DEFAULT_LANGUAGE = os.environ.get("DEFAULT_LANGUAGE", "en-US")
TEXT_MAX_CHARS = int(os.environ.get("TEXT_MAX_CHARS", "10000"))

_tools_by_language = {}

def get_tool(language: str | None = None) -> LanguageTool:
	lang = language or DEFAULT_LANGUAGE
	tool = _tools_by_language.get(lang)
	if tool is None:
		_tools_by_language[lang] = LanguageTool(lang)
		tool = _tools_by_language[lang]
	return tool

@app.route("/")
def index():
	return render_template("index.html")

@app.route("/api/check", methods=["POST"])
def api_check():
	data = request.get_json(silent=True) or {}
	text = data.get("text", "")
	language = data.get("language") or DEFAULT_LANGUAGE

	if not isinstance(text, str):
		return jsonify({"error": "Invalid 'text'"}), 400

	if len(text) == 0:
		return jsonify({
			"matches": [],
			"language": language,
			"textLength": 0,
		}), 200

	if len(text) > TEXT_MAX_CHARS:
		return jsonify({"error": f"Text exceeds limit of {TEXT_MAX_CHARS} characters"}), 413

	tool = get_tool(language)
	try:
		matches = tool.check(text)
	except Exception as e:
		return jsonify({"error": "Checker failed", "detail": str(e)}), 500

	results = []
	for m in matches:
		# Some versions expose context offset as 'offsetInContext' or 'contextOffset'
		_context_offset = getattr(m, "offsetInContext", None)
		if _context_offset is None:
			_context_offset = getattr(m, "contextOffset", None)
		if _context_offset is None:
			_context_offset = 0

		# Normalize replacements to list of {"value": str}
		raw_replacements = getattr(m, "replacements", []) or []
		normalized_replacements = []
		for r in raw_replacements:
			if isinstance(r, str):
				normalized_replacements.append({"value": r})
			else:
				val = getattr(r, "value", None)
				if val is None:
					val = str(r)
				normalized_replacements.append({"value": val})

		results.append({
			"message": m.message,
			"shortMessage": getattr(m, "shortMessage", "") or getattr(m, "shortmessage", ""),
			"offset": m.offset,
			"length": m.errorLength,
			"context": {
				"text": m.context,
				"offset": _context_offset,
				"length": m.errorLength,
			},
			"rule": {
				"id": m.ruleId,
				"issueType": getattr(m, "ruleIssueType", ""),
			},
			"replacements": normalized_replacements[:5],
		})

	return jsonify({
		"matches": results,
		"language": language,
		"textLength": len(text),
	}), 200

@app.route("/health")
def health():
	# Lightweight health endpoint (does not initialize LanguageTool to avoid heavy startup)
	return jsonify({"status": "ok"}), 200

if __name__ == "__main__":
	app.run(host="127.0.0.1", port=5000, debug=True)
