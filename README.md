# Canvas Local

A Chromium extension that adds a focused workspace **inside Canvas**, backed by a private local SQLite assignment store. Datebook and the authenticated lock-screen task controls share the same published feed. No hosted backend, task-platform account, Canvas API token, or always-open tab.

## Connect on this laptop

1. Run `python3 scripts/install.py` (already run during initial setup).
2. Open **`brave://extensions`**, enable **Developer mode**, choose **Load unpacked**, and select the `extension` directory inside your checkout.
3. Open the extension's toolbar icon, enter your Canvas website (for example `https://school.instructure.com`), and choose **Connect Canvas**. Grant access to that site only. Be signed into Canvas in the same Brave profile.
4. Reload an open Canvas page. The dashboard, courses index, calendar, and inbox open the custom workspace automatically; **Actually Better Canvas** opens it elsewhere. **Original Canvas** in the top bar returns to the untouched page and keeps that tab in Original Canvas through navigation and reloads. The launcher reopens the matching custom page and restores automatic workspace opening. Assignment links open the original assignment/submission page.

The browser must be running for new Canvas data to arrive. Polling is approximately every two minutes, with **Sync now** available. Browser suspension, school authentication policies, or third-party cookie restrictions can delay or block session-based fetching; the first real sign-in must be verified. An authentication failure preserves the last good snapshot and exposes an error. No browser preferences or background-mode setting are changed.

## Behavior

