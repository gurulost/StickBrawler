import { useEffect, useMemo } from "react";
import { useCustomization } from "../lib/stores/useCustomization";
import { composeLoadoutHash, type LoadoutSyncEnvelope } from "@shared/customization";

const SYNC_DEBOUNCE_MS = 1500;

export function useEconomySync() {
  // Get stable function references from store
  const getEconomySnapshot = useCustomization((state) => state.getEconomySnapshot);
  const getPlayerLoadout = useCustomization((state) => state.getPlayerLoadout);
  const getCPULoadout = useCustomization((state) => state.getCPULoadout);
  const hydrateEconomySnapshot = useCustomization((state) => state.hydrateEconomySnapshot);
  const setEconomySyncError = useCustomization((state) => state.setEconomySyncError);
  const markEconomySyncComplete = useCustomization((state) => state.markEconomySyncComplete);
  
  // Get snapshot data - this returns a stable object
  const snapshot = getEconomySnapshot();
  
  // Build loadout envelope for sync
  const loadoutEnvelope = useMemo<LoadoutSyncEnvelope>(() => {
    const player = getPlayerLoadout();
    const cpu = getCPULoadout();
    return {
      player,
      opponent: cpu,
      hash: composeLoadoutHash(player, cpu),
    };
  }, [getPlayerLoadout, getCPULoadout]);

  // Initial fetch effect
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
          loadouts: data.loadouts ?? undefined,
        });
        markEconomySyncComplete(data.loadouts ?? undefined);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.warn("[economy-sync] Failed to fetch snapshot", error);
        setEconomySyncError("Unable to reach the economy service. Progress will sync when the connection recovers.");
      }
    })();

    return () => {
      controller.abort();
    };
  }, [snapshot.profileId, hydrateEconomySnapshot, setEconomySyncError, markEconomySyncComplete]);

  // Serialize for change detection
  const serialized = useMemo(
    () =>
      JSON.stringify({
        coins: snapshot.coins,
        lifetimeCoins: snapshot.lifetimeCoins,
        unlocks: snapshot.unlocks,
        lastCoinEventTs: snapshot.lastCoinEvent?.timestamp ?? null,
        loadoutHash: loadoutEnvelope.hash,
      }),
    [
      snapshot.coins,
      snapshot.lifetimeCoins,
      snapshot.unlocks,
      snapshot.lastCoinEvent?.timestamp,
      loadoutEnvelope.hash,
    ],
  );

  // Sync effect
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
              loadouts: loadoutEnvelope,
            }),
            signal: controller.signal,
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error(`Sync failed with status ${response.status}`);
              }
              setEconomySyncError(undefined);
              markEconomySyncComplete(loadoutEnvelope);
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
  }, [snapshot.profileId, serialized, setEconomySyncError, markEconomySyncComplete, loadoutEnvelope]);
}
