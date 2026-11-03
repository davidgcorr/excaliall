// Adapted from shadcn/ui's MIT-licensed Table primitives for Excalidraw's CSS theme.
// https://github.com/shadcn-ui/ui
import type { ComponentProps } from "react";

export const Table = (props: ComponentProps<"table">) => (
  <table data-slot="table" {...props} />
);
export const TableHeader = (props: ComponentProps<"thead">) => (
  <thead data-slot="table-header" {...props} />
);
export const TableBody = (props: ComponentProps<"tbody">) => (
  <tbody data-slot="table-body" {...props} />
);
export const TableRow = (props: ComponentProps<"tr">) => (
  <tr data-slot="table-row" {...props} />
);
export const TableHead = (props: ComponentProps<"th">) => (
  <th data-slot="table-head" {...props} />
);
export const TableCell = (props: ComponentProps<"td">) => (
  <td data-slot="table-cell" {...props} />
);
