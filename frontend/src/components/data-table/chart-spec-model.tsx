/* Copyright 2024 Marimo. All rights reserved. */

import { mint, orange, slate } from "@radix-ui/colors";
import type { TopLevelSpec } from "vega-lite";
// @ts-expect-error vega-typings does not include formats
import { formats } from "vega-loader";
import { asRemoteURL } from "@/core/runtime/config";
import type { TopLevelFacetedUnitSpec } from "@/plugins/impl/data-explorer/queries/types";
import { arrow } from "@/plugins/impl/vega/formats";
import { parseCsvData } from "@/plugins/impl/vega/loader";
import { logNever } from "@/utils/assertNever";
import {
  byteStringToBinary,
  extractBase64FromDataURL,
  isDataURLString,
  typedAtob,
} from "@/utils/json/base64";
import type {
  BinValues,
  ColumnHeaderStats,
  ColumnName,
  FieldTypes,
} from "./types";

// We rely on vega's built-in binning to determine bar widths.
const MAX_BAR_HEIGHT = 20; // px

// Arrow formats have a magic number at the beginning of the file.
const ARROW_MAGIC_NUMBER = "ARROW1";

// register arrow reader under type 'arrow'
formats("arrow", arrow);

export class ColumnChartSpecModel<T> {
  private columnStats = new Map<ColumnName, ColumnHeaderStats>();
  private columnBinValues = new Map<ColumnName, BinValues>();

  public static readonly EMPTY = new ColumnChartSpecModel(
    [],
    {},
    {},
    {},
    {
      includeCharts: false,
      usePreComputedValues: false,
    },
  );

  private dataSpec: TopLevelSpec["data"];
  private sourceName: "data_0" | "source_0";

  constructor(
    private readonly data: T[] | string,
    private readonly fieldTypes: FieldTypes,
    readonly stats: Record<ColumnName, ColumnHeaderStats>,
    readonly binValues: Record<ColumnName, BinValues>,
    private readonly opts: {
      includeCharts: boolean;
      usePreComputedValues?: boolean;
    },
  ) {
    // Data may come in from a few different sources:
    // - A URL
    // - A CSV data URI (e.g. "data:text/csv;base64,...")
    // - A CSV string (e.g. "a,b,c\n1,2,3\n4,5,6")
    // - An array of objects
    // For each case, we need to set up the data spec and source name appropriately.
    // If its a file, the source name will be "source_0", otherwise it will be "data_0".
    // We have a few snapshot tests to ensure that the spec is correct for each case.
    if (typeof this.data === "string") {
      if (this.data.startsWith("./@file") || this.data.startsWith("/@file")) {
        this.dataSpec = { url: asRemoteURL(this.data).href };
        this.sourceName = "source_0";
      } else if (isDataURLString(this.data)) {
        this.sourceName = "data_0";
        const base64 = extractBase64FromDataURL(this.data);
        const decoded = typedAtob(base64);

        if (decoded.startsWith(ARROW_MAGIC_NUMBER)) {
          this.dataSpec = {
            values: byteStringToBinary(decoded),
            // @ts-expect-error vega-typings does not include arrow format
            format: { type: "arrow" },
          };
        } else {
          // Assume it's a CSV string
          this.parseCsv(decoded);
        }
      } else {
        // Assume it's a CSV string
        this.parseCsv(this.data);
        this.sourceName = "data_0";
      }
    } else {
      this.dataSpec = { values: this.data };
      this.sourceName = "source_0";
    }

    this.columnBinValues = new Map(Object.entries(binValues));
    this.columnStats = new Map(Object.entries(stats));
  }

  public getColumnStats(column: string) {
    return this.columnStats.get(column);
  }

  public getHeaderSummary(column: string) {
    return {
      stats: this.columnStats.get(column),
      type: this.fieldTypes[column],
      spec: this.opts.includeCharts ? this.getVegaSpec(column) : undefined,
    };
  }

  private parseCsv(data: string) {
    this.dataSpec = {
      values: parseCsvData(data) as T[],
    };
  }

