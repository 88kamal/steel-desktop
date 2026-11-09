# Steel Workflow — Desktop

Desktop app for [Steel Workflow](https://steel-workflow-frontend.vercel.app) on Windows and macOS.

## Download

Get the latest installer from the **[Releases](https://github.com/88kamal/steel-workflow-desktop/releases/latest)** page,
or from the download page at <https://steel-workflow-frontend.vercel.app/download>.

| Platform | File |
|---|---|
| Windows 10/11 (64-bit) | `Steel-Workflow-Setup.exe` |
| Mac — Apple Silicon (M1–M4) | `Steel-Workflow-mac-arm64.dmg` |
| Mac — Intel | `Steel-Workflow-mac-x64.dmg` |

The app is not code-signed yet, so the first launch needs one confirmation:

- **Windows:** "Windows protected your PC" → **More info** → **Run anyway**.
- **macOS:** open the app once, then **System Settings → Privacy & Security → Open Anyway**.

## How it works

A small [Electron](https://www.electronjs.org/) shell that opens the live Steel Workflow web app in its own window.
Updates to the web app reach the desktop app automatically — a new installer is only needed when this shell changes.

## Development

```bash
npm install
npm start          # run locally
npm run dist:mac   # build .dmg (Apple Silicon + Intel) into dist/
npm run dist:win   # build Windows installer into dist/
```

Keep the artifact names unchanged — the download page links to
`releases/latest/download/<file name>`.
