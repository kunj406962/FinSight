const DEMO_MODE_KEY = "finsight_demo_mode";

export function isDemoMode(): boolean {
  return sessionStorage.getItem(DEMO_MODE_KEY) === "true";
}

export function enterDemoMode(): void {
  sessionStorage.setItem(DEMO_MODE_KEY, "true");
}

export function exitDemoMode(): void {
  sessionStorage.removeItem(DEMO_MODE_KEY);
}