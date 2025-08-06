export interface Indicator {
  name: string;
  update(value: number): void;
  getValue(): number | null;
  reset(): void;
}