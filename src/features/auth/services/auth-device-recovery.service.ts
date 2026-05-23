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
  async resetCurrentDeviceAppState() {
    if (!isBrowser()) {
      return;
    }

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
