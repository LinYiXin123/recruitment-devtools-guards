(() => {
  "use strict";

  const TARGET_HOST = "lpt.liepin.com";
  const INSTALL_MARKER = "__liepinDevtoolsHelperV1";
  const WRAP_MARKER = "__liepinDevtoolsInitWrappedV1";

  if (!globalThis.location || globalThis.location.hostname !== TARGET_HOST) {
    return;
  }

  if (globalThis[INSTALL_MARKER]) {
    return;
  }

  try {
    Object.defineProperty(globalThis, INSTALL_MARKER, {
      value: true,
      configurable: false,
      enumerable: false,
      writable: false
    });
  } catch {
    globalThis[INSTALL_MARKER] = true;
  }

  const disableEnforcement = (value) => {
    const source = value && typeof value === "object" ? value : {};
    return Object.assign({}, source, { enforce: false });
  };

  let securityConfig = disableEnforcement(globalThis.__LpSecurityConfig);
  const existingConfigDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "__LpSecurityConfig"
  );

  try {
    Object.defineProperty(globalThis, "__LpSecurityConfig", {
      configurable: true,
      enumerable: existingConfigDescriptor?.enumerable ?? true,
      get() {
        return securityConfig;
      },
      set(value) {
        securityConfig = disableEnforcement(value);
      }
    });
  } catch {
    try {
      globalThis.__LpSecurityConfig = securityConfig;
    } catch {
      // The init wrapper below remains as the fallback control point.
    }
  }

  const wrapSecurityPackage = (securityPackage) => {
    const securityCollect = securityPackage?.SecurityCollect;
    const originalInit = securityCollect?.init;

    if (
      typeof originalInit !== "function" ||
      originalInit[WRAP_MARKER] === true
    ) {
      return securityPackage;
    }

    function initWithoutDevtoolsEnforcement(options) {
      return Reflect.apply(originalInit, this, [disableEnforcement(options)]);
    }

    try {
      Object.defineProperty(initWithoutDevtoolsEnforcement, WRAP_MARKER, {
        value: true,
        configurable: false,
        enumerable: false,
        writable: false
      });
      securityCollect.init = initWithoutDevtoolsEnforcement;
    } catch {
      // The __LpSecurityConfig accessor remains the primary control point.
    }

    return securityPackage;
  };

  let securityPackage = wrapSecurityPackage(globalThis.LpSecurityCollect);
  const existingPackageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "LpSecurityCollect"
  );

  try {
    Object.defineProperty(globalThis, "LpSecurityCollect", {
      configurable: true,
      enumerable: existingPackageDescriptor?.enumerable ?? true,
      get() {
        return securityPackage;
      },
      set(value) {
        securityPackage = wrapSecurityPackage(value);
      }
    });
  } catch {
    wrapSecurityPackage(globalThis.LpSecurityCollect);
  }
})();
