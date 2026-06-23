// ============================================================
// engines/index.ts — Barrel export dos motores Titan
// ============================================================
export * from "./ingestion";
export * from "./features";
export * from "./monteCarlo";
export { metropolisHastings, defaultDesirability } from "./mcmc";
export type { DesirabilityFn } from "./mcmc";