- Workspace navigation includes tasks, course announcements, active courses (including classes without assignments), a task-based month calendar with a day agenda, and a read-only Canvas inbox. Course, announcement, and inbox data load on demand with the same Canvas identity checks; they never replace the assignment snapshot. Expanding an announcement marks it read on this browser, with the remaining unread count badged on the sidebar tab. Opening a course stays in the workspace with that class's enabled tabs: home, modules, assignments, quizzes, pages, announcements, discussions, files, syllabus, grades, and people load read-only on demand. Assignment and grade rows show score fractions; quiz details list your own attempts as grade fractions and prior answers without revealing correct answers or unselected options; in-progress attempts, including ones started in Original Canvas, resume in the workspace; quiz-linked assignment pages resolve straight to the quiz, New Quizzes show their instructions with the player embedded and a new-window fallback, other tool-backed work launches in a new window; images and small text files preview inline. Reading conversations or discussions does not mark them read. Text, file, and URL assignments can be submitted from the workspace with a two-step confirm, and external tools launch in a new tab. Classic quizzes can be taken in the workspace with a visible timer, per-question inputs, answer saving, and a confirmed submit; access-code quizzes prompt for the code and attempts refresh automatically. Discussion replies, media recordings, and file-upload quiz questions still use Original Canvas.
- Sidebar navigation updates the browser URL without reloading the workspace. Refresh restores the current page, and browser Back/Forward switches between workspace pages, including course pages and course detail views. Returning to Original Canvas loads the matching route if the underlying Canvas document is still on an earlier page. Only the Original Canvas button remembers that choice across reloads; closing with Escape leaves the workspace one click away.
- A document-start guard masks the original page until the custom workspace is mounted, preventing an Original Canvas flash on supported routes, including course list and detail pages. Original Canvas mode and unsupported course routes (submissions, quiz attempts, editing, downloads, LTI launches) are unaffected; a ten-second failsafe restores Canvas if workspace startup fails.
- Tasks have **To do** and **Completed** tabs with a sliding selection underline and a custom keyboard-accessible course filter. Open tasks sort earliest deadline first; completed tasks sort latest deadline first, with undated work last. The calendar uses the same tasks, completion controls, and effective personal deadlines; undated work appears only in Tasks. Navigation works on narrow screens; animations honor reduced-motion preferences. Keyboard focus uses subtle color/underline cues instead of rectangular outlines. A theme picker at the bottom of the sidebar offers System (follows the OS color scheme) plus fixed light and dark palettes; the choice persists on this browser.
- Exact UTC deadline instants are stored and displayed in the laptop's local time zone.
- Open workspace tasks group into Overdue, Today, Tomorrow, This week (remaining days through Sunday), Coming up, and No deadline. Tomorrow takes precedence even on Sunday; all grouping uses local calendar dates and preserves exact overdue instants.
- Personal deadlines override Canvas deadlines without editing Canvas. An explicitly empty personal deadline means **no personal deadline**. **Follow Canvas deadline** removes that override.
- Only explicit submission evidence (`submitted_at`, `submitted`, or `pending_review`) completes an assignment automatically. A grade, score (including zero), attempt count, or excused flag does **not**.
- Manual completion/reopening persists across every sync. **Follow Canvas submission status** clears the manual override. The local task checkbox only tracks your own list; it never submits, un-submits, or changes grades. Real submissions happen only through the explicit Submit work section on assignment pages, which always requires a confirm click.
- Sync fetches all pages for active student courses and their assignments. A failed course/page aborts the snapshot, preserving the prior feed. Disappeared assignments are archived rather than deleted, so overrides survive if they return.
- One Canvas identity per installation. Unexpected account/site changes are rejected rather than mixing accounts. There is intentionally no destructive reset UI yet.
- Existing Google calendars/tasks stay intact; Canvas tasks are added alongside them. Canvas assignments cannot be renamed or deleted from Datebook. Datebook has separate personal date (`YYYY-MM-DD`) and time (`h:mm AM/PM`, local time) fields, plus notes; clearing overrides and reopening completed work are available inside Canvas.
- Timed deadlines appear at their due time in Datebook's day/week grids, with date-only tasks remaining in the all-day strip. Markers represent deadline points, not fabricated work sessions. Month chips, task lists, and the lock screen show exact times. Datebook displays and edits times in 12-hour AM/PM format, including calendar event editors; internal timestamp formats stay unchanged.
- Timed tasks become overdue when their deadline passes, not at midnight. Date-only Google tasks remain date-only and become overdue the next day. Sorting uses exact instants rather than course/provider order; overdue tasks remain visible until completed. Displayed task dates are derived from the current local time zone rather than trusting a previously cached date.
- Tasks due at local **11:59 PM** appear in Datebook's top/all-day strip as end-of-day work, without a time next to them. This is display-only: their true deadline, editor value, sync data, and overdue behavior remain unchanged. Other timed tasks retain their hour-grid position and time labels.
- The lock screen interleaves events and tasks chronologically by event start / task deadline, rather than putting all events first. Date-only entries sort at the beginning of their local day; undated tasks sort last. Task due labels read Today, Tomorrow, or the month and day. Overdue unfinished tasks stay visible, and 11:59 PM tasks retain their actual time in this lock-screen ordering.
- Datebook assignment colors: each Canvas class maps to a color (Philosophy = Pistachio; Chemistry and Chem Lab = Basil; Calculus and Calc Lab = Peacock; Engineering and Spatial Visualization = Blueberry; Physics = Avocado; Honors = Lavender; everything else defaults to Graphite gray). Matching recognizes class names and this laptop's course codes; anything unmatched groups by course ID.
- Run `python3 scripts/configure_class_colors.py` (or `scripts/integrate_desktop.py --configure-colors`) to pick a color per class after syncing: any Google Calendar event color name or 1-11 id, or any `#RRGGBB` hex. Blank keeps the current color; `default` clears back to the class default. `--list` shows the current mapping; `--set 'Class=#rrggbb'` scripts it.
- To change a class color, open any of its assignments in Datebook and use **Class color**, then **Save**. Choose a Google palette preset or enter a custom `#RRGGBB`; clear the field to restore the class default. This updates all assignments in the class and linked labs, persists through syncs, and never changes Canvas or Google Calendar colors. Colors are stored in an additive local SQLite table; existing deadlines and completion overrides are unchanged.
- Both task and event editors preselect the current saved color, including custom colors and Google labels, each time they open. Opening an editor alone does not change any saved/provider color.
- Datebook's sidebar excludes undated tasks in both Day and All modes. This is a display filter only: undated assignments remain in the shared feed and Canvas workspace, and lock-screen behavior is unchanged.
- Google Calendar events have a separate **Event color** picker in Datebook: a swatch grid using Google's 24 color names in Google's picker order, with a checkmark on the current color and each color's name shown on hover. Saving writes to Google Calendar (with version/permission checks), not a local-only override. Both standard Google event colors and calendar-specific labels are supported; use **Sync now** to refresh available labels. **Calendar default** removes the event's explicit color. **Every occurrence** applies a color to the series, while times remain untouched. Non-Google/read-only events do not expose this control. These writes never create/delete labels or recolor the entire calendar.
- Event-color choices use Google's 24 color names rather than raw hex codes, including cached labels that Google leaves unnamed. Duplicate standard/label colors appear once, preserving the current event's actual provider ID and preselection.
- The sidebar **canvas** wordmark links to Tasks, using in-workspace navigation for ordinary clicks and normal link behavior for opening a new tab.

## Local architecture

`Canvas session → extension worker → native-messaging host → SQLite → feed.json → Datebook events.json → Datebook + lock screen`

- `extension/`: Manifest V3, site-scoped optional permission, dynamically registered content script, isolated Shadow DOM workspace, background polling.
- `native/canvas_feed.py`: Python standard library only. Native-message framing and CLI, transactional SQLite writes, persistent overrides, atomic feed publication, and Datebook republishing.
- `integrations/canvas_local.py`: Datebook adapter; routes Canvas task edits to the local store and preserves Google's existing behavior.
- `integrations/event_colors.py`, `integrations/desktop/EventColors.js`, and `scripts/event_color_support.py`: Google event-color palette, provider writes, and backed-up editor/sync integration. Event-color writes are separate from Canvas assignment class colors.
- `scripts/integrate_desktop.py`: narrowly matched, idempotent edits to this machine's user-owned Datebook and lock plugins, with backups outside watched plugin folders. Stops before edits if expected source differs. Not a general installer for arbitrary Datebook versions.
- `scripts/deadline_support.py` and `integrations/desktop/`: time-aware desktop task logic and backed-up editor/grid integration. Installation does not rewrite assignment data or completion flags.

