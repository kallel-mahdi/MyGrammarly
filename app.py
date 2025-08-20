"""
MyGrammarly Backend - Flask Application

This Flask application provides a REST API for text checking using LanguageTool.
It offers comprehensive grammar, spelling, style, and readability analysis
with enhanced categorization and ML-friendly error classification.

The backend is designed to be:
- Scalable: Caches LanguageTool instances for performance
- Configurable: Uses environment variables for settings
- Extensible: Modular design for easy feature additions
- ML-friendly: Structured error data for research purposes

@author ML Research Team
@description Backend API for the MyGrammarly writing assistant
"""

from flask import Flask, request, jsonify, render_template
from language_tool_python import LanguageTool
import os
import re
import logging
from typing import Dict, List, Optional, Any

# Configure logging for development and debugging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuration Constants
# =======================
# These can be overridden via environment variables for deployment
DEFAULT_LANGUAGE = os.environ.get("DEFAULT_LANGUAGE", "en-US")
TEXT_MAX_CHARS = int(os.environ.get("TEXT_MAX_CHARS", "10000"))
CACHE_SIZE = int(os.environ.get("CACHE_SIZE", "1000"))

# Global LanguageTool instance cache
# Maintains one instance per language for performance
_tools_by_language: Dict[str, LanguageTool] = {}

def get_tool(language: Optional[str] = None, goals: Optional[Dict] = None) -> LanguageTool:
    """
    Get or create a LanguageTool instance for the specified language
    
    This function implements lazy loading and caching of LanguageTool instances.
    Each language gets its own instance to avoid the overhead of recreating
    the tool on every request.
    
    Args:
        language: Language code (e.g., 'en-US', 'de-DE'). Defaults to DEFAULT_LANGUAGE
        goals: Writing goals dictionary for configuration (future enhancement)
    
    Returns:
        LanguageTool: Configured LanguageTool instance
    
    Example:
        tool = get_tool('en-US', {'audience': 'academic', 'tone': 'formal'})
    """
    lang = language or DEFAULT_LANGUAGE
    
    # Return cached instance if available
    if lang in _tools_by_language:
        return _tools_by_language[lang]
    
    # Create new instance with configuration
    logger.info(f"Initializing LanguageTool for language: {lang}")
    
    try:
        # Initialize LanguageTool with performance optimizations
        tool = LanguageTool(
            lang,
            config={
                'cacheSize': CACHE_SIZE,
                'pipelineCaching': True,
            }
        )
        
        # Configure tool based on writing goals (if provided)
        if goals:
            configure_tool_for_goals(tool, goals)
        
        # Cache the instance
        _tools_by_language[lang] = tool
        logger.info(f"LanguageTool initialized successfully for {lang}")
        
        return tool
        
    except Exception as e:
        logger.error(f"Failed to initialize LanguageTool for {lang}: {e}")
        raise

def configure_tool_for_goals(tool: LanguageTool, goals: Dict[str, str]) -> None:
    """
    Configure LanguageTool based on user's writing goals
    
    This function customizes the LanguageTool behavior based on the user's
    intended audience, writing purpose, and desired tone. Different goals
    may enable or disable certain rules.
    
    Args:
        tool: LanguageTool instance to configure
        goals: Dictionary with keys 'audience', 'intent', 'tone'
    
    Future Enhancement:
        This is a placeholder for goal-based rule configuration.
        Can be extended to enable/disable specific rules based on:
        - Academic vs Creative writing (strictness)
        - Formal vs Casual tone (formality rules)
        - Business vs Personal audience (terminology)
    """
    audience = goals.get('audience', 'General')
    intent = goals.get('intent', 'Inform')
    tone = goals.get('tone', 'Neutral')
    
    logger.info(f"Configuring LanguageTool for: {audience} audience, {intent} intent, {tone} tone")
    
    # Future implementation would customize rules here
    # Example:
    # if audience == 'Academic':
    #     tool.enable_rule('ACADEMIC_WORD_LIST')
    # if tone == 'Formal':
    #     tool.disable_rule('INFORMAL_CONTRACTIONS')

