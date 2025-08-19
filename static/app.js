const DEBOUNCE_MS = 500;
const TEXT_LIMIT = 10000;

const editor = document.getElementById('editor');
const overlay = document.getElementById('editorOverlay');
const popover = document.getElementById('popover');
const editorWrapper = document.querySelector('.editor-wrapper');
const issuesEl = document.getElementById('issues');
const statusEl = document.getElementById('status');
const charCountEl = document.getElementById('charCount');

let lastCheckedText = '';
let currentMatches = [];
let abortController = null;
let lastClickMatchIndex = null;
let hoverTimer = null;
let hoverActiveIndex = null;
let isPopoverPinned = false;

// debounce(fn, delay): return a function that runs after no calls have occurred for `delay` ms
function debounce(fn, delay) {
	let t = null;
	return (...args) => {
		clearTimeout(t);
		t = setTimeout(() => fn(...args), delay);
	};
}

// checkText(text): calls backend to get grammar matches. Cancels the previous request if still running.
async function checkText(text) {
	if (!text) {
		currentMatches = [];
		render();
		statusEl.textContent = 'Idle';
		return;
	}
	statusEl.textContent = 'Checking...';
	try {
		if (abortController) abortController.abort();
		abortController = new AbortController();
		const resp = await fetch('/api/check', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ text }),
			signal: abortController.signal
		});
		if (!resp.ok) {
			const err = await resp.json().catch(() => ({}));
			throw new Error(err.error || `Request failed (${resp.status})`);
		}
		const data = await resp.json();
		lastCheckedText = text;
		currentMatches = data.matches || [];
		render();
		statusEl.textContent = `Found ${currentMatches.length} issue${currentMatches.length === 1 ? '' : 's'}`;
	} catch (e) {
		if (e.name === 'AbortError') {
			statusEl.textContent = 'Canceled';
		} else {
			statusEl.textContent = `Error: ${e.message}`;
		}
	}
}

const debouncedCheck = debounce(() => checkText(editor.value), DEBOUNCE_MS);

// On input, update counts, schedule check, and re-render overlay underlines optimistically
editor.addEventListener('input', () => {
	charCountEl.textContent = `${editor.value.length} chars`;
	if (editor.value.length > TEXT_LIMIT) {
		statusEl.textContent = `Warning: over ${TEXT_LIMIT} char limit`;
	}
	statusEl.textContent = 'Waiting...';
	debouncedCheck();
	renderOverlay();
});

// Trigger immediate check when user leaves the field or pastes
editor.addEventListener('blur', () => checkText(editor.value));
editor.addEventListener('paste', () => setTimeout(() => checkText(editor.value), 0));

// Keep overlay scrolled in sync with textarea
editor.addEventListener('scroll', () => {
	overlay.scrollTop = editor.scrollTop;
	overlay.scrollLeft = editor.scrollLeft;
});

// render(): rebuilds the suggestions list and updates the overlay underlines
function render() {
	issuesEl.innerHTML = '';
	if (!currentMatches.length) {
		issuesEl.innerHTML = '<p class="muted">No issues found.</p>';
		renderOverlay();
		return;
	}
	const textIsFresh = editor.value === lastCheckedText;
	currentMatches.forEach((m, idx) => {
		const div = document.createElement('div');
		div.className = 'issue-card';

		const msg = document.createElement('div');
		msg.className = 'issue-message';
		msg.textContent = m.message;

		const meta = document.createElement('div');
		meta.className = 'issue-meta';
		const ruleId = (m.rule && m.rule.id) ? m.rule.id : 'Rule';
		const location = `at ${m.offset}-${m.offset + m.length}`;
		meta.textContent = `${ruleId} (${location})`;

		const actions = document.createElement('div');
		actions.className = 'issue-actions';

		if (m.replacements && m.replacements.length) {
			const best = m.replacements[0].value;
			const btn = document.createElement('button');
			btn.textContent = `Apply: "${best}"`;
			btn.disabled = !textIsFresh;
			btn.addEventListener('click', () => applyReplacement(idx, best));
			actions.appendChild(btn);
		}

		div.appendChild(msg);
		div.appendChild(meta);
		div.appendChild(actions);
		issuesEl.appendChild(div);
	});
	renderOverlay();
}

// applyReplacement(index, replacement): replaces the error span with suggestion and re-checks
function applyReplacement(index, replacement) {
	if (editor.value !== lastCheckedText) {
		statusEl.textContent = 'Text changed; re-checking...';
		checkText(editor.value);
		return;
	}
	const m = currentMatches[index];
	const before = editor.value.slice(0, m.offset);
	const after = editor.value.slice(m.offset + m.length);
	editor.value = before + replacement + after;
	editor.dispatchEvent(new Event('input'));
	checkText(editor.value);
}

