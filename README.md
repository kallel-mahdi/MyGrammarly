# MyGrammarly - AI-Powered Writing Assistant

A comprehensive writing assistant that provides real-time grammar checking, spell checking, style suggestions, and readability analysis. Built with LanguageTool backend and a modern React frontend, designed to be both user-friendly and ML research-friendly.

## 🌟 Features

- **Real-time Error Detection**: Grammar, spelling, punctuation, and style checking as you type
- **Grammarly-like UI**: Clean, modern interface with intuitive error highlighting
- **Multiple Error Categories**: Spelling, grammar, style, readability, punctuation, tone, and clarity
- **Writing Goals**: Customizable audience, intent, and tone settings
- **Text Analytics**: Comprehensive metrics including readability scores and writing statistics
- **AI-Ready**: Placeholder for future AI-powered rephrasing features

## 🏗️ Architecture

The application follows a modular, well-documented architecture designed for both usability and research:

### Frontend Structure
```
static/
├── js/
│   ├── config/
│   │   └── constants.js          # Application constants and configuration
│   ├── utils/
│   │   ├── textAnalysis.js       # Text processing and readability functions
│   │   ├── errorCategorization.js # Error classification and grouping
│   │   └── domUtils.js           # DOM manipulation and highlighting
│   ├── components/
│   │   ├── App.js                # Main application component
│   │   ├── Editor.js             # Text editor with error highlighting
│   │   ├── Sidebar.js            # Statistics and error management
│   │   └── StatusBar.js          # Real-time status and metrics
│   └── main.js                   # Application entry point
├── styles.css                    # Unified CSS with Grammarly-inspired design
└── react-app.jsx                 # Legacy compatibility file
```

### Backend Structure
```
app.py                            # Flask API with enhanced LanguageTool integration
templates/
└── index.html                    # HTML template with modular script loading
```

## 🔧 Technical Implementation

### Error Highlighting System
- **Unified Overlay**: Single overlay system handles all error types consistently
- **Color-coded Categories**: Red (spelling), yellow (grammar), blue (style), purple (readability)
- **Interactive Popovers**: Hover for suggestions, click to apply fixes
- **Performance Optimized**: Debounced API calls and efficient DOM updates

### Text Analysis Engine
- **Flesch Reading Ease**: Advanced readability scoring with sentence-level analysis
- **Syllable Counting**: Heuristic-based algorithm for English phonetic rules
- **Statistical Metrics**: Word count, sentence analysis, complexity indicators
- **Real-time Processing**: Instant feedback without blocking the UI

### API Design
```python
POST /api/check
{
    "text": "Text to analyze",
    "language": "en-US",
    "goals": {
        "audience": "General|Academic|Business|Creative",
        "intent": "Inform|Persuade|Describe|Narrate", 
        "tone": "Formal|Neutral|Casual|Friendly"
    }
}

Response:
{
    "matches": [...],           # Enhanced LanguageTool matches
    "metrics": {...},           # Text quality metrics
    "language": "en-US",        # Language used
    "textLength": 123,          # Character count
    "goals": {...}              # Writing goals applied
}
```

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- pip (Python package manager)

### Installation

1. **Clone and navigate to the repository:**
   ```bash
   git clone <repository-url>
   cd MyGrammarly
   ```

2. **Create virtual environment (recommended):**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install flask language-tool-python
   ```

4. **Run the application:**
   ```bash
   python app.py
   ```

5. **Open your browser:**
   Navigate to `http://127.0.0.1:5001`

### Configuration

Environment variables for customization:
- `DEFAULT_LANGUAGE`: Default language code (default: "en-US")
- `TEXT_MAX_CHARS`: Maximum text length (default: 10000)
- `CACHE_SIZE`: LanguageTool cache size (default: 1000)

## 💡 Usage Guide

### Basic Writing
1. Start typing in the editor
2. Errors are highlighted in real-time with different colors
3. Hover over highlighted text to see suggestions
4. Click "Apply" to accept suggestions

