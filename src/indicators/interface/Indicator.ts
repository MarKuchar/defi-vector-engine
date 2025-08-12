export interface Indicator {
  name: string;
  update(value: number): void;
  isReady(): boolean;
  getSnapshot(): Record<string, number | null>;
  reset(): void;
}