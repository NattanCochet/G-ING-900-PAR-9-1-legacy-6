## Colors

### 3.2 — Sufficient contrast for interactive and error text

**File(s):** `src/front/static/css/theme.css`, `src/front/static/css/auth.css`, `src/front/views/login.ejs`, `src/front/views/register.ejs`

**RGAA criterion:** 3.2 – On each web page, is the contrast between text color and background color sufficiently high?

**Why this matters:** The interactive blue and error red did not consistently meet the minimum contrast ratio on light backgrounds. People with low vision may be unable to read controls and validation errors.

**Before:**
```css
--blue: #0071e3;
--blue-hover: #0077ed;
--blue-active: #006edb;
--red: #ff3b30;

<p id="errorMsg" style="color:red; display:none;"></p>
```

**After:**
```css
--blue: #0066cc;
--blue-hover: #005bb5;
--blue-active: #004a99;
--red: #d92d20;

.auth-error {
  color: var(--red);
}

<p id="errorMsg" class="auth-error" role="alert" style="display:none;"></p>
```

**What changed:** Replaced insufficient blue and red tokens with darker equivalents, and applied the accessible red token to authentication errors.

### 3.2 — Sufficient contrast for header and priority labels

**File(s):** `src/front/static/css/home.css`

**RGAA criterion:** 3.2 – On each web page, is the contrast between text color and background color sufficiently high?

**Why this matters:** The greeting was white on a light header, and the medium and low priority labels were too light against their pale backgrounds. People with low vision may be unable to read this information.

**Before:**
```css
:root:not(.dark-theme) .greeting,
:root.light-theme .greeting {
  color: #ffffff;
}

.task-badge.priority-medium { background: rgba(255, 204, 0, 0.1); color: #d4a000; }
.task-badge.priority-low { background: rgba(52, 199, 89, 0.1); color: #28a745; }
```

**After:**
```css
.task-badge.priority-medium { background: rgba(255, 204, 0, 0.1); color: #805300; }
.task-badge.priority-low { background: rgba(52, 199, 89, 0.1); color: #176b3a; }
```

**What changed:** Removed the light-theme greeting override so it inherits the high-contrast text color, and darkened priority label text.

## Structure & forms

### 7.1 — Expose form errors to assistive technology

**File(s):** `src/front/views/login.ejs`, `src/front/views/register.ejs`

**RGAA criterion:** 7.1 – If a script generates a status message, is the status message correctly rendered by assistive technologies?

**Why this matters:** Authentication errors were only shown visually. Screen-reader users would not be informed when sign-in or registration fails.

**Before:**
```html
<p id="errorMsg" style="color:red; display:none;"></p>
```

**After:**
```html
<p id="errorMsg" role="alert" style="color:red; display:none;"></p>
```

**What changed:** Authentication errors now use an assertive live region.

### 7.1 — Expose dashboard notifications to assistive technology

**File(s):** `src/front/static/js/dashboard.js`

**RGAA criterion:** 7.1 – If a script generates a status message, is the status message correctly rendered by assistive technologies?

**Why this matters:** Dashboard notifications were only shown visually. Screen-reader users would not be informed when an action fails or succeeds.

**Before:**
```js
const toast = document.createElement('div');
toast.className = `toast ${type}`;
toast.textContent = message;
```

**After:**
```js
const toast = document.createElement('div');
toast.className = `toast ${type}`;
toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
toast.textContent = message;
```

**What changed:** Toast messages now expose an appropriate status or alert role.

### 11.1 — Provide labels for dynamically created column fields

**File(s):** `src/front/static/js/dashboard.js`, `src/front/static/css/home.css`

**RGAA criterion:** 11.1 – Does each form field have a label?

**Why this matters:** The dynamically created rename and add-column fields had no programmatic label. Their placeholder or surrounding interface may not be announced reliably to screen-reader users.

**Before:**
```html
<input type="text" class="inline-edit-input" value="${escapeHtml(column.name)}" autocomplete="off" />
```

```html
<input type="text" placeholder="Column name" autocomplete="off" />
```

**After:**
```html
<label class="visually-hidden" for="${inputId}">Column name</label>
<input type="text" id="${inputId}" class="inline-edit-input" value="${escapeHtml(column.name)}" autocomplete="off" />
```

```html
<label class="visually-hidden" for="${inputId}">Column name</label>
<input type="text" id="${inputId}" placeholder="Column name" autocomplete="off" />
```

**What changed:** Added explicit, visually hidden labels linked to each dynamically generated text field.

### 8.8 — Identify modal dialogs and support keyboard dismissal

**File(s):** `src/front/views/home.ejs`, `src/front/static/js/dashboard.js`

**RGAA criterion:** 7.3 – Can each scripted component be controlled using a keyboard and a pointing device?

**Why this matters:** Modal dialogs were not announced as dialogs, could not be dismissed with Escape, and allowed keyboard focus to move behind the dialog. This obscures the active context and makes recovery harder for keyboard and screen-reader users.

**Before:**
```html
<div class="modal-overlay" id="projectModalOverlay" hidden>
    <div class="modal">
```

```js
const closeProjectModal = () => {
    projectModalOverlay.hidden = true;
    editingProject = null;
};
```

**After:**
```html
<div class="modal-overlay" id="projectModalOverlay" hidden>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="projectModalTitle">
```

```js
const closeProjectModal = () => {
    projectModalOverlay.hidden = true;
    editingProject = null;
    projectModalOpener?.focus();
    projectModalOpener = null;
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!projectModalOverlay.hidden) closeProjectModal();
        if (!taskModalOverlay.hidden) closeTaskModal();
        return;
    }

    trapModalFocus(projectModalOverlay, e);
    trapModalFocus(taskModalOverlay, e);
});
```

**What changed:** Both modals now expose their name and modality, keep keyboard focus within the active dialog, restore focus to their trigger, and close on Escape.

## Summary

- Total issues fixed: 6
- Issues flagged for human review: 1 — `RGAA-Accessibilite-Pourquoi-Comment.md` is absent, so the requested project-specific accessibility context could not be reviewed.
- Themes not yet addressed: None; no images, frames, or multimedia were found, and the scanned links already have descriptive text.
- Estimated RGAA conformity level after these changes: partiellement conforme — the confirmed issues are addressed, but RGAA conformity requires a complete manual audit (including rendered-state tests) and review of the missing project context.