Storage (honors XDG data/cache directories):

```
~/.local/share/canvas-local/assignments.sqlite3
~/.cache/canvas-local/feed.json
~/.config/canvas-local/integration.json
~/.local/state/canvas-local/backups/<timestamp>/
```

Database and feed files are private (`0600`, enclosing new directories `0700`). Native messaging is allowlisted to the extension's stable ID; no localhost HTTP listener, cloud service, stored Canvas credentials, or page-accessible local API. Canvas fetches use GET; writes happen only through explicit student-initiated actions (assignment submissions, quiz attempts, tool launches), each validated to fixed endpoints and shapes. The content script constructs text nodes rather than injecting assignment HTML.

Do not move this project after installing without rerunning both install scripts: the native manifest and Datebook adapter configuration point to its absolute path. Keep the public `key` in `manifest.json` stable; it determines the extension ID. It is not a secret.

## Tests

```sh
python3 -B -m unittest discover -s tests -v
npm ci
npm test
python3 -B scripts/test_desktop.py
```

Core tests require Node and Python, not Canvas access or Omarchy. Missing browser/desktop dependencies produce explicit skips, not failures. An installed but broken dependency still fails its test.

The workspace interaction test discovers Chromium/Brave on `PATH` and launches an isolated headless process with mocked Canvas/native responses; it does not open or modify your regular browser profile. Set `CANVAS_BROWSER_PATH` to choose a specific executable. Two grid-integration tests use Datebook's installed `Model.js`, discovered relative to the user's config directory. The remaining deadline tests use repo sources and run anywhere.

`scripts/test_desktop.py` renders the QML test templates into a temporary directory with paths to the installed plugins and runs Quickshell offscreen. Use `--strict` on the laptop to require all dependencies. Plugin and Omarchy-shell locations can be overridden with `CANVAS_DESKTOP_PLUGIN_DIR` and `CANVAS_OMARCHY_SHELL_DIR`. Explicit invalid paths fail. `CANVAS_SKIP_BROWSER_TESTS=1` and `CANVAS_SKIP_DESKTOP_TESTS=1` disable those integration checks explicitly. Datebook's own additional suite is available on the laptop at `~/.config/omarchy/plugins/blacksheep.calendar/tests/run.sh`.

## Remote development and deploying pulls

Read [AGENTS.md](AGENTS.md) for architecture, behavior invariants, data safety, and agent instructions. The repo is suitable for editing and running core tests on a dev server. **Do not run desktop/native installers on the server.** Installed Datebook and lock-screen sources are external dependencies, not files included in this checkout. Server tests cannot verify live Canvas authentication or the actual desktop.

After pushing changes from the server, on the laptop:

1. Pull using the HTTPS `origin`.
2. For desktop changes, run `python3 -B scripts/integrate_desktop.py`. Stop and investigate if it refuses unfamiliar plugin code; do not force an overwrite.
3. For extension changes, reload Canvas Local at `brave://extensions`, then reload Canvas pages.
4. If native registration changed, or the checkout moved, rerun `python3 scripts/install.py` and the desktop installer so absolute paths point to this checkout.
5. For desktop changes, restart the shell with `omarchy restart shell` **only while unlocked** and check `omarchy shell shell ping` and shell logs. Do not use `omarchy refresh shell`, which resets configuration.
6. Run `python3 -B scripts/test_desktop.py --strict` to verify installed components. Also run Datebook's own suite when changing desktop behavior.

A pull does not deploy plugin changes, refresh extension code, or restart the shell automatically. Keep the manifest public key stable and do not copy assignment data/browser credentials between machines. Normal pulls and installers preserve the external SQLite database and its personal deadlines/completion flags.

CLI examples:

```sh
python3 native/canvas_feed.py list
python3 native/canvas_feed.py update '<uid>' --patch '{"completion":false}'
python3 native/canvas_feed.py update '<uid>' --patch '{"completion":null}'
python3 native/canvas_feed.py update '<uid>' --patch '{"personalDue":"2026-11-09T17:00:00-05:00"}'
```

## Uninstall / rollback

Remove the extension through Brave. Remove only `com.canvas_local.feed.json` from the relevant Brave `NativeMessagingHosts` directory to unregister the bridge. Restore the desktop files from the timestamped backup, remove the added `omcal/canvas_local.py` adapter, then republish Datebook's cache. Do not delete local assignment data unless you want to discard personal deadlines and completion history. Existing calendars and Google credentials are not modified.