def enhance_match_classification(match: Any, text: str) -> Dict[str, Any]:
    """
    Enhance LanguageTool match with additional classification metadata
    
    This function analyzes LanguageTool matches to provide more detailed
    categorization and confidence scoring. This is particularly useful
    for ML research and improving user experience.
    
    Args:
        match: LanguageTool match object
        text: Original text being analyzed
    
    Returns:
        Dict with enhanced classification data:
        - category: Our standardized category (spelling, grammar, etc.)
        - confidence: How confident we are in this categorization (0-1)
        - severity: Impact level (low, medium, high)
        - explanation: Human-readable explanation
    """
    rule_id = (match.ruleId or '').lower()
    issue_type = (getattr(match, 'ruleIssueType', '') or '').lower()
    
    # Initialize classification
    category = 'other'
    confidence = 0.5
    severity = 'medium'
    explanation = 'General writing suggestion'
    
    # Spelling errors - highest confidence
    if (issue_type == 'misspelling' or 
        'spell' in rule_id or 
        'morfologic' in rule_id or
        'hunspell' in rule_id):
        category = 'spelling'
        confidence = 0.95
        severity = 'high'
        explanation = 'Likely misspelled word or typographical error'
    
    # Grammar errors - high confidence for structural issues
    elif (issue_type == 'grammar' or 
          'grammar' in rule_id or
          'agreement' in rule_id or
          'verb' in rule_id or
          'tense' in rule_id):
        category = 'grammar'
        confidence = 0.90
        severity = 'high'
        explanation = 'Grammatical error that affects meaning'
    
    # Punctuation - usually clear-cut
    elif ('punct' in rule_id or 
          'comma' in rule_id or
          'apostrophe' in rule_id):
        category = 'punctuation'
        confidence = 0.85
        severity = 'medium'
        explanation = 'Punctuation rule or convention'
    
    # Style suggestions - lower confidence, subjective
    elif (issue_type == 'style' or 
          'style' in rule_id or
          'redundancy' in rule_id or
          'wordiness' in rule_id):
        category = 'style'
        confidence = 0.70
        severity = 'low'
        explanation = 'Style suggestion for improved readability'
    
    return {
        'category': category,
        'confidence': confidence,
        'severity': severity,
        'explanation': explanation,
        'originalIssueType': issue_type
    }

def calculate_text_metrics(text: str) -> Dict[str, Any]:
    """
    Calculate comprehensive text quality metrics
    
    Provides various metrics useful for text analysis and user feedback.
    These metrics help users understand their writing patterns and improve.
    
    Args:
        text: Text to analyze
    
    Returns:
        Dictionary containing various text metrics
    """
    if not text:
        return {
            'words': 0,
            'sentences': 0,
            'paragraphs': 0,
            'avgWordsPerSentence': 0,
            'avgCharsPerWord': 0,
            'complexWords': 0,
            'readabilityScore': 0
        }
    
    # Basic counts using regex patterns
    words = len(re.findall(r'\b\w+\b', text))
    sentences = len(re.findall(r'[.!?]+', text))
    paragraphs = len([p for p in text.split('\n\n') if p.strip()])
    
    # Calculate averages
    avg_words_per_sentence = words / max(sentences, 1)
    avg_chars_per_word = len(re.sub(r'\s+', '', text)) / max(words, 1)
    
    # Complexity indicators
    complex_words = len(re.findall(r'\b\w{7,}\b', text))  # Words with 7+ characters
    
    # Simple readability estimation (Flesch-like)
    if words > 0 and sentences > 0:
        readability_score = 206.835 - (1.015 * avg_words_per_sentence) - (84.6 * avg_chars_per_word)
    else:
        readability_score = 0
    
    return {
        'words': words,
        'sentences': sentences,
        'paragraphs': max(paragraphs, 1),
        'avgWordsPerSentence': round(avg_words_per_sentence, 1),
        'avgCharsPerWord': round(avg_chars_per_word, 1),
        'complexWords': complex_words,
        'readabilityScore': max(0, min(100, readability_score))  # Clamp to 0-100
    }

# API Routes
# ==========

@app.route("/")
def index():
    """Serve the main application page"""
    return render_template("index.html")

