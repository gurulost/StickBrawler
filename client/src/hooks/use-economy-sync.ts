import { useEffect, useMemo } from "react";
import { useCustomization } from "../lib/stores/useCustomization";

const SYNC_DEBOUNCE_MS = 1500;

export function useEconomySync() {
  const profileId = useCustomization((state) => state.economyProfileId);
  const coins = useCustomization((state) => state.coins);
  const lifetimeCoins = useCustomization((state) => state.lifetimeCoinsEarned);
  const colorThemes = useCustomization((state) => state.unlockedColorThemes);
  const figureStyles = useCustomization((state) => state.unlockedFigureStyles);
  const accessories = useCustomization((state) => state.unlockedAccessories);
  const animationStyles = useCustomization((state) => state.unlockedAnimationStyles);
  const lastCoinEvent = useCustomization((state) => state.lastCoinEvent);
  const hydrateEconomySnapshot = useCustomization((state) => state.hydrateEconomySnapshot);
  const setEconomySyncError = useCustomization((state) => state.setEconomySyncError);
  const markEconomySyncComplete = useCustomization((state) => state.markEconomySyncComplete);
  
  const snapshot = useMemo(() => ({
    profileId,
    coins,
    lifetimeCoins,
    unlocks: {
      colorThemes,
      figureStyles,
      accessories,
      animationStyles,
    },
    lastCoinEvent,
  }), [profileId, coins, lifetimeCoins, colorThemes, figureStyles, accessories, animationStyles, lastCoinEvent]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(`/api/economy/${snapshot.profileId}`, {
          signal: controller.signal,
        });
        if (response.status === 404) {
          setEconomySyncError(undefined);
          return;
        }
        if (!response.ok) {
          throw new Error(`Failed with status ${response.status}`);
        }
        const data = await response.json();
        hydrateEconomySnapshot({
          profileId: data.profileId ?? snapshot.profileId,
          coins: data.coins ?? snapshot.coins,
          lifetimeCoins: data.lifetimeCoins ?? snapshot.lifetimeCoins,
          unlocks: {
            colorThemes: data.unlocks?.colorThemes ?? [],
            figureStyles: data.unlocks?.figureStyles ?? [],
            accessories: data.unlocks?.accessories ?? [],
            animationStyles: data.unlocks?.animationStyles ?? [],
          },
          lastCoinEvent: data.lastCoinEvent ?? undefined,
          updatedAt: data.updatedAt,
        });
        markEconomySyncComplete();
      } catch (error) {
        if (controller.signal.aborted) return;
        console.warn("[economy-sync] Failed to fetch snapshot", error);
        setEconomySyncError("Unable to reach the economy service. Progress will sync when the connection recovers.");
      }
    })();

    return () => {
      controller.abort();
    };
  }, [snapshot.profileId, hydrateEconomySnapshot, setEconomySyncError]);

  const serialized = useMemo(
    () =>
      JSON.stringify({
        coins: snapshot.coins,
        lifetimeCoins: snapshot.lifetimeCoins,
        unlocks: snapshot.unlocks,
        lastCoinEventTs: snapshot.lastCoinEvent?.timestamp ?? null,
      }),
    [
      snapshot.coins,
      snapshot.lifetimeCoins,
      snapshot.unlocks.accessories,
      snapshot.unlocks.animationStyles,
      snapshot.unlocks.colorThemes,
      snapshot.unlocks.figureStyles,
      snapshot.lastCoinEvent?.timestamp,
    ],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      fetch("/api/economy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: snapshot.profileId,
          coins: snapshot.coins,
          lifetimeCoins: snapshot.lifetimeCoins,
          unlocks: snapshot.unlocks,
          lastCoinEvent: snapshot.lastCoinEvent ?? undefined,
        }),
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Sync failed with status ${response.status}`);
          }
          setEconomySyncError(undefined);
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          console.warn("[economy-sync] Failed to sync economy payload", error);
          setEconomySyncError("Could not upload the latest coin data. Trying again automatically…");
        });
    }, SYNC_DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [snapshot.profileId, serialized, setEconomySyncError, markEconomySyncComplete]);
}
