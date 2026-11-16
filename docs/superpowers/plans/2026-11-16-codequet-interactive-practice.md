# Prácticas interactivas de CodeQuet Implementation Plan

> **For agentic workers:** Native implementation in this session. The recorded references and the user request are approval of this design. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert lesson questions and non-SQL challenges into touch-friendly, stepwise code-building practice across CodeQuet.

**Architecture:** Keep the existing lesson data model and three-part sequence. Add a reusable token-tile composer for non-SQL practice and show each quiz's code example; preserve the executable SQL editor and the portfolio project route.

**Tech Stack:** Vanilla JavaScript ES modules, HTML templates, CSS, localStorage, SQL.js already in the project.

**Spec:** `docs/superpowers/specs/codequet-interactive-practice.md`

## Global Constraints

- Keep Inicio → Practicar and the existing circular lesson path.
- Do not preload the expected solution in an editor or show it before completion.
- Keep SQL query execution local and preserve saved course progress.
- Do not execute infrastructure commands or add paid features.
- Keep all challenge controls usable on mobile and accessible by keyboard.

## Review Focus

- Repeated code tokens remain individually selectable and removable.
- Newline and indentation spacing survive piece assembly.
- Long Compose, Java, HTML, and Bash answers fit on small screens.
- Incorrect ordering gives actionable feedback without charging hearts or XP.
- Completing a lesson awards XP only once and displays the worked solution afterward.

### Task 1: Add the reusable code-piece composer

**Files:** Modify `app.js`, `styles.css`.

- [x] Tokenize the expected snippet while preserving the whitespace needed to rebuild it.
- [x] Shuffle token IDs without collapsing duplicate tokens into one chip.
- [x] Render an empty answer tray, selectable pieces, remove-last, remove-piece, reset, and progress state.
- [x] Add a validator that reports incomplete work, identifies a misplaced position, and accepts only the assembled sequence in order.
- [x] Keep first- and second-level hints separate from the final explanation.

### Task 2: Apply the pattern to lessons and projects

**Files:** Modify `app.js`, `lessons.js`.

- [x] Render the lesson's example code above quick-choice questions.
- [x] Use the composer for non-SQL programming and guided infrastructure/portfolio challenges.
- [x] Keep SQL challenges in the blank SQL editor and validate by actual result equivalence.
- [x] Give retry feedback without losing hearts; award XP only on success.
- [x] Reveal the existing line-by-line explanation after success, then allow continuing.

### Task 3: Refresh the PWA cache and publish

**Files:** Modify `index.html`, `sw.js`.

- [x] Increment the app asset version and service-worker cache so mobile devices fetch the new interaction.
- [x] Run JavaScript syntax and whitespace checks.
- [ ] Commit and push the completed update to the existing Pages branch.
