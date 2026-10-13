import { useEffect, useState, useSyncExternalStore } from "react";
import { demoStore } from "./services/mock";
export function useDemo() {
  return useSyncExternalStore(demoStore.subscribe, demoStore.getSnapshot);
}
export function useDemoClock() {
  useEffect(() => {
    const timer = setInterval(() => demoStore.sync(), 1000);
    return () => clearInterval(timer);
  }, []);
}
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  async function run<T>(fn: () => Promise<T>, message = "") {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const value = await fn();
      setSuccess(message);
      return value;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong. Please retry.",
      );
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, success, run, setError, setSuccess };
}

export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
