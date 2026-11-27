# Coding Agent Guidelines — Graduation Flower Card Template

## Stack
- Vanilla HTML5, CSS3, and browser JavaScript (ES modules).
- Zero frameworks, zero bundlers, zero backend or database.

## Standards
- Keep code modular, readable, and easy for anyone who downloads the repo to customize in `js/config.js`.
- Always use `textContent` for user-supplied config text (never `innerHTML`).
- Keep layouts responsive across 320px portrait phones, short landscape phones, and large desktops without unintended scrolling.
- Preserve keyboard navigation, visible focus rings, and touch usability for all controls (quiz, runaway buttons, page nav, 3D bouquet drag/arrow keys, bouquet picker).
- Never bundle copyrighted audio, private personal messages, or client-specific details into this public repository.
- Run `python tools/verify_project.py` before committing changes.
