/**
 * MyGrammarly - Consolidated Application
 * 
 * This file consolidates all the modular components into a single file
 * that works with Babel standalone. The modular structure is still
 * available in static/js/ for development and research.
 * 
 * @author ML Research Team
 * @description Working consolidated version for browser compatibility
 */

const { useEffect, useMemo, useRef, useState, useCallback } = React;

// =============================================================================
// CONFIGURATION AND CONSTANTS
// =============================================================================

const API_CONFIG = {
    DEBOUNCE_MS: 500,
    TEXT_LIMIT: 10000,
    CHECK_ENDPOINT: '/api/check',
    HOVER_DELAY: 160
};

const ERROR_CATEGORIES = {
    'spelling': { 
        name: 'Spelling', 
        color: '#dc2626',
        description: 'Misspelled words and typographical errors'
    },
    'grammar': { 
        name: 'Grammar', 
        color: '#eab308',
        description: 'Subject-verb agreement, tense errors, and grammatical mistakes'
    },
    'style': { 
        name: 'Style', 
        color: '#2563eb',
        description: 'Writing style improvements and suggestions'
    },
    'readability': { 
        name: 'Readability', 
        color: '#7c3aed',
        description: 'Hard-to-read sentences and clarity improvements'
    },
    'punctuation': { 
        name: 'Punctuation', 
        color: '#ea580c',
        description: 'Comma usage, apostrophes, and punctuation rules'
    },
    'tone': { 
        name: 'Tone', 
        color: '#059669',
        description: 'Formal vs informal language and tone adjustments'
    },
    'clarity': { 
        name: 'Clarity', 
        color: '#0891b2',
        description: 'Wordiness, passive voice, and clarity improvements'
    },
    'other': { 
        name: 'Other', 
        color: '#6b7280',
        description: 'Other writing suggestions and improvements'
    }
};

const WRITING_GOALS = {
    audience: {
        label: 'Audience',
        options: ['General', 'Academic', 'Business', 'Creative'],
        default: 'General',
        description: 'Who will read your writing?'
    },
    intent: {
        label: 'Intent', 
        options: ['Inform', 'Persuade', 'Describe', 'Narrate'],
        default: 'Inform',
        description: 'What is your writing goal?'
    },
    tone: {
        label: 'Tone',
        options: ['Formal', 'Neutral', 'Casual', 'Friendly'],
        default: 'Neutral',
        description: 'What tone should your writing have?'
    }
};

const READABILITY_CONFIG = {
    BAD_THRESHOLD: 50,
    GOOD_THRESHOLD: 70,
    SENTENCE_LENGTH_LIMIT: 20
};

const DEFAULT_SAMPLE = `They're going to the store to buy some fruit and vegetables, which is good for their health. However, he don't like apples, so they decides to buy oranges instead. The store, which was very busy, had many customers waiting in line. After purchasing the items they returns home to cook dinner; it was late, they was hungry. I think this is more better than last time. An user should have checked the receipt, but its obvious they forgot. The team are planning a state-of-the-art project that will literally utilize cutting-edge solutions. Its color is blue and the the design is very unique. There are fewer people than before, but each person have to do 10 tasks. I could care less about whether it rains; in fact, a lot of people say it's fine. Please email your adress to the manager ASAP and bring you're ID. The manager said said he would review the application. This is a really really good example of repetition issues that should be caught. To be clear however this sentence has no commas and it just goes on and on without pausing making it kind of hard to read for many readers and it could definitely be better written because it's way too long and contains multiple clauses that should probably be separated into different sentences for better readability and comprehension by the target audience. The color of the walls are blue. They was happy with there decision. The other managers and the other staff members had other opinions about the other proposals. Between you and I, this sentence contains several errors.`;

const UI_TEXT = {
    PLACEHOLDER: "Start writing your masterpiece...",
    NO_ISSUES: "Great job! No issues found.",
    CHECKING: "Checking...",
    ERROR_PREFIX: "Error: ",
    SUGGESTIONS_SINGLE: "suggestion",
    SUGGESTIONS_PLURAL: "suggestions",
    AI_REPHRASE_COMING_SOON: "Rephrase with AI (Coming Soon)",
    GREAT_WRITING: "Great writing!",
    IDLE: "Idle"
};

const CSS_CLASSES = {
    ERROR_HIGHLIGHT: 'error-highlight',
    LOADING_PULSE: 'loading-pulse',
    STATUS_CHECKING: 'checking',
    STATUS_SUCCESS: 'success',
    STATUS_ERROR: 'error'
};

// =============================================================================
// TEXT ANALYSIS UTILITIES
// =============================================================================

function splitIntoSentences(text) {
    if (!text || typeof text !== 'string') return [];
    
    const regex = /[^.!?]+[.!?]+|[^.!?]+$/g;
    const sentences = [];
    let match;
    
    while ((match = regex.exec(text)) !== null) {
        sentences.push(match[0]);
    }
    
    return sentences
        .map(sentence => sentence.trim())
        .filter(sentence => sentence.length > 0);
}

