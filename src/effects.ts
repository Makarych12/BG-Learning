import { useSyncExternalStore } from 'react';
import { currentRuntimeProfile } from './performance';

export function modestHardware(device: {deviceMemory?: number; hardwareConcurrency?: number}) {
 return (device.deviceMemory !== undefined && device.deviceMemory <= 4)
  || (device.hardwareConcurrency !== undefined && device.hardwareConcurrency > 0 && device.hardwareConcurrency <= 4);
}
function economySnapshot() {
 const profile = currentRuntimeProfile();
 return modestHardware(navigator) || !!(profile && profile.frames >= 30 && (profile.observedFps < 40 || profile.p95FrameMs > 45));
}
function subscribe(listener: () => void) {
 window.addEventListener('chameleon-profile', listener);
 return () => window.removeEventListener('chameleon-profile', listener);
}
/** One measured policy for CSS, Motion, GSAP and the audio visualizer. */
export function useEconomyEffects() {
 return useSyncExternalStore(subscribe, economySnapshot, () => false);
}
