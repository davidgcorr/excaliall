declare module "rough-viz/src/index.js" {
  type ChartConstructor = new (options: Record<string, unknown>) => {
    responsive: boolean;
  };
  export const Bar: ChartConstructor;
  export const BarH: ChartConstructor;
  export const Line: ChartConstructor;
  export const Scatter: ChartConstructor;
  export const Pie: ChartConstructor;
  export const Donut: ChartConstructor;
  export const StackedBar: ChartConstructor;
}
