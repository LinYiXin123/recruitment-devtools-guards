"use strict";

const PLATFORMS = Object.freeze({
  boss: Object.freeze({
    id: "recruit-devtools-guard-boss",
    storageKey: "bossEnabled",
    matches: ["https://www.zhipin.com/*"],
    js: ["guards/zhipin-main.js"]
  }),
  liepin: Object.freeze({
    id: "recruit-devtools-guard-liepin",
    storageKey: "liepinEnabled",
    matches: ["https://lpt.liepin.com/*"],
    js: ["guards/liepin-main.js"]
  })
});

let updateQueue = Promise.resolve();

function registrationFor(platform) {
  return {
    id: platform.id,
    matches: [...platform.matches],
    js: [...platform.js],
    runAt: "document_start",
    world: "MAIN",
    allFrames: false,
    persistAcrossSessions: true
  };
}

async function readSettings() {
  const defaults = Object.fromEntries(
    Object.values(PLATFORMS).map((platform) => [platform.storageKey, true])
  );
  const stored = await chrome.storage.local.get(defaults);
  return Object.fromEntries(
    Object.entries(PLATFORMS).map(([key, platform]) => [
      key,
      stored[platform.storageKey] !== false
    ])
  );
}

async function syncPlatform(key, enabled) {
  const platform = PLATFORMS[key];
  if (!platform) throw new Error(`未知平台：${key}`);

  const existing = await chrome.scripting.getRegisteredContentScripts({
    ids: [platform.id]
  });
  if (existing.length > 0) {
    await chrome.scripting.unregisterContentScripts({ ids: [platform.id] });
  }
  if (enabled) {
    await chrome.scripting.registerContentScripts([registrationFor(platform)]);
  }
}

function enqueueUpdate(work) {
  const next = updateQueue.then(work, work);
  updateQueue = next.catch(() => undefined);
  return next;
}

async function initialize() {
  const settings = await readSettings();
  await chrome.storage.local.set(
    Object.fromEntries(
      Object.entries(PLATFORMS).map(([key, platform]) => [
        platform.storageKey,
        settings[key]
      ])
    )
  );
  for (const [key, enabled] of Object.entries(settings)) {
    await syncPlatform(key, enabled);
  }
}

async function collectState() {
  const settings = await readSettings();
  const ids = Object.values(PLATFORMS).map((platform) => platform.id);
  const registered = await chrome.scripting.getRegisteredContentScripts({ ids });
  const registeredIds = new Set(registered.map((item) => item.id));
  return {
    ok: true,
    version: chrome.runtime.getManifest().version,
    platforms: Object.fromEntries(
      Object.entries(PLATFORMS).map(([key, platform]) => [
        key,
        {
          enabled: settings[key],
          registered: registeredIds.has(platform.id)
        }
      ])
    )
  };
}

async function getState() {
  await updateQueue;
  return collectState();
}

chrome.runtime.onInstalled.addListener(() => {
  void enqueueUpdate(initialize);
});

chrome.runtime.onStartup.addListener(() => {
  void enqueueUpdate(initialize);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return false;

  if (message.type === "get-state") {
    void getState()
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (
    message.type === "set-platform" &&
    Object.hasOwn(PLATFORMS, message.platform) &&
    typeof message.enabled === "boolean"
  ) {
    void enqueueUpdate(async () => {
      const platform = PLATFORMS[message.platform];
      await chrome.storage.local.set({
        [platform.storageKey]: message.enabled
      });
      await syncPlatform(message.platform, message.enabled);
      return collectState();
    })
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  return false;
});