// escapeHTML(str): prevent HTML from being interpreted in overlay
function escapeHTML(str) {
	return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

// renderOverlay(): mirror editor text into overlay and wrap matches with underline spans
function renderOverlay() {
	const text = editor.value || '';
	if (!text) {
		overlay.innerHTML = '';
		return;
	}
	const pieces = [];
	let cursor = 0;
	const sorted = [...currentMatches].sort((a,b) => a.offset - b.offset);
	for (let i = 0; i < sorted.length; i++) {
		const m = sorted[i];
		const start = m.offset;
		const end = m.offset + m.length;
		if (start > cursor) {
			pieces.push(escapeHTML(text.slice(cursor, start)));
		}
		const cls = 'hl' + (m.rule?.issueType === 'style' ? ' style' : (m.rule?.issueType === 'typographical' ? ' typo' : ''));
		pieces.push(`<span class="${cls}" data-index="${i}">${escapeHTML(text.slice(start, end))}</span>`);
		cursor = end;
	}
	if (cursor < text.length) {
		pieces.push(escapeHTML(text.slice(cursor)));
	}
	overlay.innerHTML = pieces.join('');
	// Sync dimensions (important if fonts/styles changed)
	syncOverlayMetrics();
}

// syncOverlayMetrics(): copy typography and padding from editor to overlay and align scroll
function syncOverlayMetrics() {
	const style = getComputedStyle(editor);
	overlay.style.fontSize = style.fontSize;
	overlay.style.lineHeight = style.lineHeight;
	overlay.style.fontFamily = style.fontFamily;
	overlay.style.padding = style.padding;
	overlay.style.borderRadius = style.borderRadius;
	overlay.style.width = editor.clientWidth + 'px';
	overlay.style.height = editor.clientHeight + 'px';
	overlay.scrollTop = editor.scrollTop;
	overlay.scrollLeft = editor.scrollLeft;
}

// showPopover(idx, x, y): show suggestion popover near a clicked underline
function showPopover(idx, x, y, width = 0) {
	const m = currentMatches[idx];
	if (!m) return;
	// Position relative to the wrapper (popover is absolutely positioned inside it)
	const wrapperRect = editorWrapper.getBoundingClientRect();
	const top = (y - wrapperRect.top) + 6;
	const left = (x - wrapperRect.left) + (width / 2);
	popover.style.top = `${top}px`;
	popover.style.left = `${left}px`;
	popover.style.transform = 'translateX(-50%)';
	const best = (m.replacements && m.replacements[0]) ? m.replacements[0].value : null;
	popover.innerHTML = `
		<div class="pop-message">${escapeHTML(m.message || '')}</div>
		<div class="pop-actions">
			${best ? `<button data-apply="1">Apply: ${escapeHTML(best)}</button>` : ''}
			<button class="secondary" data-close="1">Close</button>
		</div>
	`;
	popover.style.display = 'block';
	popover.hidden = false;
	lastClickMatchIndex = idx;
}

// hidePopover(): hide suggestion popover
function hidePopover() {
	popover.style.display = 'none';
	popover.hidden = true;
	lastClickMatchIndex = null;
}

// Handle clicks on the overlay to trigger popover
overlay.addEventListener('click', (e) => {
	const span = e.target.closest('span.hl');
	if (!span) return hidePopover();
	const idx = Number(span.getAttribute('data-index'));
	const rect = span.getBoundingClientRect();
	showPopover(idx, rect.left + window.scrollX, rect.bottom + window.scrollY, rect.width);
});

// Handle clicks inside the popover (apply/close)
popover.addEventListener('click', (e) => {
	const apply = e.target.getAttribute('data-apply');
	const close = e.target.getAttribute('data-close');
	if (apply && lastClickMatchIndex != null) {
		const m = currentMatches[lastClickMatchIndex];
		const best = (m.replacements && m.replacements[0]) ? m.replacements[0].value : null;
		if (best) applyReplacement(lastClickMatchIndex, best);
		hidePopover();
	} else if (close) {
		hidePopover();
	}
});

// Hide popover when clicking outside
document.addEventListener('click', (e) => {
	if (!popover.contains(e.target) && e.target !== overlay && !isPopoverPinned) hidePopover();
});

// findMatchAtPoint(x, y): returns match index under the mouse, or null
function findMatchAtPoint(x, y) {
	const spans = overlay.querySelectorAll('span.hl');
	for (const span of spans) {
		const rect = span.getBoundingClientRect();
		if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
			return Number(span.getAttribute('data-index'));
		}
	}
	return null;
}

// On mouse move over the editor area, show a Grammarly-like hover card after a short delay
function handleHover(e) {
	clearTimeout(hoverTimer);
	hoverTimer = setTimeout(() => {
		if (isPopoverPinned) return; // keep visible while pinned
		const idx = findMatchAtPoint(e.clientX, e.clientY);
		if (idx == null) {
			if (hoverActiveIndex != null && !isPopoverPinned) hidePopover();
			hoverActiveIndex = null;
			return;
		}
		if (idx !== hoverActiveIndex) {
			const spans = overlay.querySelectorAll('span.hl');
			const span = spans[idx];
			if (!span) return;
			const rect = span.getBoundingClientRect();
			showPopover(idx, rect.left + window.scrollX, rect.bottom + window.scrollY, rect.width);
			hoverActiveIndex = idx;
		}
	}, 160); // small delay to avoid flicker
}

// Attach hover listeners on wrapper (works even with overlay pointer-events: none)
if (editorWrapper) {
	editorWrapper.addEventListener('mousemove', handleHover);
	editorWrapper.addEventListener('mouseleave', () => { hoverActiveIndex = null; if (!isPopoverPinned) hidePopover(); });
}

// Keep the card pinned when mouse is inside it
popover.addEventListener('mouseenter', () => { isPopoverPinned = true; });
popover.addEventListener('mouseleave', (e) => {
	isPopoverPinned = false;
	// if not hovering an underline anymore, hide
	const idx = findMatchAtPoint(e.clientX, e.clientY);
	if (idx == null) hidePopover();
});

// Initialize
charCountEl.textContent = '0 chars';
statusEl.textContent = 'Idle';
renderOverlay();
syncOverlayMetrics();
window.addEventListener('resize', syncOverlayMetrics);
