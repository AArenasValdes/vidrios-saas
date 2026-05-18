"use client";

import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { organizationProfileService } from "@/features/organization-profile/services/organization-profile.service";
import { publicLandingCacheRepository } from "@/features/solicitudes/repositories/public-landing-cache.repository";
import type {
  OrganizationProfile,
  UpdateOrganizationProfileInput,
} from "@/features/organization-profile/types/organization-profile";

type OrganizationProfileCacheEntry = {
  organizationId: string;
  profile: OrganizationProfile;
};

const organizationProfileCache = new Map<string, OrganizationProfileCacheEntry>();
const organizationProfilePromiseCache = new Map<string, Promise<OrganizationProfile>>();
const ORGANIZATION_PROFILE_STORAGE_PREFIX = "vidrios-saas:organization-profile:";

type BrowserWindowWithIdleCallback = Window &
  typeof globalThis & {
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

function getOrganizationKey(organizationId: string | number | null) {
  return organizationId === null ? null : String(organizationId);
}

function getOrganizationProfileStorageKey(organizationKey: string) {
  return `${ORGANIZATION_PROFILE_STORAGE_PREFIX}${organizationKey}`;
}

function readOrganizationProfileFromStorage(organizationKey: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(
      getOrganizationProfileStorageKey(organizationKey)
    );

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as OrganizationProfile;
  } catch {
    return null;
  }
}

function persistOrganizationProfile(
  organizationKey: string,
  profile: OrganizationProfile
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      getOrganizationProfileStorageKey(organizationKey),
      JSON.stringify(profile)
    );
  } catch {
    return;
  }
}

function scheduleDeferredProfileRefresh(callback: () => void, delayMs = 500) {
  if (typeof window === "undefined") {
    callback();
    return () => undefined;
  }

  const browserWindow = window as BrowserWindowWithIdleCallback;

  if (typeof browserWindow.requestIdleCallback === "function") {
    const handle = browserWindow.requestIdleCallback(callback, {
      timeout: Math.max(1500, delayMs),
    });

    return () => {
      browserWindow.cancelIdleCallback?.(handle);
    };
  }

  const timeoutId = window.setTimeout(callback, delayMs);
  return () => window.clearTimeout(timeoutId);
}

function readInitialOrganizationProfileState(organizationId: string | number | null) {
  if (organizationId === null || organizationId === undefined) {
    return {
      profile: null as OrganizationProfile | null,
      isReady: false,
    };
  }

  const organizationKey = String(organizationId);
  const warmCache = organizationProfileCache.get(organizationKey);

  if (warmCache) {
    return {
      profile: warmCache.profile,
      isReady: true,
    };
  }

  const persisted = readOrganizationProfileFromStorage(organizationKey);

  if (persisted) {
    organizationProfileCache.set(organizationKey, {
      organizationId: organizationKey,
      profile: persisted,
    });

    return {
      profile: persisted,
      isReady: true,
    };
  }

  return {
    profile: null as OrganizationProfile | null,
    isReady: false,
  };
}

