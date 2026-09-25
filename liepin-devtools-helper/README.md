# Liepin DevTools Development Helper

This package disables the client-side DevTools enforcement previously identified on `https://lpt.liepin.com/*` so the page does not intentionally replace itself with `about:blank` during authorized debugging.

## Behavior without the helper

![Liepin page behavior after opening F12 DevTools without the helper](../docs/images/liepin-normal-f12-devtools.webp)

The animation shows the Liepin page replacing itself with `about:blank` after F12 DevTools is opened without this helper enabled.

## Recommended: unpacked Chrome extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this `liepin-devtools-helper` directory.
5. Reload the Liepin page before opening DevTools.

The extension is Manifest V3, has no optional permissions, and matches only `https://lpt.liepin.com/*`.

## Alternative: userscript

If Tampermonkey or a compatible userscript manager is already installed, import `liepin-devtools-helper.user.js`, enable it, and reload the page before opening DevTools.

## How it works

The code runs at `document_start` in the page's main JavaScript world. It preserves the site's configuration fields while forcing `window.__LpSecurityConfig.enforce` to `false`. It also wraps `LpSecurityCollect.SecurityCollect.init` as a narrow fallback so a later configuration assignment cannot re-enable the known enforcement path.

It intentionally does **not** patch `console`, `Date`, `performance`, window dimensions, timers, or JavaScript prototypes. It also does not suppress unrelated fingerprint or behavior telemetry, bypass authentication, or modify network requests.

## Remove

Disable or remove the extension/userscript and reload the page. No persistent page data is written.

## Local verification

Run:

```powershell
node .\test.mjs
```

The test checks host scoping, forced `enforce: false`, the real bootstrap-shaped `SecurityCollect.init(...)` call, and idempotent installation.