function getSentencesWithOffsets(text) {
    if (!text || typeof text !== 'string') return [];
    
    const regex = /[^.!?]+[.!?]+|[^.!?]+$/g;
    const sentences = [];
    let match;
    
    while ((match = regex.exec(text)) !== null) {
        const rawText = match[0];
        const start = match.index;
        const end = start + rawText.length;
        
        sentences.push({ 
            start, 
            end, 
            text: rawText 
        });
    }
    
    return sentences;
}

function countSyllables(word) {
    if (!word || typeof word !== 'string') return 0;
    
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!cleanWord) return 0;
    
    if (cleanWord.length <= 3) return 1;
    
    const vowels = 'aeiouy';
    let syllableCount = 0;
    let previousWasVowel = false;
    
    for (let i = 0; i < cleanWord.length; i++) {
        const isVowel = vowels.includes(cleanWord[i]);
        
        if (isVowel && !previousWasVowel) {
            syllableCount++;
        }
        
        previousWasVowel = isVowel;
    }
    
    if (cleanWord.endsWith('e')) {
        syllableCount--;
    }
    
    if (cleanWord.endsWith('le') && 
        cleanWord.length > 2 && 
        !vowels.includes(cleanWord[cleanWord.length - 3])) {
        syllableCount++;
    }
    
    return Math.max(syllableCount, 1);
}

function fleschReadingEase(text) {
    if (!text || typeof text !== 'string') return 0;
    
    const words = text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [];
    const sentences = splitIntoSentences(text);
    
    if (words.length === 0 || sentences.length === 0) return 0;
    
    const totalSyllables = words.reduce((acc, word) => acc + countSyllables(word), 0);
    
    const averageSentenceLength = words.length / sentences.length;
    const averageSyllablesPerWord = totalSyllables / words.length;
    
    const fleschScore = 206.835 - (1.015 * averageSentenceLength) - (84.6 * averageSyllablesPerWord);
    
    return fleschScore;
}

function calculateTextStats(text) {
    if (!text || typeof text !== 'string') {
        return {
            characters: 0,
            words: 0,
            sentences: 0,
            paragraphs: 0,
            avgWordsPerSentence: 0,
            avgCharsPerWord: 0,
            readabilityScore: 0,
            readabilityLevel: "N/A"
        };
    }
    
    const characters = text.length;
    const words = (text.match(/\b\w+\b/g) || []).length;
    const sentences = splitIntoSentences(text).length;
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
    
    const avgWordsPerSentence = sentences > 0 ? words / sentences : 0;
    const avgCharsPerWord = words > 0 ? characters / words : 0;
    
    const readabilityScore = fleschReadingEase(text);
    
    return {
        characters,
        words,
        sentences,
        paragraphs,
        avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
        avgCharsPerWord: Math.round(avgCharsPerWord * 10) / 10,
        readabilityScore: Math.round(readabilityScore * 10) / 10,
        readabilityLevel: getReadabilityLevel(readabilityScore)
    };
}

function getReadabilityLevel(score) {
    if (score >= 90) return "Very Easy";
    if (score >= 80) return "Easy";
    if (score >= 70) return "Fairly Easy";
    if (score >= 60) return "Standard";
    if (score >= 50) return "Fairly Difficult";
    if (score >= 30) return "Difficult";
    return "Very Difficult";
}

function findHardSentences(text, threshold = READABILITY_CONFIG.BAD_THRESHOLD) {
    const sentences = getSentencesWithOffsets(text);
    const hardSentences = [];
    
    for (const sentence of sentences) {
        const score = fleschReadingEase(sentence.text);
        if (score < threshold) {
            hardSentences.push({
                ...sentence,
                score
            });
        }
    }
    
    return hardSentences;
}

