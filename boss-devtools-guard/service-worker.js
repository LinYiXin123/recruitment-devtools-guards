"use strict";

const SCRIPT_ID = "boss-devtools-guard-main";
const STORAGE_KEY = "enabled";
const REGISTRATION = {
  id: SCRIPT_ID,
  matches: ["https://www.zhipin.com/*"],
  js: ["main-world.js"],
  runAt: "document_start",
  world: "MAIN",
  allFrames: false,
  persistAcrossSessions: true
};

async function readEnabled() {
  const stored = await chrome.storage.local.get({ [STORAGE_KEY]: true });
  return stored[STORAGE_KEY] !== false;
}

async function syncRegistration(enabled) {
  const existing = await chrome.scripting.getRegisteredContentScripts({
    ids: [SCRIPT_ID]
  });

  if (existing.length > 0) {
    await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
  }

  if (enabled) {
    await chrome.scripting.registerContentScripts([REGISTRATION]);
  }
}

async function initialize() {
  const enabled = await readEnabled();
  await chrome.storage.local.set({ [STORAGE_KEY]: enabled });
  await syncRegistration(enabled);
}

chrome.runtime.onInstalled.addListener(() => {
  void initialize();
});

chrome.runtime.onStartup.addListener(() => {
  void initialize();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return false;

  if (message.type === "get-state") {
    void (async () => {
      try {
        const enabled = await readEnabled();
        const registered = await chrome.scripting.getRegisteredContentScripts({
          ids: [SCRIPT_ID]
        });
        sendResponse({
          ok: true,
          enabled,
          registered: registered.length === 1,
          version: chrome.runtime.getManifest().version
        });
      } catch (error) {
        sendResponse({ ok: false, error: String(error) });
      }
    })();
    return true;
  }

  if (message.type === "set-enabled" && typeof message.enabled === "boolean") {
    void (async () => {
      try {
        await chrome.storage.local.set({ [STORAGE_KEY]: message.enabled });
        await syncRegistration(message.enabled);
        sendResponse({ ok: true, enabled: message.enabled });
      } catch (error) {
        sendResponse({ ok: false, error: String(error) });
      }
    })();
    return true;
  }

  return false;
});
