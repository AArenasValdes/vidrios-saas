const APP_RESET_QUERY = "/login?app_reset=1";

function isBrowser() {
  return typeof window !== "undefined";
}

function isVentoraStorageKey(key: string) {
  return (
    key.startsWith("vidrios-saas") ||
    key.startsWith("ventora:") ||
    key.startsWith("sb-") ||
    key.includes("supabase")
  );
}

function isSupabaseAuthCookie(name: string) {
  return (
    name.startsWith("sb-") ||
    name.startsWith("supabase-auth-token") ||
    name.includes("-auth-token")
  );
}

function clearSupabaseAuthCookies() {
  if (!isBrowser()) {
    return;
  }

  document.cookie
    .split(";")
    .map((chunk) => chunk.trim().split("=", 1)[0])
    .filter((name): name is string => Boolean(name) && isSupabaseAuthCookie(name))
    .forEach((name) => {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure`;
    });
}

function clearAuthStorage() {
  if (!isBrowser()) {
    return;
  }

  const isAuthStorageKey = (key: string) =>
    key === "vidrios-saas:auth-state" ||
    key.startsWith("vidrios-saas:auth-profile:") ||
    key.startsWith("sb-") ||
    key.startsWith("supabase");

  [window.localStorage, window.sessionStorage].forEach((storage) => {
    const keysToRemove: string[] = [];

    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);

      if (key && isAuthStorageKey(key)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => storage.removeItem(key));
  });
}

function clearMatchingStorage(storage: Storage) {
  const keysToRemove: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);

    if (key && isVentoraStorageKey(key)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key));
}

async function clearVentoraCaches() {
  if (!isBrowser() || !("caches" in window)) {
    return;
  }

  try {
    const keys = await window.caches.keys();

    await Promise.all(
      keys
        .filter(
          (key) =>
            key.startsWith("vidrios-saas") ||
            key.includes("supabase") ||
            key.includes("ventora")
        )
        .map((key) => window.caches.delete(key))
    );
  } catch {
    return;
  }
}

async function unregisterAllServiceWorkers() {
  if (
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch {
    return;
  }
}

async function deleteLikelyIndexedDbDatabases() {
  if (typeof indexedDB === "undefined") {
    return;
  }

  try {
    const browserIndexedDb = indexedDB as IDBFactory & {
      databases?: () => Promise<Array<{ name?: string | null }>>;
    };

    if (typeof browserIndexedDb.databases !== "function") {
      return;
    }

    const databases = await browserIndexedDb.databases();
    const names = databases
      .map((database) => database.name ?? "")
      .filter(
        (name) =>
          Boolean(name) &&
          (name.includes("supabase") ||
            name.includes("ventora") ||
            name.includes("vidrios"))
      );

    await Promise.all(
      names.map(
        (name) =>
          new Promise<void>((resolve) => {
            try {
              const request = indexedDB.deleteDatabase(name);
              request.onsuccess = () => resolve();
              request.onerror = () => resolve();
              request.onblocked = () => resolve();
            } catch {
              resolve();
            }
          })
      )
    );
  } catch {
    return;
  }
}

async function signOutLocally() {
  try {
    const [{ createClient }] = await Promise.all([
      import("@/lib/supabase/client"),
    ]);
    const client = createClient();
    await client.auth.signOut({
      scope: "local",
    });
  } catch {
    return;
  }
}

export const authDeviceRecoveryService = {
  clearStaleAuthState() {
    if (!isBrowser()) {
      return;
    }

    clearSupabaseAuthCookies();

    try {
      clearAuthStorage();
    } catch {
      // Algunos navegadores bloquean el storage; las cookies siguen limpiándose.
    }
  },

  async resetCurrentDeviceAppState() {
    if (!isBrowser()) {
      return;
    }

    authDeviceRecoveryService.clearStaleAuthState();
    await signOutLocally();
    await unregisterAllServiceWorkers();
    await clearVentoraCaches();
    await deleteLikelyIndexedDbDatabases();

    try {
      clearMatchingStorage(window.localStorage);
    } catch {
      // noop
    }

    try {
      clearMatchingStorage(window.sessionStorage);
    } catch {
      // noop
    }

    window.location.replace(APP_RESET_QUERY);
  },
};

export { APP_RESET_QUERY, isVentoraStorageKey };