@app.route("/api/check", methods=["POST"])
def api_check():
    """
    Main text checking endpoint
    
    Accepts text and writing goals, returns LanguageTool matches with
    enhanced categorization and text metrics.
    
    Request format:
    {
        "text": "Text to check",
        "language": "en-US" (optional),
        "goals": {
            "audience": "General",
            "intent": "Inform", 
            "tone": "Neutral"
        } (optional)
    }
    
    Response format:
    {
        "matches": [...],      // Enhanced LanguageTool matches
        "language": "en-US",   // Language used
        "textLength": 123,     // Character count
        "metrics": {...},      // Text quality metrics
        "goals": {...}         // Writing goals used
    }
    """
    # Parse request data
    data = request.get_json(silent=True) or {}
    text = data.get("text", "")
    language = data.get("language") or DEFAULT_LANGUAGE
    goals = data.get("goals", {})

    # Validate input
    if not isinstance(text, str):
        logger.warning("Invalid text type received")
        return jsonify({"error": "Invalid 'text' - must be string"}), 400

    # Handle empty text
    if len(text) == 0:
        return jsonify({
            "matches": [],
            "language": language,
            "textLength": 0,
            "metrics": calculate_text_metrics(""),
            "goals": goals
        }), 200

    # Check text length limit
    if len(text) > TEXT_MAX_CHARS:
        logger.warning(f"Text too long: {len(text)} chars (limit: {TEXT_MAX_CHARS})")
        return jsonify({
            "error": f"Text exceeds limit of {TEXT_MAX_CHARS} characters"
        }), 413

    # Get LanguageTool instance
    try:
        tool = get_tool(language, goals)
    except Exception as e:
        logger.error(f"Failed to get LanguageTool: {e}")
        return jsonify({
            "error": "Language tool initialization failed",
            "detail": str(e)
        }), 500

    # Check text with LanguageTool
    try:
        logger.info(f"Checking text: {len(text)} chars, language: {language}")
        matches = tool.check(text)
        logger.info(f"Found {len(matches)} matches")
    except Exception as e:
        logger.error(f"LanguageTool check failed: {e}")
        return jsonify({
            "error": "Text checking failed",
            "detail": str(e)
        }), 500

    # Process and enhance matches
    results = []
    for match in matches:
        try:
            # Get context offset (different versions use different attribute names)
            context_offset = (
                getattr(match, "offsetInContext", None) or
                getattr(match, "contextOffset", None) or
                0
            )

            # Normalize replacements to consistent format
            raw_replacements = getattr(match, "replacements", []) or []
            normalized_replacements = []
            
            for replacement in raw_replacements:
                if isinstance(replacement, str):
                    normalized_replacements.append({"value": replacement})
                else:
                    value = getattr(replacement, "value", None) or str(replacement)
                    normalized_replacements.append({"value": value})

            # Get enhanced classification
            classification = enhance_match_classification(match, text)

            # Build result object
            result = {
                "message": match.message,
                "shortMessage": (
                    getattr(match, "shortMessage", "") or 
                    getattr(match, "shortmessage", "")
                ),
                "offset": match.offset,
                "length": match.errorLength,
                "context": {
                    "text": match.context,
                    "offset": context_offset,
                    "length": match.errorLength,
                },
                "rule": {
                    "id": match.ruleId,
                    "issueType": getattr(match, "ruleIssueType", ""),
                    "category": getattr(match, "category", None),
                },
                "replacements": normalized_replacements[:5],  # Limit to 5 suggestions
                "classification": classification,
            }
            
            # Add rule URL if available (for explanations)
            rule_url = getattr(match, "url", None)
            if rule_url:
                result["rule"]["url"] = rule_url
            
            results.append(result)
            
        except Exception as e:
            logger.warning(f"Error processing match: {e}")
            # Continue with other matches even if one fails

    # Calculate text metrics
    metrics = calculate_text_metrics(text)

    # Return comprehensive response
    return jsonify({
        "matches": results,
        "language": language,
        "textLength": len(text),
        "metrics": metrics,
        "goals": goals,
    }), 200

@app.route("/api/languages", methods=["GET"])
def api_languages():
    """
    Get list of supported languages
    
    Returns available language codes and names for the language selector.
    """
    # This would typically come from LanguageTool's supported languages
    # For now, we return a curated list of common languages
    languages = [
        {"code": "en-US", "name": "English (US)"},
        {"code": "en-GB", "name": "English (UK)"},
        {"code": "de-DE", "name": "German"},
        {"code": "fr-FR", "name": "French"},
        {"code": "es-ES", "name": "Spanish"},
        {"code": "it-IT", "name": "Italian"},
        {"code": "pt-PT", "name": "Portuguese"},
        {"code": "nl-NL", "name": "Dutch"},
        {"code": "pl-PL", "name": "Polish"},
        {"code": "ru-RU", "name": "Russian"},
    ]
    
    return jsonify({"languages": languages}), 200

@app.route("/health")
def health():
    """
    Health check endpoint
    
    Lightweight endpoint for monitoring and deployment checks.
    Does not initialize LanguageTool to avoid startup overhead.
    """
    return jsonify({
        "status": "ok",
        "service": "MyGrammarly API",
        "version": "1.0.0"
    }), 200

# Error Handlers
# ==============

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {error}")
    return jsonify({"error": "Internal server error"}), 500

# Application Entry Point
# =======================

if __name__ == "__main__":
    # Development server configuration
    app.run(
        host="127.0.0.1",
        port=5001,
        debug=True,
        threaded=True  # Enable threading for better performance
    )