### Writing Goals
Configure your writing context in the sidebar:
- **Audience**: General, Academic, Business, or Creative
- **Intent**: Inform, Persuade, Describe, or Narrate  
- **Tone**: Formal, Neutral, Casual, or Friendly

### Error Categories
- **🔴 Spelling**: Misspelled words and typos
- **🟡 Grammar**: Subject-verb agreement, tense errors
- **🔵 Style**: Writing style improvements
- **🟣 Readability**: Hard-to-read sentences
- **🟠 Punctuation**: Comma, apostrophe rules
- **🟢 Tone**: Formality and register
- **🔵 Clarity**: Wordiness and passive voice

## 🔬 For ML Researchers

### Code Organization
- **Modular Design**: Each function has a single, clear purpose
- **Comprehensive Comments**: Algorithm explanations and parameter documentation
- **Type Hints**: Python functions include type annotations
- **Error Metadata**: Confidence scores and categorization data available

### Extensibility Points
- **Custom Rules**: Extend `configure_tool_for_goals()` for specialized rule sets
- **New Categories**: Add error types in `ERROR_CATEGORIES` and update classification
- **Metrics**: Extend `calculateTextStats()` for additional text analysis
- **ML Integration**: Replace LanguageTool calls with custom models

### Data Structure
Error objects include rich metadata for research:
```javascript
{
    category: "spelling",
    confidence: 0.95,
    severity: "high", 
    classification: {...},
    context: {...},
    offset: 123,
    length: 5
}
```

## 🎨 UI/UX Features

### Grammarly-Inspired Design
- **Clean Interface**: Distraction-free writing environment
- **Consistent Colors**: Color-coded error categories with accessibility in mind
- **Responsive Layout**: Works on desktop and tablet devices
- **Real-time Feedback**: Instant visual feedback without interrupting flow

### Accessibility
- **Keyboard Navigation**: Full keyboard support for all interactions
- **Screen Reader Support**: ARIA labels and semantic HTML
- **High Contrast**: Sufficient color contrast for readability
- **Reduced Motion**: Respects user's motion preferences

## 🛠️ Development

### File Structure Explained

#### Configuration (`static/js/config/`)
- `constants.js`: Centralized configuration prevents magic numbers and makes the codebase maintainable

#### Utilities (`static/js/utils/`)
- `textAnalysis.js`: Pure functions for text processing, easily testable and reusable
- `errorCategorization.js`: Mapping LanguageTool outputs to user-friendly categories  
- `domUtils.js`: DOM manipulation helpers with XSS protection

#### Components (`static/js/components/`)
- `App.js`: State management and API coordination
- `Editor.js`: Text editing with overlay highlighting system
- `Sidebar.js`: Error management and writing analytics
- `StatusBar.js`: Real-time feedback and text metrics

### Adding New Features

1. **New Error Category**: Update `ERROR_CATEGORIES` in `constants.js` and add classification logic
2. **New Metric**: Extend `calculateTextStats()` in `textAnalysis.js`
3. **UI Component**: Create in `components/` following existing patterns
4. **API Endpoint**: Add to `app.py` with proper error handling and documentation

## 📋 API Reference

### Endpoints

#### `POST /api/check`
Main text checking endpoint with enhanced error categorization.

#### `GET /api/languages`  
Returns supported language codes and names.

#### `GET /health`
Health check endpoint for monitoring.

### Error Handling
- 400: Invalid input data
- 413: Text too long
- 500: Server processing error

All errors return JSON with descriptive error messages.

## 🤝 Contributing

1. Follow the existing code style and documentation patterns
2. Add comprehensive comments for any new algorithms
3. Test with various text samples and error types
4. Update this README for any architectural changes

## 📄 License

This project is designed for educational and research purposes. Please check LanguageTool's licensing for commercial use.

## 🙏 Acknowledgments

- **LanguageTool**: Powerful open-source grammar checking engine
- **Grammarly**: UI/UX inspiration for modern writing assistance
- **React**: Frontend framework for interactive user interfaces
- **Flask**: Lightweight backend framework for Python

---

**Happy Writing!** 📝✨
