"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { organizationProfileService } from "@/services/organization-profile.service";
import type {
  OrganizationProfile,
  UpdateOrganizationProfileInput,
} from "@/types/organization-profile";

type OrganizationProfileCacheEntry = {
  organizationId: string;
  profile: OrganizationProfile;
};

const organizationProfileCache = new Map<string, OrganizationProfileCacheEntry>();
const organizationProfilePromiseCache = new Map<string, Promise<OrganizationProfile>>();
const ORGANIZATION_PROFILE_STORAGE_PREFIX = "vidrios-saas:organization-profile:";

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

export function useOrganizationProfile() {
  const { organizacionId, cargando } = useAuth();
  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const activeRefreshIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const lastOrganizationIdRef = useRef<string | null>(null);
  const bootRetryCountRef = useRef(0);
  const bootRetryTimeoutRef = useRef<number | null>(null);

  const refreshProfile = useCallback(async () => {
    const refreshId = ++activeRefreshIdRef.current;
    const organizationKey = getOrganizationKey(organizacionId);

    if (!organizacionId) {
      if (!isMountedRef.current || refreshId !== activeRefreshIdRef.current) {
        return null;
      }

      setProfile(null);
      setIsReady(true);
      return null;
    }

    let profilePromise = organizationProfilePromiseCache.get(organizationKey!);

    if (!profilePromise) {
      profilePromise = organizationProfileService
        .getByOrganizationId(organizacionId)
        .finally(() => {
          organizationProfilePromiseCache.delete(organizationKey!);
        });

      organizationProfilePromiseCache.set(organizationKey!, profilePromise);
    }

    const nextProfile = await profilePromise;
    const hasWarmCache =
      nextProfile !== null || organizationProfileCache.has(organizationKey!);

    if (!isMountedRef.current || refreshId !== activeRefreshIdRef.current) {
      return nextProfile;
    }

    setProfile(nextProfile);
    organizationProfileCache.set(organizationKey!, {
      organizationId: organizationKey!,
      profile: nextProfile,
    });
    persistOrganizationProfile(organizationKey!, nextProfile);
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
        void refreshProfile();
      }, 500);
    }

    return nextProfile;
  }, [organizacionId]);

  useEffect(() => {
    const organizationKey = getOrganizationKey(organizacionId);

    if (lastOrganizationIdRef.current !== organizationKey) {
      lastOrganizationIdRef.current = organizationKey;
      bootRetryCountRef.current = 0;
      if (bootRetryTimeoutRef.current !== null && typeof window !== "undefined") {
        window.clearTimeout(bootRetryTimeoutRef.current);
        bootRetryTimeoutRef.current = null;
      }
      setProfile(null);
      setIsReady(false);
    }

    if (cargando) {
      return;
    }

    if (!organizacionId) {
      setProfile(null);
      setIsReady(true);
      return;
    }

    const cached = organizationProfileCache.get(String(organizacionId));

    if (cached) {
      setProfile(cached.profile);
      setIsReady(true);
    } else {
      const persisted = readOrganizationProfileFromStorage(organizationKey!);

      if (persisted) {
        setProfile(persisted);
        organizationProfileCache.set(organizationKey!, {
          organizationId: organizationKey!,
          profile: persisted,
        });
        setIsReady(true);
      } else {
        setProfile(null);
        setIsReady(false);
      }
    }

    void refreshProfile();
  }, [cargando, organizacionId, refreshProfile]);

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

  return {
    profile,
    isReady,
    isSaving,
    isUploading,
    refreshProfile,
    saveProfile,
    uploadLogo,
  };
}
