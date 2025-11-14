import { useEffect, useMemo } from "react";
import { useCustomization } from "../lib/stores/useCustomization";
import { composeLoadoutHash, type FighterLoadoutSnapshot, type LoadoutSyncEnvelope } from "@shared/customization";

const SYNC_DEBOUNCE_MS = 1500;

export function useEconomySync() {
  const profileId = useCustomization((state) => state.economyProfileId);
  const coins = useCustomization((state) => state.coins);
  const lifetimeCoins = useCustomization((state) => state.lifetimeCoinsEarned);
  const playerColorTheme = useCustomization((state) => state.playerColorTheme);
  const playerFigureStyle = useCustomization((state) => state.playerFigureStyle);
  const playerBlendTargetStyle = useCustomization((state) => state.playerBlendTargetStyle);
  const playerBlendAmount = useCustomization((state) => state.playerBlendAmount);
  const playerStyleOverrides = useCustomization((state) => state.playerStyleOverrides);
  const playerAccessory = useCustomization((state) => state.playerAccessory);
  const playerAccessoryColor = useCustomization((state) => state.playerAccessoryColor);
  const playerAnimationStyle = useCustomization((state) => state.playerAnimationStyle);
  const playerInkStyle = useCustomization((state) => state.playerInkStyle);
  const playerInkOverrides = useCustomization((state) => state.playerInkOverrides);
  const cpuColorTheme = useCustomization((state) => state.cpuColorTheme);
  const cpuFigureStyle = useCustomization((state) => state.cpuFigureStyle);
  const cpuBlendTargetStyle = useCustomization((state) => state.cpuBlendTargetStyle);
  const cpuBlendAmount = useCustomization((state) => state.cpuBlendAmount);
  const cpuStyleOverrides = useCustomization((state) => state.cpuStyleOverrides);
  const cpuAccessory = useCustomization((state) => state.cpuAccessory);
  const cpuAccessoryColor = useCustomization((state) => state.cpuAccessoryColor);
  const cpuAnimationStyle = useCustomization((state) => state.cpuAnimationStyle);
  const cpuInkStyle = useCustomization((state) => state.cpuInkStyle);
  const cpuInkOverrides = useCustomization((state) => state.cpuInkOverrides);
  const colorThemes = useCustomization((state) => state.unlockedColorThemes);
  const figureStyles = useCustomization((state) => state.unlockedFigureStyles);
  const accessories = useCustomization((state) => state.unlockedAccessories);
  const animationStyles = useCustomization((state) => state.unlockedAnimationStyles);
  const lastCoinEvent = useCustomization((state) => state.lastCoinEvent);
  const hydrateEconomySnapshot = useCustomization((state) => state.hydrateEconomySnapshot);
  const setEconomySyncError = useCustomization((state) => state.setEconomySyncError);
  const markEconomySyncComplete = useCustomization((state) => state.markEconomySyncComplete);
  
  const playerLoadout = useMemo<FighterLoadoutSnapshot>(
    () => ({
      colorTheme: playerColorTheme,
      figureStyle: playerFigureStyle,
      figureBlendTargetStyle: playerBlendTargetStyle ?? null,
      figureBlendAmount: playerBlendAmount,
      figureStyleOverrides: playerStyleOverrides ?? null,
      accessory: playerAccessory,
      accessoryColor: playerAccessoryColor,
      animationStyle: playerAnimationStyle,
      inkStyle: playerInkStyle,
      inkOverrides: playerInkOverrides ?? null,
    }),
    [
      playerColorTheme,
      playerFigureStyle,
      playerBlendTargetStyle,
      playerBlendAmount,
      playerStyleOverrides,
      playerAccessory,
      playerAccessoryColor,
      playerAnimationStyle,
      playerInkStyle,
      playerInkOverrides,
    ],
  );
  const cpuLoadout = useMemo<FighterLoadoutSnapshot>(
    () => ({
      colorTheme: cpuColorTheme,
      figureStyle: cpuFigureStyle,
      figureBlendTargetStyle: cpuBlendTargetStyle ?? null,
      figureBlendAmount: cpuBlendAmount,
      figureStyleOverrides: cpuStyleOverrides ?? null,
      accessory: cpuAccessory,
      accessoryColor: cpuAccessoryColor,
      animationStyle: cpuAnimationStyle,
      inkStyle: cpuInkStyle,
      inkOverrides: cpuInkOverrides ?? null,
    }),
    [
      cpuColorTheme,
      cpuFigureStyle,
      cpuBlendTargetStyle,
      cpuBlendAmount,
      cpuStyleOverrides,
      cpuAccessory,
      cpuAccessoryColor,
      cpuAnimationStyle,
      cpuInkStyle,
      cpuInkOverrides,
    ],
  );
  const loadoutEnvelope = useMemo<LoadoutSyncEnvelope>(
    () => ({
      player: playerLoadout,
      opponent: cpuLoadout,
      hash: composeLoadoutHash(playerLoadout, cpuLoadout),
    }),
    [playerLoadout, cpuLoadout],
  );
  
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
    loadouts: loadoutEnvelope,
  }), [
    profileId,
    coins,
    lifetimeCoins,
    colorThemes,
    figureStyles,
    accessories,
    animationStyles,
    lastCoinEvent,
    loadoutEnvelope,
  ]);

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
      snapshot.unlocks.accessories,
      snapshot.unlocks.animationStyles,
      snapshot.unlocks.colorThemes,
      snapshot.unlocks.figureStyles,
      snapshot.lastCoinEvent?.timestamp,
      loadoutEnvelope.hash,
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
