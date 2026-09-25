"use strict";

const PLATFORMS = Object.freeze({
  boss: Object.freeze({
    hostname: "www.zhipin.com",
    label: "BOSS 直聘",
    inputId: "boss-enabled"
  }),
  liepin: Object.freeze({
    hostname: "lpt.liepin.com",
    label: "猎聘",
    inputId: "liepin-enabled"
  })
});

const summary = document.querySelector("#summary");
const contextCard = document.querySelector(".context-card");
const contextTitle = document.querySelector("#context-title");
const contextMessage = document.querySelector("#context-message");
let currentTab = null;
let currentHostname = "";

function setContext(title, message, isError = false) {
  contextTitle.textContent = title;
  contextMessage.textContent = message;
  contextCard.classList.toggle("is-error", isError);
}

function platformElements(key) {
  return {
    card: document.querySelector(`[data-platform="${key}"]`),
    input: document.querySelector(`#${PLATFORMS[key].inputId}`),
    status: document.querySelector(`[data-status="${key}"]`)
  };
}

function render(state) {
  let enabledCount = 0;
  for (const [key, platform] of Object.entries(PLATFORMS)) {
    const platformState = state.platforms[key];
    const { card, input, status } = platformElements(key);
    const active = platformState.enabled && platformState.registered;
    input.checked = platformState.enabled;
    input.disabled = false;
    card.classList.remove("is-busy");
    card.classList.toggle("is-enabled", active);
    status.textContent = active
      ? "防护已注册 · 刷新后生效"
      : platformState.enabled
        ? "注册状态异常"
        : "已关闭";
    if (active) enabledCount += 1;
    card.title = currentHostname === platform.hostname ? "当前页面平台" : "";
  }

  summary.textContent = `${enabledCount}/2 已启用`;
  summary.classList.toggle("is-off", enabledCount === 0);

  const current = Object.values(PLATFORMS).find(
    (platform) => platform.hostname === currentHostname
  );
  if (current) {
    setContext(
      `当前页面：${current.label}`,
      "切换该平台开关后，本扩展会自动刷新当前标签页。"
    );
  } else {
    setContext("当前页面不在作用域", "扩展只会在 BOSS 直聘和猎聘指定域名运行。");
  }
}

async function sendMessage(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) {
    throw new Error(response?.error || "扩展后台未响应");
  }
  return response;
}

async function reloadMatchingTab(key) {
  if (
    currentTab?.id !== undefined &&
    currentHostname === PLATFORMS[key].hostname
  ) {
    await chrome.tabs.reload(currentTab.id);
    window.close();
  }
}

async function updatePlatform(key, enabled) {
  const { card, input, status } = platformElements(key);
  input.disabled = true;
  card.classList.add("is-busy");
  status.textContent = enabled ? "正在启用…" : "正在关闭…";

  try {
    const state = await sendMessage({
      type: "set-platform",
      platform: key,
      enabled
    });
    render(state);
    await reloadMatchingTab(key);
  } catch (error) {
    input.checked = !enabled;
    input.disabled = false;
    card.classList.remove("is-busy");
    setContext("操作失败", String(error), true);
  }
}

async function initialize() {
  for (const key of Object.keys(PLATFORMS)) {
    const { input } = platformElements(key);
    input.addEventListener("change", () => {
      void updatePlatform(key, input.checked);
    });
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab ?? null;
    try {
      currentHostname = tab?.url ? new URL(tab.url).hostname : "";
    } catch {
      currentHostname = "";
    }
    render(await sendMessage({ type: "get-state" }));
  } catch (error) {
    setContext("读取失败", String(error), true);
    summary.textContent = "不可用";
    summary.classList.add("is-off");
  }
}

void initialize();
