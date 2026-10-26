import { useEffect } from "react";
import { WEATHER_REFRESH_MINUTES } from "@/lib/config";
import { useSimulation } from "@/store/simulationStore";

/** Drives the simulated clock. Real interval = 3000ms / speed. Mount once. */
export function useSimulationLoop() {
  const speed = useSimulation((s) => s.speed);
  const running = useSimulation((s) => s.running);

  useEffect(() => {
    if (useSimulation.getState().weatherLastFetchedMs === null) useSimulation.getState().refreshWeather();
    const id = setInterval(() => useSimulation.getState().refreshWeather(), WEATHER_REFRESH_MINUTES * 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => useSimulation.getState().tick(), 3000 / speed);
    return () => clearInterval(id);
  }, [speed, running]);
}
