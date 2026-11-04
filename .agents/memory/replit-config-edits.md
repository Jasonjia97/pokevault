---
name: Validated Replit config edits
description: The safe replacement path for `.replit` in this environment.
---

Do not edit `.replit` directly. Write the complete intended TOML to a temporary
workspace file and call `verifyAndReplaceDotReplit` with that file's absolute
path.

**Why:** Direct edits are rejected, and conflict markers make `.replit` invalid
TOML, which can trigger Replit recovery behavior.

**How to apply:** Use the validated replacement path for configuration changes
and resolve any `.replit` merge conflict before doing other work that depends on
the Replit environment.
