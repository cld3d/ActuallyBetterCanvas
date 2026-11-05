# Canvas Local: agent instructions

## Architecture and scope

This is a Chromium Manifest V3 extension, a Python-standard-library native messaging host, and adapters for one user's customized Omarchy desktop. It is not a hosted web app. No build step is needed for the extension.

- `extension/`: Canvas API sync and reads, background alarms, settings, and an isolated Shadow DOM workspace. Writes happen only through explicit student-initiated actions (assignment submissions, quiz attempts, external tool launches), validated to fixed endpoints and shapes.
- `native/canvas_feed.py`: native-message protocol, SQLite persistence, personal overrides, atomic shared feed publication.
- `integrations/canvas_local.py`: Datebook's adapter for reading and updating the local feed.
- `integrations/desktop/`: maintained desktop JavaScript sources.
- `scripts/integrate_desktop.py`, `deadline_support.py`, `twelve_hour_support.py`: version-sensitive, backed-up patches to installed Datebook/lock components. Full upstream plugin sources are **not** in this repo.

Read `README.md` and relevant tests before changing behavior. Keep production dependency-free unless there is a concrete reason otherwise; Playwright is a dev-only test dependency.

## Product rules: preserve these

- Canvas submission evidence can complete work. Grades, scores (even zero), attempts, and excused status must **never** complete it by themselves.
- Manual complete/reopen choices persist across syncs until the user clears the override.
- Personal deadlines survive Canvas changes. An explicitly empty override means no personal deadline; clearing the override means follow Canvas again.
- Only submit through the explicit in-workspace Submit work flow, which always requires a confirm click; never auto-submit, un-submit, change grades, or change Canvas deadlines from local actions.
- Store exact timezone-aware instants, display local times, and keep date-only Google tasks date-only.
- Datebook uses 12-hour AM/PM display and editing. Internal write formats remain canonical.
- Local 11:59 PM tasks belong in Datebook's top/all-day strip **for display only**. Preserve their true timestamps and overdue behavior.
- A failed/partial Canvas fetch must not replace the last good snapshot. Keep identity isolation and archived assignment overrides.
- Preserve existing calendars, Google tasks, and authenticated lock-screen edit gates.
- Datebook's sidebar hides undated tasks without deleting them from the shared feed. Task-color presets use class names, with Other for gray.
- Both editors must preselect current colors even after previous dropdown interactions; opening an editor must not silently rewrite provider colors.

## Data and security boundaries

Real user data lives outside Git:

```
~/.local/share/canvas-local/assignments.sqlite3
~/.cache/canvas-local/feed.json
~/.config/canvas-local/integration.json
~/.cache/blacksheep.calendar/
```

Respect each component's existing XDG support; the desktop integration still targets the laptop's `~/.config/omarchy/plugins`. Do not delete/reset the database or feed to fix code. Never commit real assignment/calendar data, cookies, browser profiles, credentials, local config, or backups. Test with temporary directories and synthetic assignments. Storage changes need additive, transactional migrations and tests proving personal deadlines and completion overrides survive.

Keep the public `key` in `extension/manifest.json` unchanged: it determines the installed extension ID and native-host allowlist. It is not a secret. Preserve native-message framing, private file permissions, atomic publication, and desktop/database locking order. Do not add a network listener or upload data without the user's request.

## Remote development and tests

On a dev server, edit repo files only. Do not run installation scripts, restart shells, or attempt to connect to the user's live Canvas account. Missing desktop components are expected, not a reason to create fake plugins or weaken safety checks.

```
npm ci
npm test
python3 -B -m unittest discover -s tests -v
python3 -B scripts/test_desktop.py
```

Core API, deadline, clock, adapter, and storage tests run without Omarchy or a browser. Browser and installed-plugin integration tests explicitly skip when dependencies are absent. Report skipped coverage separately from passing coverage; never claim live Canvas or laptop integration is verified from server-only tests.

Test overrides: `CANVAS_BROWSER_PATH` selects a Chromium executable; `CANVAS_DESKTOP_PLUGIN_DIR` selects a plugin tree; `CANVAS_OMARCHY_SHELL_DIR` selects Omarchy's shell directory. `CANVAS_SKIP_BROWSER_TESTS=1` and `CANVAS_SKIP_DESKTOP_TESTS=1` explicitly disable those integration checks. Explicit invalid paths should fail rather than silently skip. QML test files are templates rendered by `scripts/test_desktop.py`, not directly runnable configs.

## Implementation delivery and versioning

- The user's standing request is to commit and push after each completed implementation. Other agents may be working concurrently: stage and commit only your own changes, never unrelated work.
- Every implementation push must include a higher `version` in `extension/manifest.json` (increment the patch component by default). Make the bump before committing and pushing, in the same delivery as the implementation, so the pushed code and displayed extension version match. Check the latest version before bumping to avoid reusing another agent's version. Keep the manifest's public `key` unchanged.
- Report the pushed commit and new extension version. The laptop still needs to pull, reload the extension in `brave://extensions`, and reload Canvas pages; a push alone does not update the installed extension.

## Laptop deployment after pulling

Only on the actual desktop, with user authorization:

1. Pull changes using this repo's configured HTTPS `origin`. Do not switch it to SSH or change global Git settings.
2. Run `python3 scripts/install.py` if native registration needs updating (especially after moving the checkout).
3. Run `python3 -B scripts/integrate_desktop.py` for desktop changes. It backs up files outside watched plugin directories and refuses unfamiliar source. Never bypass its checks to force an overwrite; inspect any drift first. Update repo-maintained sources/installer logic, not only out-of-repo plugin files.
4. Reload the extension in `brave://extensions` for extension changes, then reload Canvas pages. A pull alone does not refresh loaded extension code.
5. For desktop code, explicitly reload/restart and verify the running shell rather than assuming hot reload. Use `omarchy restart shell` when unlocked; never reset config with `omarchy refresh shell`. Never restart a secure live lock screen.
6. Run `python3 -B scripts/test_desktop.py --strict` and, if present, Datebook's own regression suite. Check shell logs for errors. Keep saved assignment data unchanged.

Do not edit `/usr/share/omarchy/`; it is packaged, read-only for this workflow. Load the Omarchy skill if available before installed desktop customization. A dev-server push does not deploy or restart anything on the laptop. Do not commit or push unless requested.