  private getVegaSpec(column: string): TopLevelFacetedUnitSpec | null {
    if (!this.data) {
      return null;
    }

    const usePreComputedValues = this.opts.usePreComputedValues;
    const binValues = this.columnBinValues.get(column);
    const hasBinValues = binValues && binValues.length > 0;

    const base: TopLevelFacetedUnitSpec = {
      data:
        hasBinValues && usePreComputedValues
          ? { values: binValues }
          : (this.dataSpec as TopLevelFacetedUnitSpec["data"]),
      background: "transparent",
      config: {
        view: {
          stroke: "transparent",
        },
        axis: {
          domain: false,
        },
      },
      height: 100,
    } as TopLevelFacetedUnitSpec;
    const type = this.fieldTypes[column];

    // https://github.com/vega/altair/blob/32990a597af7c09586904f40b3f5e6787f752fa5/doc/user_guide/encodings/index.rst#escaping-special-characters-in-column-names
    // escape periods in column names
    column = column.replaceAll(".", "\\.");
    // escape brackets in column names
    column = column.replaceAll("[", "\\[").replaceAll("]", "\\]");
    // escape colons in column names
    column = column.replaceAll(":", "\\:");

    const scale = this.getScale();

    switch (type) {
      case "date":
      case "datetime":
      case "time": {
        const format =
          type === "date"
            ? "%Y-%m-%d"
            : type === "time"
              ? "%H:%M:%S"
              : "%Y-%m-%dT%H:%M:%S";

        return {
          ...base,
          // Two layers: one with the visible bars, and one with invisible bars
          // that provide a larger tooltip area.
          // @ts-expect-error 'layer' property not in TopLevelFacetedUnitSpec
          layer: [
            {
              mark: {
                type: "bar",
                color: mint.mint11,
              },
              encoding: {
                x: {
                  field: column,
                  type: "temporal",
                  axis: null,
                  bin: true,
                  scale: scale,
                },
                y: { aggregate: "count", type: "quantitative", axis: null },
                // Color nulls
                color: {
                  condition: {
                    test: `datum["bin_maxbins_10_${column}_range"] === "null"`,
                    value: orange.orange11,
                  },
                  value: mint.mint11,
                },
              },
            },

            // 0 opacity full-height bars with tooltips, since it is too hard to trigger
            // the tooltip for very small bars.
            {
              mark: {
                type: "bar",
                opacity: 0,
              },
              encoding: {
                x: {
                  field: column,
                  type: "temporal",
                  axis: null,
                  bin: true,
                  scale: scale,
                },
                y: { aggregate: "max", type: "quantitative", axis: null },
                tooltip: [
                  {
                    // Can also use column, but this is more explicit
                    field: `bin_maxbins_10_${column}`,
                    type: "temporal",
                    format: format,
                    bin: { binned: true },
                    title: `${column} (start)`,
                  },
                  {
                    field: `bin_maxbins_10_${column}_end`,
                    type: "temporal",
                    format: format,
                    bin: { binned: true },
                    title: `${column} (end)`,
                  },
                  {
                    aggregate: "count",
                    type: "quantitative",
                    title: "Count",
                    format: ",d",
                  },
                ],
                // Color nulls
                color: {
                  condition: {
                    test: `datum["bin_maxbins_10_${column}_range"] === "null"`,
                    value: orange.orange11,
                  },
                  value: mint.mint11,
                },
              },
            },
          ],
        };
      }
      case "integer":
      case "number": {
        // Create a histogram spec that properly handles null values
        const format = type === "integer" ? ",d" : ".2f";

        if (!usePreComputedValues || !hasBinValues) {
          return getLegacyNumericSpec(column, format, base);
        }

        const stats = this.columnStats.get(column);

        return {
          ...base, // Assuming base contains shared configurations
          // Two layers: one with the visible bars, and one with invisible bars
          // that provide a larger tooltip area.
          // @ts-expect-error 'layer' property not in TopLevelFacetedUnitSpec
          layer: [
            {
              mark: {
                type: "bar",
                color: mint.mint11,
                stroke: mint.mint11,
                strokeWidth: 0,
              },
              params: [
                {
                  name: "hover",
                  select: {
                    type: "point",
                    on: "mouseover",
                  },
                },
              ],
              encoding: {
                x: {
                  field: "bin_start",
                  type: "quantitative",
                  bin: { binned: true, step: 2 },
                },
                x2: {
                  field: "bin_end",
                  axis: null,
                },
                y: {
                  field: "count",
                  type: "quantitative",
                  axis: null,
                },
                strokeWidth: {
                  condition: {
                    param: "hover",
                    empty: false,
                    value: 0.5,
                  },
                  value: 0,
                },
              },
            },

            // Tooltip layer
            {
              mark: {
                type: "bar",
                opacity: 0,
              },
              encoding: {
                x: {
                  field: "bin_start",
                  type: "quantitative",
                  bin: { binned: true, step: 2 },
                  axis: {
                    title: null,
                    labelFontSize: 8.5,
                    labelOpacity: 0.5,
                    labelExpr:
                      "(datum.value >= 10000 || datum.value <= -10000) ? format(datum.value, '.2e') : format(datum.value, '.2~f')",
                    // TODO: Tick count provides a better UI, but it did not work
                    values: [
                      stats?.min,
                      stats?.p25,
                      stats?.median,
                      stats?.p75,
                      stats?.p95,
                      stats?.max,
                    ].filter((value): value is number => value !== undefined),
                  },
                },
                x2: {
                  field: "bin_end",
                },
                y: {
                  aggregate: "max",
                  type: "quantitative",
                  axis: null,
                },
                tooltip: [
                  {
                    field: "bin_range",
                    type: "nominal",
                    title: column,
                  },
                  {
                    field: "count",
                    type: "quantitative",
                    title: "Count",
                    format: ",d",
                  },
                ],
              },
              transform: [
                {
                  calculate: `format(datum.bin_start, '${format}') + ' - ' + format(datum.bin_end, '${format}')`,
                  as: "bin_range",
                },
              ],
            },
          ],
        };
      }
      case "boolean":
        return {
          ...base,
          mark: { type: "bar", color: mint.mint11 },
          encoding: {
            y: {
              field: column,
              type: "nominal",
              axis: {
                labelExpr:
                  "datum.label === 'true' || datum.label === 'True'  ? 'True' : 'False'",
                tickWidth: 0,
                title: null,
                labelColor: slate.slate9,
              },
            },
            x: {
              aggregate: "count",
              type: "quantitative",
              axis: null,
              scale: { type: "linear" },
            },
            tooltip: [
              { field: column, type: "nominal", title: "Value" },
              {
                aggregate: "count",
                type: "quantitative",
                title: "Count",
                format: ",d",
              },
            ],
          },
          layer: [
            {
              mark: {
                type: "bar",
                color: mint.mint11,
                height: MAX_BAR_HEIGHT,
              },
            },
            {
              mark: {
                type: "text",
                align: "left",
                baseline: "middle",
                dx: 3,
                color: slate.slate9,
              },
              encoding: {
                text: {
                  aggregate: "count",
                  type: "quantitative",
                },
              },
            },
          ],
        } as TopLevelFacetedUnitSpec; // "layer" not in TopLevelFacetedUnitSpec
      case "unknown":
      case "string":
        return null;
      default:
        logNever(type);
        return null;
    }
  }