export function useOrganizationProfile() {
  const { organizacionId, cargando } = useAuth();
  const initialStateRef = useRef(readInitialOrganizationProfileState(organizacionId));
  const [profile, setProfile] = useState<OrganizationProfile | null>(
    initialStateRef.current.profile
  );
  const [isReady, setIsReady] = useState(initialStateRef.current.isReady);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const activeRefreshIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const lastOrganizationIdRef = useRef<string | null>(getOrganizationKey(organizacionId));
  const bootRetryCountRef = useRef(0);
  const bootRetryTimeoutRef = useRef<number | null>(null);

  const refreshProfileRef = useRef<() => Promise<OrganizationProfile | null>>(async () => null as unknown as OrganizationProfile);

  refreshProfileRef.current = async () => {
    const refreshId = ++activeRefreshIdRef.current;
    const organizationKey = getOrganizationKey(organizacionId);

    if (!organizationKey) {
      if (!isMountedRef.current || refreshId !== activeRefreshIdRef.current) {
        return null;
      }

      setProfile(null);
      setIsReady(true);
      return null;
    }

    let profilePromise = organizationProfilePromiseCache.get(organizationKey);

    if (!profilePromise) {
      profilePromise = organizationProfileService
        .getByOrganizationId(organizacionId as string | number)
        .finally(() => {
          organizationProfilePromiseCache.delete(organizationKey);
        });

      organizationProfilePromiseCache.set(organizationKey, profilePromise);
    }

    const nextProfile = await profilePromise;
    const hasWarmCache =
      nextProfile !== null || organizationProfileCache.has(organizationKey);

    if (!isMountedRef.current || refreshId !== activeRefreshIdRef.current) {
      return nextProfile;
    }

    setProfile(nextProfile);
    organizationProfileCache.set(organizationKey, {
      organizationId: organizationKey,
      profile: nextProfile,
    });
    persistOrganizationProfile(organizationKey, nextProfile);
    setIsReady(true);

    if (
      !hasWarmCache &&
      nextProfile === null &&
      bootRetryCountRef.current < 1 &&
      typeof window !== "undefined"
    ) {
      bootRetryCountRef.current += 1;
      bootRetryTimeoutRef.current = window.setTimeout(() => {
        bootRetryTimeoutRef.current = null;
        void refreshProfileRef.current();
      }, 500);
    }

    return nextProfile;
  };

  async function refreshProfile() {
    return refreshProfileRef.current();
  }

  useEffect(() => {
    const organizationKey = getOrganizationKey(organizacionId);

    if (lastOrganizationIdRef.current !== organizationKey) {
      lastOrganizationIdRef.current = organizationKey;
      bootRetryCountRef.current = 0;
      if (bootRetryTimeoutRef.current !== null && typeof window !== "undefined") {
        window.clearTimeout(bootRetryTimeoutRef.current);
        bootRetryTimeoutRef.current = null;
      }
      const nextInitialState = readInitialOrganizationProfileState(organizacionId);
      setProfile(nextInitialState.profile);
      setIsReady(nextInitialState.isReady);
    }

    if (cargando) {
      return;
    }

    if (!organizacionId || !organizationKey) {
      setProfile(null);
      setIsReady(true);
      return;
    }

    const cached = organizationProfileCache.get(String(organizacionId));

    const hasWarmProfile = Boolean(cached);

    if (cached) {
      setProfile(cached.profile);
      setIsReady(true);
    } else {
      const persisted = readOrganizationProfileFromStorage(organizationKey);

      if (persisted) {
        const nextProfile = persisted;
        setProfile(persisted);
        organizationProfileCache.set(organizationKey, {
          organizationId: organizationKey,
          profile: nextProfile,
        });
        setIsReady(true);
        return scheduleDeferredProfileRefresh(() => {
          void refreshProfileRef.current();
        });
      } else {
        setProfile(null);
        setIsReady(false);
      }
    }

    if (hasWarmProfile) {
      return scheduleDeferredProfileRefresh(() => {
        void refreshProfileRef.current();
      });
    }

    void refreshProfileRef.current();
  }, [cargando, organizacionId]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      activeRefreshIdRef.current += 1;
      if (bootRetryTimeoutRef.current !== null && typeof window !== "undefined") {
        window.clearTimeout(bootRetryTimeoutRef.current);
        bootRetryTimeoutRef.current = null;
      }
    };
  }, []);

  const saveProfile = async (input: UpdateOrganizationProfileInput) => {
    if (!organizacionId) {
      throw new Error("No hay organizacion activa");
    }

    setIsSaving(true);

    try {
      const nextProfile = await organizationProfileService.updateByOrganizationId(
        organizacionId,
        input
      );

      setProfile(nextProfile);
      organizationProfileCache.set(String(organizacionId), {
        organizationId: String(organizacionId),
        profile: nextProfile,
      });
      persistOrganizationProfile(String(organizacionId), nextProfile);
      void publicLandingCacheRepository.revalidate().catch(() => false);

      return nextProfile;
    } finally {
      setIsSaving(false);
    }
  };

  const uploadLogo = async (file: File) => {
    if (!organizacionId) {
      throw new Error("No hay organizacion activa");
    }

    setIsUploading(true);

    try {
      return await organizationProfileService.uploadLogo(organizacionId, file);
    } finally {
      setIsUploading(false);
    }
  };

  const uploadHeroImage = async (file: File) => {
    if (!organizacionId) {
      throw new Error("No hay organizacion activa");
    }

    setIsUploadingHero(true);

    try {
      return await organizationProfileService.uploadHeroImage(organizacionId, file);
    } finally {
      setIsUploadingHero(false);
    }
  };

  return {
    profile,
    isReady,
    isSaving,
    isUploading,
    isUploadingHero,
    refreshProfile,
    saveProfile,
    uploadLogo,
    uploadHeroImage,
  };
}
