"use strict";

const enabledInput = document.querySelector("#enabled");
const statusTitle = document.querySelector("#status-title");
const statusDetail = document.querySelector("#status-detail");
const errorBox = document.querySelector("#error");
const versionLabel = document.querySelector("#version");

function showError(message) {
  errorBox.hidden = false;
  errorBox.textContent = message;
}

function clearError() {
  errorBox.hidden = true;
  errorBox.textContent = "";
}

function isSupportedUrl(url) {
  try {
    return new URL(url).hostname === "www.zhipin.com";
  } catch {
    return false;
  }
}

function render(enabled, registered, supported) {
  enabledInput.checked = enabled;
  statusTitle.textContent = enabled ? "防护已启用" : "防护已停用";
  if (!supported) {
    statusDetail.textContent = "当前标签页不在作用范围";
  } else if (enabled && registered) {
    statusDetail.textContent = "刷新后将在 document_start 生效";
  } else if (enabled) {
    statusDetail.textContent = "脚本注册尚未完成";
  } else {
    statusDetail.textContent = "页面将按原始逻辑运行";
  }
}

async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function loadState() {
  clearError();
  const [state, tab] = await Promise.all([
    chrome.runtime.sendMessage({ type: "get-state" }),
    currentTab()
  ]);
  if (!state?.ok) throw new Error(state?.error || "无法读取扩展状态");
  render(state.enabled, state.registered, isSupportedUrl(tab?.url));
  versionLabel.textContent = `v${state.version}`;
  enabledInput.disabled = false;
}

enabledInput.addEventListener("change", async () => {
  clearError();
  enabledInput.disabled = true;
  const nextEnabled = enabledInput.checked;
  try {
    const result = await chrome.runtime.sendMessage({
      type: "set-enabled",
      enabled: nextEnabled
    });
    if (!result?.ok) throw new Error(result?.error || "无法更新扩展状态");

    const tab = await currentTab();
    render(nextEnabled, nextEnabled, isSupportedUrl(tab?.url));
    if (tab?.id && isSupportedUrl(tab.url)) {
      await chrome.tabs.reload(tab.id);
    }
  } catch (error) {
    enabledInput.checked = !nextEnabled;
    showError(String(error));
  } finally {
    enabledInput.disabled = false;
  }
});

void loadState().catch((error) => {
  statusTitle.textContent = "状态读取失败";
  statusDetail.textContent = "请在扩展管理页重新加载后重试";
  showError(String(error));
});