  private getScale() {
    return {
      align: 0,
      paddingInner: 0,
      paddingOuter: {
        expr: `length(data('${this.sourceName}')) == 2 ? 1 : length(data('${this.sourceName}')) == 3 ? 0.5 : length(data('${this.sourceName}')) == 4 ? 0 : 0`,
      },
    };
  }
}

function getLegacyNumericSpec(
  column: string,
  format: string,
  base: TopLevelFacetedUnitSpec,
): TopLevelFacetedUnitSpec {
  return {
    ...base, // Assuming base contains shared configurations
    // Two layers: one with the visible bars, and one with invisible bars
    // that provide a larger tooltip area.
    // @ts-expect-error 'layer' property not in TopLevelFacetedUnitSpec
    layer: [
      {
        mark: {
          type: "bar",
          color: mint.mint11,
        },
        encoding: {
          x: {
            field: column,
            type: "quantitative",
            bin: true,
          },
          y: {
            aggregate: "count",
            type: "quantitative",
            axis: null,
          },
        },
      },

      // Tooltip layer
      {
        mark: {
          type: "bar",
          opacity: 0,
        },
        encoding: {
          x: {
            field: column,
            type: "quantitative",
            bin: true,
            axis: {
              title: null,
              labelFontSize: 8.5,
              labelOpacity: 0.5,
              labelExpr:
                "(datum.value >= 10000 || datum.value <= -10000) ? format(datum.value, '.2e') : format(datum.value, '.2~f')",
            },
          },
          y: {
            aggregate: "max",
            type: "quantitative",
            axis: null,
          },
          tooltip: [
            {
              field: column,
              type: "quantitative",
              bin: true,
              title: column,
              format: format,
            },
            {
              aggregate: "count",
              type: "quantitative",
              title: "Count",
              format: ",d",
            },
          ],
        },
      },
    ],
  };
}