function debounceFn(fn, delay) {
    let timeoutId = null;
    
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

// =============================================================================
// ERROR CATEGORIZATION UTILITIES
// =============================================================================

function categorizeError(match) {
    if (!match || !match.rule) return 'other';
    
    const issueType = (match.rule.issueType || '').toLowerCase();
    const ruleId = (match.rule.id || '').toLowerCase();
    
    if (isSpellingError(issueType, ruleId)) {
        return 'spelling';
    }
    
    if (isGrammarError(issueType, ruleId)) {
        return 'grammar';
    }
    
    if (isPunctuationError(issueType, ruleId)) {
        return 'punctuation';
    }
    
    if (isToneError(issueType, ruleId)) {
        return 'tone';
    }
    
    if (isClarityError(issueType, ruleId)) {
        return 'clarity';
    }
    
    if (isStyleError(issueType, ruleId)) {
        return 'style';
    }
    
    return 'other';
}

function isSpellingError(issueType, ruleId) {
    return (
        issueType === 'misspelling' ||
        ruleId.includes('spell') ||
        ruleId.includes('morfologic') ||
        ruleId.includes('hunspell') ||
        ruleId.includes('dictionary')
    );
}

function isGrammarError(issueType, ruleId) {
    return (
        issueType === 'grammar' ||
        ruleId.includes('grammar') ||
        ruleId.includes('agreement') ||
        ruleId.includes('verb') ||
        ruleId.includes('tense') ||
        ruleId.includes('article') ||
        ruleId.includes('pronoun') ||
        ruleId.includes('concord')
    );
}

function isPunctuationError(issueType, ruleId) {
    return (
        issueType === 'typographical' ||
        ruleId.includes('punct') ||
        ruleId.includes('comma') ||
        ruleId.includes('apostrophe') ||
        ruleId.includes('quotation') ||
        ruleId.includes('period') ||
        ruleId.includes('semicolon') ||
        ruleId.includes('colon')
    );
}

function isToneError(issueType, ruleId) {
    return (
        ruleId.includes('formal') ||
        ruleId.includes('tone') ||
        ruleId.includes('register') ||
        ruleId.includes('polite') ||
        ruleId.includes('courtesy') ||
        ruleId.includes('informal')
    );
}

function isClarityError(issueType, ruleId) {
    return (
        ruleId.includes('clarity') ||
        ruleId.includes('passive') ||
        ruleId.includes('wordy') ||
        ruleId.includes('redundant') ||
        ruleId.includes('nominaliz') ||
        ruleId.includes('unclear') ||
        ruleId.includes('verbose')
    );
}

function isStyleError(issueType, ruleId) {
    return (
        issueType === 'style' ||
        ruleId.includes('style') ||
        ruleId.includes('colloquial') ||
        ruleId.includes('repetition') ||
        ruleId.includes('word_choice') ||
        ruleId.includes('variety') ||
        ruleId.includes('redundan') ||
        ruleId.includes('repeat') ||
        ruleId.includes('duplicate') ||
        ruleId.includes('unnecessary')
    );
}

function groupErrorsByCategory(errors) {
    const grouped = {};
    Object.keys(ERROR_CATEGORIES).forEach(category => {
        grouped[category] = [];
    });
    
    errors.forEach(error => {
        const category = error.category || 'other';
        if (grouped[category]) {
            grouped[category].push(error);
        } else {
            grouped['other'].push(error);
        }
    });
    
    return grouped;
}

function enhanceErrors(rawErrors, readabilityIssues = []) {
    const enhanced = [];
    
    console.log(`Processing ${rawErrors.length} LanguageTool errors and ${readabilityIssues.length} readability issues`);
    
    rawErrors.forEach((error, index) => {
        const category = categorizeError(error);
        const enhancedError = {
            ...error,
            category,
            type: 'languagetool',
            index,
            id: `lt-${index}`
        };
        
        console.log(`LT Error ${index}: "${error.message}" at ${error.offset}-${error.offset + error.length} -> category: ${category}`);
        enhanced.push(enhancedError);
    });
    
    readabilityIssues.forEach((issue, index) => {
        enhanced.push({
            message: `This sentence is hard to read (Flesch score: ${issue.score.toFixed(1)})`,
            shortMessage: 'Consider breaking it into shorter sentences or simplifying the language.',
            offset: issue.start,
            length: issue.end - issue.start,
            context: {
                text: issue.text,
                offset: 0,
                length: issue.text.length
            },
            category: 'readability',
            type: 'readability',
            index: `readability-${index}`,
            id: `read-${index}`,
            replacements: []
        });
    });
    
    console.log(`Total enhanced errors: ${enhanced.length}`);
    
    // Add debugging information to window for inspection
    if (typeof window !== 'undefined') {
        window.debugErrors = {
            raw: rawErrors,
            readability: readabilityIssues,
            enhanced: enhanced
        };
    }
    
    return enhanced;
}

// =============================================================================
// DOM UTILITIES
// =============================================================================

function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    
    const htmlEscapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    
    return str.replace(/[&<>"']/g, char => htmlEscapeMap[char]);
}

function createHighlightedHTML(text, errors) {
    if (!text) return '';
    if (!errors || errors.length === 0) return escapeHTML(text);
    
    // Sort errors by position, but handle overlapping errors better
    const sortedErrors = [...errors]
        .sort((a, b) => {
            // Primary sort: by start position
            if (a.offset !== b.offset) return a.offset - b.offset;
            // Secondary sort: shorter errors first (so they don't get hidden by longer ones)
            return a.length - b.length;
        });
    
    // Create array to track which characters are already highlighted
    const highlightedChars = new Array(text.length).fill(false);
    const htmlParts = [];
    let currentPosition = 0;
    
    for (let i = 0; i < sortedErrors.length; i++) {
        const error = sortedErrors[i];
        const start = error.offset;
        const end = error.offset + error.length;
        
        // Skip if this error is completely within already highlighted text
        const isOverlapped = highlightedChars.slice(start, end).every(highlighted => highlighted);
        if (isOverlapped) {
            console.log(`Skipping overlapped error: "${text.slice(start, end)}" at ${start}-${end}`);
            continue;
        }
        
        // Add unhighlighted text before this error
        if (start > currentPosition) {
            htmlParts.push(escapeHTML(text.slice(currentPosition, start)));
        }
        
        // Mark these characters as highlighted
        for (let j = start; j < end; j++) {
            highlightedChars[j] = true;
        }
        
        const errorText = text.slice(start, end);
        const category = error.category || 'other';
        const type = error.type || 'error';
        const originalIndex = error.index !== undefined ? error.index : i;
        
        const highlightSpan = `<span class="${CSS_CLASSES.ERROR_HIGHLIGHT} ${category}" ` +
                             `data-index="${originalIndex}" ` +
                             `data-type="${type}" ` +
                             `data-category="${category}" ` +
                             `title="${escapeHTML(error.message || 'Error detected')}">${escapeHTML(errorText)}</span>`;
        
        htmlParts.push(highlightSpan);
        currentPosition = Math.max(currentPosition, end);
    }
    
    // Add remaining text
    if (currentPosition < text.length) {
        htmlParts.push(escapeHTML(text.slice(currentPosition)));
    }
    
    return htmlParts.join('');
}

function syncOverlayWithTextarea(textarea, overlay) {
    if (!textarea || !overlay) return;
    
    const textareaStyle = getComputedStyle(textarea);
    
    overlay.style.fontSize = textareaStyle.fontSize;
    overlay.style.lineHeight = textareaStyle.lineHeight;
    overlay.style.fontFamily = textareaStyle.fontFamily;
    overlay.style.fontWeight = textareaStyle.fontWeight;
    overlay.style.fontStyle = textareaStyle.fontStyle;
    overlay.style.letterSpacing = textareaStyle.letterSpacing;
    
    overlay.style.padding = textareaStyle.padding;
    overlay.style.borderRadius = textareaStyle.borderRadius;
    
    overlay.style.width = textarea.clientWidth + 'px';
    overlay.style.height = textarea.clientHeight + 'px';
    
    overlay.scrollTop = textarea.scrollTop;
    overlay.scrollLeft = textarea.scrollLeft;
}

function findErrorAtCoordinates(x, y, overlay) {
    if (!overlay) return null;
    
    const errorSpans = overlay.querySelectorAll(`.${CSS_CLASSES.ERROR_HIGHLIGHT}`);
    
    for (const span of errorSpans) {
        const rect = span.getBoundingClientRect();
        
        if (x >= rect.left && x <= rect.right && 
            y >= rect.top && y <= rect.bottom) {
            
            return {
                element: span,
                index: span.getAttribute('data-index'),
                type: span.getAttribute('data-type'),
                category: span.getAttribute('data-category')
            };
        }
    }
    
    return null;
}

// =============================================================================
// REACT COMPONENTS
// =============================================================================

function StatusBar({ 
    charCount = 0, 
    wordCount = 0, 
    sentenceCount = 0, 
    status = UI_TEXT.IDLE,
    isChecking = false,
    hasErrors = false 
}) {
    const getStatusClass = () => {
        if (isChecking) return CSS_CLASSES.STATUS_CHECKING;
        if (status.includes('Error')) return CSS_CLASSES.STATUS_ERROR;
        if (hasErrors) return '';
        return CSS_CLASSES.STATUS_SUCCESS;
    };
    
    const formatStatus = () => {
        if (isChecking) return UI_TEXT.CHECKING;
        if (status === UI_TEXT.IDLE && !hasErrors) return UI_TEXT.GREAT_WRITING;
        return status;
    };
    
    return (
        <div className="status-bar">
            <div className="status-indicator">
                <span>
                    {charCount.toLocaleString()} character{charCount === 1 ? '' : 's'}
                    {' • '}
                    {wordCount.toLocaleString()} word{wordCount === 1 ? '' : 's'}
                    {' • '}
                    {sentenceCount.toLocaleString()} sentence{sentenceCount === 1 ? '' : 's'}
                </span>
            </div>
            
            <div className={`status-indicator ${getStatusClass()}`}>
                {isChecking && (
                    <span className={CSS_CLASSES.LOADING_PULSE}>
                        ⟳
                    </span>
                )}
                <span>{formatStatus()}</span>
            </div>
        </div>
    );
}

function Editor({ 
    text, 
    onTextChange, 
    errors = [], 
    onApplyReplacement,
    className = '',
    placeholder = UI_TEXT.PLACEHOLDER
}) {
    const textareaRef = useRef(null);
    const overlayRef = useRef(null);
    const wrapperRef = useRef(null);
    const popoverRef = useRef(null);
    
    const hoverTimerRef = useRef(null);
    const hoverActiveIndexRef = useRef(null);
    const isPopoverPinnedRef = useRef(false);

    const renderOverlay = useCallback(() => {
        const overlay = overlayRef.current;
        const textarea = textareaRef.current;
        
        if (!overlay || !textarea) return;
        
        if (!text) {
            overlay.innerHTML = '';
            return;
        }
        
        const highlightedHTML = createHighlightedHTML(text, errors);
        overlay.innerHTML = highlightedHTML;
        
        syncOverlayWithTextarea(textarea, overlay);
    }, [text, errors]);

    const syncOverlayMetrics = useCallback(() => {
        const textarea = textareaRef.current;
        const overlay = overlayRef.current;
        
        if (textarea && overlay) {
            syncOverlayWithTextarea(textarea, overlay);
        }
    }, []);

    const hidePopover = useCallback(() => {
        const popover = popoverRef.current;
        if (!popover) return;
        
        popover.style.display = 'none';
        popover.hidden = true;
        hoverActiveIndexRef.current = null;
    }, []);

    const showPopover = useCallback((errorElement, errorData) => {
        const popover = popoverRef.current;
        const wrapper = wrapperRef.current;
        
        if (!popover || !wrapper) return;
        
        const wrapperRect = wrapper.getBoundingClientRect();
        const errorRect = errorElement.getBoundingClientRect();
        
        const top = (errorRect.bottom - wrapperRect.top) + 8;
        const left = (errorRect.left - wrapperRect.left) + (errorRect.width / 2);
        
        popover.style.top = `${top}px`;
        popover.style.left = `${left}px`;
        popover.style.transform = 'translateX(-50%)';
        
        const category = errorData.category || 'other';
        const categoryInfo = ERROR_CATEGORIES[category] || ERROR_CATEGORIES.other;
        const best = errorData.replacements?.[0]?.value;
        
        // Enhanced readability popup content
        let popoverContent;
        if (category === 'readability') {
            const score = errorData.message.match(/(\d+\.?\d*)/)?.[1] || 'low';
            popoverContent = `
                <div class="popover-header">
                    <div class="issue-badge ${category}">📖 ${categoryInfo.name}</div>
                </div>
                <div class="popover-body">
                    <div class="pop-message">🔍 Hard to Read Sentence</div>
                    <div class="pop-explanation">
                        This sentence has a low readability score (${score}). Consider breaking it into shorter sentences or using simpler words to improve clarity.
                    </div>
                    <div class="pop-actions">
                        <button class="ai-rephrase-button" disabled>
                            <span class="ai-icon">🤖</span>
                            Rephrase with AI (Coming Soon)
                        </button>
                        <button class="secondary" data-close="1">Got it</button>
                    </div>
                </div>
            `;
        } else {
            // Regular error popup
            popoverContent = `
                <div class="popover-header">
                    <div class="issue-badge ${category}">${categoryInfo.name}</div>
                </div>
                <div class="popover-body">
                    <div class="pop-message">${escapeHTML(errorData.message || '')}</div>
                    <div class="pop-explanation">
                        ${errorData.shortMessage ? escapeHTML(errorData.shortMessage) : 'Click to apply the suggested correction.'}
                    </div>
                    <div class="pop-actions">
                        ${best ? `<button data-apply="1" data-index="${errorData.index}">Apply: "${escapeHTML(best)}"</button>` : ''}
                        <button class="secondary" data-close="1">Dismiss</button>
                    </div>
                </div>
            `;
        }
        
        popover.innerHTML = popoverContent;
        
        popover.style.display = 'block';
        popover.hidden = false;
        
        popover.onclick = (e) => {
            const apply = e.target.getAttribute('data-apply');
            const close = e.target.getAttribute('data-close');
            const index = e.target.getAttribute('data-index');
            
            if (apply && index !== null) {
                const replacement = best;
                if (replacement && onApplyReplacement) {
                    onApplyReplacement(parseInt(index), replacement);
                }
                hidePopover();
            } else if (close) {
                hidePopover();
            }
        };
    }, [hidePopover, onApplyReplacement]);

    const findErrorAtPoint = useCallback((x, y) => {
        const overlay = overlayRef.current;
        if (!overlay) return null;
        
        return findErrorAtCoordinates(x, y, overlay);
    }, []);

    useEffect(() => {
        renderOverlay();
    }, [renderOverlay]);

    useEffect(() => {
        syncOverlayMetrics();
        
        const handleResize = () => syncOverlayMetrics();
        window.addEventListener('resize', handleResize);
        
        return () => window.removeEventListener('resize', handleResize);
    }, [syncOverlayMetrics]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        
        const handleScroll = () => {
            const overlay = overlayRef.current;
            if (overlay) {
                overlay.scrollTop = textarea.scrollTop;
                overlay.scrollLeft = textarea.scrollLeft;
            }
        };
        
        textarea.addEventListener('scroll', handleScroll);
        return () => textarea.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;
        
        const handleMouseMove = (e) => {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = setTimeout(() => {
                if (isPopoverPinnedRef.current) return;
                
                const errorInfo = findErrorAtPoint(e.clientX, e.clientY);
                if (!errorInfo) {
                    if (hoverActiveIndexRef.current != null && !isPopoverPinnedRef.current) {
                        hidePopover();
                    }
                    hoverActiveIndexRef.current = null;
                    return;
                }
                
                const { index, type, element } = errorInfo;
                const key = `${type}-${index}`;
                
                if (key !== hoverActiveIndexRef.current) {
                    let error;
                    
                    // Handle different index formats
                    if (type === 'readability') {
                        // For readability errors, find by type and extract numeric index
                        const numericIndex = index.replace('readability-', '');
                        error = errors.find(e => e.type === 'readability' && e.id === `read-${numericIndex}`);
                    } else {
                        // For LanguageTool errors, use numeric index
                        const numericIndex = parseInt(index);
                        error = errors[numericIndex] || errors.find(e => e.index === numericIndex);
                    }
                    
                    if (error) {
                        showPopover(element, error);
                        hoverActiveIndexRef.current = key;
                    } else {
                        console.log(`Could not find error for type: ${type}, index: ${index}`);
                    }
                }
            }, API_CONFIG.HOVER_DELAY);
        };
        
        const handleMouseLeave = () => {
            hoverActiveIndexRef.current = null;
            if (!isPopoverPinnedRef.current) hidePopover();
        };
        
        wrapper.addEventListener('mousemove', handleMouseMove);
        wrapper.addEventListener('mouseleave', handleMouseLeave);
        
        return () => {
            wrapper.removeEventListener('mousemove', handleMouseMove);
            wrapper.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [findErrorAtPoint, showPopover, hidePopover, errors]);

    useEffect(() => {
        const popover = popoverRef.current;
        if (!popover) return;
        
        const handlePopoverEnter = () => {
            isPopoverPinnedRef.current = true;
        };
        
        const handlePopoverLeave = (e) => {
            isPopoverPinnedRef.current = false;
            const errorInfo = findErrorAtPoint(e.clientX, e.clientY);
            if (!errorInfo) hidePopover();
        };
        
        popover.addEventListener('mouseenter', handlePopoverEnter);
        popover.addEventListener('mouseleave', handlePopoverLeave);
        
        return () => {
            popover.removeEventListener('mouseenter', handlePopoverEnter);
            popover.removeEventListener('mouseleave', handlePopoverLeave);
        };
    }, [findErrorAtPoint, hidePopover]);

    useEffect(() => {
        const handleDocumentClick = (e) => {
            const popover = popoverRef.current;
            if (!popover) return;
            
            if (!popover.contains(e.target) && 
                e.target !== overlayRef.current && 
                !isPopoverPinnedRef.current) {
                hidePopover();
            }
        };
        
        document.addEventListener('click', handleDocumentClick);
        return () => document.removeEventListener('click', handleDocumentClick);
    }, [hidePopover]);

    const handleTextChange = (e) => {
        if (onTextChange) {
            onTextChange(e.target.value);
        }
    };

    const handleBlur = () => {
        if (onTextChange) {
            onTextChange(text);
        }
    };

    const handlePaste = () => {
        setTimeout(() => {
            if (onTextChange) {
                onTextChange(textareaRef.current?.value || text);
            }
        }, 0);
    };

    return (
        <div className={`editor-wrapper ${className}`} ref={wrapperRef}>
            <div 
                id="editorOverlay" 
                aria-hidden="true" 
                ref={overlayRef}
            />
            
            <textarea
                id="editor"
                placeholder={placeholder}
                rows={16}
                spellCheck={false}
                ref={textareaRef}
                value={text}
                onChange={handleTextChange}
                onBlur={handleBlur}
                onPaste={handlePaste}
            />
            
            <div 
                id="popover" 
                hidden 
                ref={popoverRef} 
            />
        </div>
    );
}

function Sidebar({ 
    stats, 
    errors = [], 
    writingGoals, 
    onGoalChange, 
    onApplyReplacement,
    textIsFresh = true 
}) {
    const groupedErrors = useMemo(() => groupErrorsByCategory(errors), [errors]);
    
    const categoryStats = useMemo(() => {
        const totalErrors = Object.values(groupedErrors)
            .reduce((sum, errors) => sum + errors.length, 0);
        
        if (totalErrors === 0) return [];
        
        return Object.entries(groupedErrors)
            .map(([category, errors]) => ({
                category,
                count: errors.length,
                percentage: Math.round((errors.length / totalErrors) * 100),
                ...ERROR_CATEGORIES[category]
            }))
            .filter(stat => stat.count > 0)
            .sort((a, b) => b.count - a.count);
    }, [groupedErrors]);

    return (
        <div className="sidebar">
            <h2>Writing Assistant</h2>
            
            {/* Writing Goals */}
            <div className="writing-goals">
                <h3>Writing Goals</h3>
                {Object.entries(WRITING_GOALS).map(([key, config]) => (
                    <div key={key} style={{ marginBottom: '16px' }}>
                        <label 
                            className="text-sm font-medium" 
                            style={{
                                marginBottom: '6px', 
                                display: 'block', 
                                textTransform: 'capitalize'
                            }}
                        >
                            {config.label}:
                        </label>
                        <div className="goal-selector">
                            {config.options.map(option => (
                                <div
                                    key={option}
                                    className={`goal-option ${writingGoals[key] === option ? 'active' : ''}`}
                                    onClick={() => onGoalChange(key, option)}
                                    title={`${config.description} Choose ${option}.`}
                                >
                                    {option}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Statistics */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-number">{stats.totalIssues}</div>
                    <div className="stat-label">Issues</div>
                </div>
                <div className="stat-card">
                    <div className="stat-number">{stats.readabilityScore}</div>
                    <div className="stat-label">Readability</div>
                </div>
            </div>
            
            {/* Error Categories */}
            <div className="error-categories">
                <h3>Issue Categories</h3>
                {categoryStats.length === 0 ? (
                    <p className="muted">No issues found</p>
                ) : (
                    categoryStats.map(stat => (
                        <div key={stat.category} className="category-item">
                            <div className="category-info">
                                <div className={`category-icon ${stat.category}`}></div>
                                <span className="category-name">{stat.name}</span>
                            </div>
                            <div className="category-count">{stat.count}</div>
                        </div>
                    ))
                )}
            </div>
            
            {/* Issues List */}
            <div className="issues-container">
                <h3>Suggestions</h3>
                {stats.totalIssues === 0 ? (
                    <p className="muted">{UI_TEXT.NO_ISSUES}</p>
                ) : (
                    Object.entries(groupedErrors).map(([category, issues]) => {
                        if (issues.length === 0) return null;
                        
                        return issues.map((issue, idx) => {
                            const categoryInfo = ERROR_CATEGORIES[issue.category] || ERROR_CATEGORIES.other;
                            const bestReplacement = issue.replacements?.[0]?.value;
                            
                            return (
                                <div className="issue-card" key={`${category}-${idx}`}>
                                    <div className="issue-header">
                                        <div className={`issue-badge ${issue.category}`}>
                                            {categoryInfo.name}
                                        </div>
                                    </div>
                                    
                                    <div className="issue-message">{issue.message}</div>
                                    
                                    {issue.context?.text && (
                                        <div className="issue-context">
                                            "{issue.context.text}"
                                        </div>
                                    )}
                                    
                                    <div className="issue-actions">
                                        {bestReplacement && issue.category !== 'readability' ? (
                                            <button 
                                                disabled={!textIsFresh} 
                                                onClick={() => onApplyReplacement(issue.index, bestReplacement)}
                                                title={textIsFresh ? `Replace with "${bestReplacement}"` : 'Text has changed, please wait for recheck'}
                                            >
                                                Apply: "{bestReplacement}"
                                            </button>
                                        ) : null}
                                        
                                        {issue.category === 'readability' ? (
                                            <button 
                                                disabled 
                                                title="AI rephrasing feature coming soon"
                                            >
                                                {UI_TEXT.AI_REPHRASE_COMING_SOON}
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        });
                    })
                )}
            </div>
        </div>
    );
}

function App() {
    const [text, setText] = useState(DEFAULT_SAMPLE);
    const [languageToolMatches, setLanguageToolMatches] = useState([]);
    const [readabilityIssues, setReadabilityIssues] = useState([]);
    
    const [status, setStatus] = useState(UI_TEXT.IDLE);
    const [isChecking, setIsChecking] = useState(false);
    const [lastCheckedText, setLastCheckedText] = useState('');
    
    const [writingGoals, setWritingGoals] = useState({
        audience: WRITING_GOALS.audience.default,
        intent: WRITING_GOALS.intent.default,
        tone: WRITING_GOALS.tone.default
    });
    
    const abortControllerRef = useRef(null);
    
    const textStats = useMemo(() => {
        const stats = calculateTextStats(text);
        return {
            ...stats,
            totalIssues: languageToolMatches.length + readabilityIssues.length,
            readabilityScore: Math.round(stats.readabilityScore)
        };
    }, [text, languageToolMatches.length, readabilityIssues.length]);
    
    const enhancedErrors = useMemo(() => {
        return enhanceErrors(languageToolMatches, readabilityIssues);
    }, [languageToolMatches, readabilityIssues]);
    
    const textIsFresh = useMemo(() => {
        return text === lastCheckedText;
    }, [text, lastCheckedText]);
    
    const checkText = useCallback(async (textToCheck) => {
        if (!textToCheck) {
            setLanguageToolMatches([]);
            setStatus(UI_TEXT.IDLE);
            setIsChecking(false);
            setLastCheckedText('');
            return;
        }
        
        setIsChecking(true);
        setStatus(UI_TEXT.CHECKING);
        
        try {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            
            abortControllerRef.current = new AbortController();
            
            const response = await fetch(API_CONFIG.CHECK_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    text: textToCheck,
                    goals: writingGoals 
                }),
                signal: abortControllerRef.current.signal
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Request failed (${response.status})`);
            }
            
            const data = await response.json();
            
            setLastCheckedText(textToCheck);
            setLanguageToolMatches(data.matches || []);
            
            const totalIssues = (data.matches?.length || 0) + readabilityIssues.length;
            if (totalIssues === 0) {
                setStatus(UI_TEXT.GREAT_WRITING);
            } else {
                const suggestionText = totalIssues === 1 ? 
                    UI_TEXT.SUGGESTIONS_SINGLE : 
                    UI_TEXT.SUGGESTIONS_PLURAL;
                setStatus(`${totalIssues} ${suggestionText}`);
            }
            
        } catch (error) {
            if (error.name === 'AbortError') {
                setStatus('Check cancelled');
            } else {
                console.error('Text checking failed:', error);
                setStatus(`${UI_TEXT.ERROR_PREFIX}${error.message}`);
            }
        } finally {
            setIsChecking(false);
        }
    }, [writingGoals, readabilityIssues.length]);
    
    const debouncedCheck = useMemo(() => 
        debounceFn(checkText, API_CONFIG.DEBOUNCE_MS), 
        [checkText]
    );
    
    const handleTextChange = useCallback((newText) => {
        setText(newText);
        
        if (newText.length > API_CONFIG.TEXT_LIMIT) {
            setStatus(`Warning: over ${API_CONFIG.TEXT_LIMIT} character limit`);
        } else if (newText !== lastCheckedText) {
            setStatus('Waiting...');
        }
        
        debouncedCheck(newText);
    }, [debouncedCheck, lastCheckedText]);
    
    const handleGoalChange = useCallback((goalType, value) => {
        setWritingGoals(prev => ({
            ...prev,
            [goalType]: value
        }));
        
        if (text && lastCheckedText === text) {
            checkText(text);
        }
    }, [text, lastCheckedText, checkText]);
    
    const handleApplyReplacement = useCallback((errorIndex, replacement) => {
        if (text !== lastCheckedText) {
            setStatus('Text changed; re-checking...');
            checkText(text);
            return;
        }
        
        const error = languageToolMatches[errorIndex];
        if (!error) return;
        
        const beforeError = text.slice(0, error.offset);
        const afterError = text.slice(error.offset + error.length);
        const newText = beforeError + replacement + afterError;
        
        setText(newText);
        checkText(newText);
    }, [text, lastCheckedText, languageToolMatches, checkText]);
    
    useEffect(() => {
        const hardSentences = findHardSentences(text);
        setReadabilityIssues(hardSentences);
    }, [text]);
    
    useEffect(() => {
        if (text) {
            debouncedCheck(text);
        }
    }, []);
    
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);
    
    return (
        <div className="container">
            <h1>MyGrammarly</h1>
            <p className="subtitle">
                AI-powered writing assistant with real-time suggestions
            </p>
            
            <div className="main-layout">
                <div className="editor-section">
                    <Editor
                        text={text}
                        onTextChange={handleTextChange}
                        errors={enhancedErrors}
                        onApplyReplacement={handleApplyReplacement}
                    />
                    
                    <StatusBar
                        charCount={textStats.characters}
                        wordCount={textStats.words}
                        sentenceCount={textStats.sentences}
                        status={status}
                        isChecking={isChecking}
                        hasErrors={textStats.totalIssues > 0}
                    />
                </div>
                
                <Sidebar
                    stats={textStats}
                    errors={enhancedErrors}
                    writingGoals={writingGoals}
                    onGoalChange={handleGoalChange}
                    onApplyReplacement={handleApplyReplacement}
                    textIsFresh={textIsFresh}
                />
            </div>
        </div>
    );
}

// =============================================================================
// APPLICATION INITIALIZATION
// =============================================================================

function initializeApp() {
    const rootElement = document.getElementById('root');
    
    if (!rootElement) {
        console.error('Root element not found. Make sure there is a div with id="root" in your HTML.');
        return;
    }
    
    try {
        const root = ReactDOM.createRoot(rootElement);
        root.render(React.createElement(App));
        
        console.log('MyGrammarly application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize MyGrammarly application:', error);
        
        rootElement.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #dc2626;">
                <h1>Application Error</h1>
                <p>Failed to load MyGrammarly. Please refresh the page and try again.</p>
                <p style="font-size: 14px; color: #6b7280;">Error: ${error.message}</p>
            </div>
        `;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
