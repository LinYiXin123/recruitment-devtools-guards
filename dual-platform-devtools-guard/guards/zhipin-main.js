(() => {
  "use strict";

  const TARGET_HOST = "www.zhipin.com";
  const VERSION = "1.1.0";
  const API_NAME = "__BOSS_DEVTOOLS_GUARD__";
  const CLEAN_REALM_BRIDGE = "__xbcw";

  if (location.hostname !== TARGET_HOST || window[API_NAME]?.active) return;

  const counters = {
    cleanRealmEscapesBlocked: 0,
    consoleProbesBlocked: 0,
    consoleClearsBlocked: 0,
    shortcutHandlersBlocked: 0,
    destructiveActionsBlocked: 0
  };

  const objectToString = Object.prototype.toString;
  const hasOwn = Object.prototype.hasOwnProperty;

  function increment(key) {
    counters[key] += 1;
  }

  function hasActiveUserGesture() {
    try {
      return navigator.userActivation?.isActive === true;
    } catch {
      return false;
    }
  }

  function isTargetBundleStack() {
    try {
      const stack = String(new Error().stack || "");
      return (
        stack.includes("/zhipin-geek-seo/") ||
        stack.includes("/web/geek/js/main.js") ||
        stack.includes("/zhipin-geek-spa/web/")
      );
    } catch {
      return false;
    }
  }

  function isBlankHiddenProbeFrame(frame) {
    try {
      if (frame.parentNode !== document.body) return false;
      if (String(frame.style?.display || "").toLowerCase() !== "none") return false;

      const attributes = ["src", "srcdoc", "name", "id", "class"];
      return attributes.every((name) => {
        const value = frame.getAttribute?.(name);
        return value === null || value === "";
      });
    } catch {
      return false;
    }
  }

  function ownDescriptor(value, property) {
    try {
      return Object.getOwnPropertyDescriptor(value, property);
    } catch {
      return undefined;
    }
  }

  function isDetectorValue(value) {
    if (value === null || value === undefined) return false;

    const valueType = typeof value;
    if (valueType === "function") {
      return hasOwn.call(value, "toString");
    }
    if (valueType !== "object") return false;

    let tag = "";
    try {
      tag = objectToString.call(value);
    } catch {
      return false;
    }

    if (
      (tag === "[object Date]" || tag === "[object RegExp]") &&
      hasOwn.call(value, "toString")
    ) {
      return true;
    }

    const idDescriptor = ownDescriptor(value, "id");
    return typeof idDescriptor?.get === "function";
  }

  function isPerformanceTableProbe(value) {
    if (!Array.isArray(value) || value.length !== 50) return false;
    const first = value[0];
    if (!first || typeof first !== "object" || value[49] !== first) return false;
    try {
      return Reflect.ownKeys(first).length >= 400;
    } catch {
      return false;
    }
  }

  function shouldSuppressConsoleCall(method, args) {
    if (args.some(isDetectorValue)) return true;
    return (method === "log" || method === "table") && args.some(isPerformanceTableProbe);
  }

  function replaceMethod(owner, name, applyTrap) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, name);
    const original = owner[name];
    if (typeof original !== "function") return false;

    const wrapped = new Proxy(original, {
      apply(target, thisArg, args) {
        return applyTrap(target, thisArg, args);
      }
    });

    try {
      Object.defineProperty(owner, name, {
        ...descriptor,
        value: wrapped
      });
      return true;
    } catch {
      try {
        owner[name] = wrapped;
        return owner[name] === wrapped;
      } catch {
        return false;
      }
    }
  }

  // The production bundle creates a hidden srcdoc iframe and assigns its fresh
  // window to parent.__xbcw. Pinning this bridge to the current realm makes its
  // native-reference lookup use the guarded console instead.
  try {
    Object.defineProperty(window, CLEAN_REALM_BRIDGE, {
      configurable: false,
      enumerable: false,
      get() {
        return window;
      },
      set() {
        increment("cleanRealmEscapesBlocked");
      }
    });
  } catch {
    // A pre-existing bridge is unusual; the sink guards below still provide a
    // second line of defense without replacing DOM constructors.
  }

  // The SPA detector keeps its blank iframe in a closure instead of exposing
  // it through __xbcw. Redirect only that exact clean-realm lookup: a hidden,
  // blank iframe attached directly to body and read by a known BOSS bundle.
  // Ordinary iframes, including hidden frames with a URL/srcdoc, are untouched.
  try {
    const iframePrototype = HTMLIFrameElement.prototype;
    const contentWindowDescriptor = Object.getOwnPropertyDescriptor(
      iframePrototype,
      "contentWindow"
    );
    if (typeof contentWindowDescriptor?.get === "function") {
      const nativeGetter = contentWindowDescriptor.get;
      const guardedGetter = new Proxy(nativeGetter, {
        apply(target, thisArg, args) {
          if (isBlankHiddenProbeFrame(thisArg) && isTargetBundleStack()) {
            increment("cleanRealmEscapesBlocked");
            return window;
          }
          return Reflect.apply(target, thisArg, args);
        }
      });
      Object.defineProperty(iframePrototype, "contentWindow", {
        ...contentWindowDescriptor,
        get: guardedGetter
      });
    }
  } catch {
    // The legacy __xbcw bridge and sink guards remain available if a browser
    // makes the iframe accessor non-configurable.
  }

  for (const method of ["log", "table"]) {
    replaceMethod(console, method, (target, _thisArg, args) => {
      if (shouldSuppressConsoleCall(method, args)) {
        increment("consoleProbesBlocked");
        return undefined;
      }
      return Reflect.apply(target, console, args);
    });
  }

  replaceMethod(console, "clear", () => {
    increment("consoleClearsBlocked");
    return undefined;
  });

  // This listener runs before the page bundle's keydown listener. It stops only
  // the page event path and deliberately does not call preventDefault(), so the
  // browser keeps handling F12 / DevTools shortcuts normally.
  window.addEventListener(
    "keydown",
    (event) => {
      const key = String(event.key || "").toUpperCase();
      const devtoolsShortcut =
        key === "F12" ||
        ((event.ctrlKey || event.metaKey) &&
          event.shiftKey &&
          (key === "I" || key === "J" || key === "C")) ||
        ((event.ctrlKey || event.metaKey) && (key === "U" || key === "S"));

      if (!devtoolsShortcut) return;
      event.stopImmediatePropagation();
      increment("shortcutHandlersBlocked");
    },
    true
  );

  replaceMethod(window, "open", (target, thisArg, args) => {
    const url = args[0] ?? "";
    const targetName = args[1] ?? "";
    if (
      url === "" &&
      targetName === "_self" &&
      !hasActiveUserGesture() &&
      isTargetBundleStack()
    ) {
      increment("destructiveActionsBlocked");
      return window;
    }
    return Reflect.apply(target, thisArg, args);
  });

  replaceMethod(window, "close", (target, thisArg, args) => {
    if (!hasActiveUserGesture() && isTargetBundleStack()) {
      increment("destructiveActionsBlocked");
      return undefined;
    }
    return Reflect.apply(target, thisArg, args);
  });

  replaceMethod(history, "back", (target, thisArg, args) => {
    if (!hasActiveUserGesture() && isTargetBundleStack()) {
      increment("destructiveActionsBlocked");
      return undefined;
    }
    return Reflect.apply(target, thisArg, args);
  });

  for (const method of ["assign", "replace"]) {
    replaceMethod(location, method, (target, thisArg, args) => {
      if ((args[0] ?? "") === "" && !hasActiveUserGesture() && isTargetBundleStack()) {
        increment("destructiveActionsBlocked");
        return undefined;
      }
      return Reflect.apply(target, thisArg, args);
    });
  }

  const innerHTMLDescriptor = Object.getOwnPropertyDescriptor(
    Element.prototype,
    "innerHTML"
  );
  if (typeof innerHTMLDescriptor?.set === "function") {
    const nativeSetter = innerHTMLDescriptor.set;
    const guardedSetter = new Proxy(nativeSetter, {
      apply(target, thisArg, args) {
        if (
          thisArg === document.body &&
          args[0] === "" &&
          !hasActiveUserGesture() &&
          isTargetBundleStack()
        ) {
          increment("destructiveActionsBlocked");
          return undefined;
        }
        return Reflect.apply(target, thisArg, args);
      }
    });
    try {
      Object.defineProperty(Element.prototype, "innerHTML", {
        ...innerHTMLDescriptor,
        set: guardedSetter
      });
    } catch {
      // Detector suppression remains the primary control.
    }
  }

  function isReactionStyle(node) {
    if (!node || String(node.tagName || "").toUpperCase() !== "STYLE") return false;
    const css = String(node.textContent || node.innerText || "");
    const hidesPage = [
      "filter: blur(20px) !important",
      "visibility: hidden !important",
      "display: none !important",
      "opacity: 0 !important"
    ].some((marker) => css.includes(marker));
    return hidesPage && /(^|[\s,{])(html|body|#?app)(?=[\s,{])/i.test(css);
  }

  replaceMethod(Node.prototype, "appendChild", (target, thisArg, args) => {
    if (
      isReactionStyle(args[0]) &&
      !hasActiveUserGesture() &&
      isTargetBundleStack()
    ) {
      increment("destructiveActionsBlocked");
      return args[0];
    }
    return Reflect.apply(target, thisArg, args);
  });

  const api = Object.freeze({
    active: true,
    version: VERSION,
    host: TARGET_HOST,
    getStatus() {
      return Object.freeze({ ...counters });
    }
  });

  try {
    Object.defineProperty(window, API_NAME, {
      configurable: false,
      enumerable: false,
      writable: false,
      value: api
    });
  } catch {
    // The guard itself is already active even if diagnostics cannot be exposed.
  }
})();
