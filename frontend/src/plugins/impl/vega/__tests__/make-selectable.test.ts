/* Copyright 2024 Marimo. All rights reserved. */
import { describe, expect, it } from "vitest";
import { makeSelectable } from "../make-selectable";
import { getSelectionParamNames } from "../params";
import type { VegaLiteSpec } from "../types";

describe("makeSelectable", () => {
  it("should return correctly if mark is not string", () => {
    const spec = {
      mark: {
        type: "point",
      },
    } as VegaLiteSpec;
    expect(makeSelectable(spec, {})).toMatchSnapshot();
  });

  it("should return correctly if mark is a string", () => {
    const spec = {
      mark: "point",
    } as VegaLiteSpec;
    expect(makeSelectable(spec, {})).toMatchSnapshot();
  });

  it("should return the same spec if selection is false", () => {
    const spec = {
      mark: "point",
    } as VegaLiteSpec;
    const newSpec = makeSelectable(spec, {
      chartSelection: false,
      fieldSelection: false,
    });
    expect(newSpec).toEqual(spec);
    expect(getSelectionParamNames(newSpec)).toEqual([]);
  });

  it("should return the same spec for not-defined and true", () => {
    const spec = {
      mark: "point",
    } as VegaLiteSpec;
    expect(
      makeSelectable(spec, {
        chartSelection: true,
        fieldSelection: true,
      }),
    ).toEqual(makeSelectable(spec, {}));
  });

  it("should return the same spec if mark is not in spec", () => {
    const spec1 = {
      mark: "point",
    } as VegaLiteSpec;
    const spec2 = {
      mark: {
        type: "point",
      },
    } as VegaLiteSpec;
    expect(makeSelectable(spec1, {})).toEqual(makeSelectable(spec2, {}));
  });

  it("should return correctly if overlapping encodings", () => {
    const spec = {
      config: {
        view: {
          continuousHeight: 300,
        },
      },
      data: { url: "data/cars.json" },
      encoding: {
        color: {
          field: "Origin",
          type: "nominal",
        },
        x: {
          field: "Horsepower",
          type: "quantitative",
        },
        y: {
          field: "Miles_per_Gallon",
          type: "quantitative",
        },
      },
      mark: {
        type: "point",
      },
    } as VegaLiteSpec;
    const newSpec = makeSelectable(spec, {
      chartSelection: true,
      fieldSelection: true,
    });
    expect(newSpec).toMatchSnapshot();
    expect(getSelectionParamNames(newSpec)).toEqual([
      "legend_selection_Origin",
      "select_point",
      "select_interval",
      "pan_zoom",
    ]);
  });

  it("should skip field selection if empty or false", () => {
    const spec = {
      config: {
        view: {
          continuousHeight: 300,
        },
      },
      data: { url: "data/cars.json" },
      encoding: {
        color: {
          field: "Origin",
          type: "nominal",
        },
        x: {
          field: "Horsepower",
          type: "quantitative",
        },
        y: {
          field: "Miles_per_Gallon",
          type: "quantitative",
        },
      },
      mark: {
        type: "point",
      },
    } as VegaLiteSpec;

    const newSpec = makeSelectable(spec, {
      chartSelection: true,
      fieldSelection: false,
    });
    expect(newSpec).toMatchSnapshot();
    expect(getSelectionParamNames(newSpec)).toEqual([
      "select_point",
      "select_interval",
      "pan_zoom",
    ]);

    // These are the same
    expect(
      makeSelectable(spec, { chartSelection: true, fieldSelection: false }),
    ).toEqual(
      makeSelectable(spec, { chartSelection: true, fieldSelection: [] }),
    );
  });

  it("should return correctly with multiple encodings", () => {
    const spec = {
      mark: "point",
      encoding: {
        color: {
          field: "colorField",
          type: "nominal",
        },
        size: {
          field: "sizeField",
          type: "quantitative",
        },
      },
    } as VegaLiteSpec;

    const newSpec = makeSelectable(spec, {});
    expect(newSpec).toMatchSnapshot();
    expect(getSelectionParamNames(newSpec)).toEqual([
      "legend_selection_colorField",
      "legend_selection_sizeField",
      "select_point",
      "select_interval",
      "pan_zoom",
    ]);
  });

  it("should return correctly if existing legend selection", () => {
    const spec = {
      config: {
        view: {
          continuousHeight: 300,
        },
      },
      data: {
        url: "https://cdn.jsdelivr.net/npm/vega-datasets@v1.29.0/data/unemployment-across-industries.json",
      },
      encoding: {
        color: {
          field: "series",
          scale: { scheme: "category20b" },
          type: "nominal",
        },
        opacity: {
          condition: { param: "param_1", value: 1 },
          value: 0.2,
        },
        x: {
          axis: { domain: false, format: "%Y", tickSize: 0 },
          field: "date",
          timeUnit: "yearmonth",
          type: "temporal",
        },
        y: {
          aggregate: "sum",
          axis: null,
          field: "count",
          stack: "center",
          type: "quantitative",
        },
      },
      mark: { type: "area" },
      params: [
        {
          bind: "legend",
          name: "param_1",
          select: { fields: ["series"], type: "point" },
        },
      ],
    } as VegaLiteSpec;
    const newSpec = makeSelectable(spec, {});
    expect(newSpec).toMatchSnapshot();
    expect(getSelectionParamNames(newSpec)).toEqual([
      "param_1",
      "select_point",
      "pan_zoom",
    ]);
  });

  it("should work for multi-layered charts", () => {
    const spec = {
      layer: [
        {
          mark: {
            type: "errorbar",
            ticks: true,
          },
          encoding: {
            x: {
              field: "yield_center",
              scale: {
                zero: false,
              },
              title: "yield",
              type: "quantitative",
            },
            xError: {
              field: "yield_error",
            },
            y: {
              field: "variety",
              type: "nominal",
            },
          },
        },
        {
          mark: {
            type: "point",
            color: "black",
            filled: true,
          },
          encoding: {
            x: {
              field: "yield_center",
              type: "quantitative",
            },
          },
        },
      ],
      data: { name: "source" },
      width: "container",
      datasets: {
        source: [
          {
            yield_error: 7.5522,
            yield_center: 32.4,
          },
          {
            yield_error: 6.9775,
            yield_center: 30.966_67,
          },
          {
            yield_error: 3.9167,
            yield_center: 33.966_665,
          },
          {
            yield_error: 11.9732,
            yield_center: 30.45,
          },
        ],
      },
    } as VegaLiteSpec;

    const newSpec = makeSelectable(spec, {
      chartSelection: true,
    });
    expect(newSpec).toMatchSnapshot();

    expect(getSelectionParamNames(newSpec)).toEqual([
      "pan_zoom",
      "select_point_1",
      "select_interval_1",
    ]);
  });

  it("should work for multi-layered charts with different selections", () => {
    const spec = {
      layer: [
        {
          mark: { type: "bar", cornerRadius: 10, height: 10 },
          encoding: {
            x: {
              aggregate: "min",
              field: "temp_min",
              scale: { domain: [-15, 45] },
              title: "Temperature (°C)",
              type: "quantitative",
            },
            x2: { aggregate: "max", field: "temp_max" },
            y: {
              field: "date",
              timeUnit: "month",
              title: null,
              type: "ordinal",
            },
          },
        },
        {
          mark: { type: "text", align: "right", dx: -5 },
          encoding: {
            text: {
              aggregate: "min",
              field: "temp_min",
              type: "quantitative",
            },
            x: { aggregate: "min", field: "temp_min", type: "quantitative" },
            y: { field: "date", timeUnit: "month", type: "ordinal" },
          },
        },
        {
          mark: { type: "text", align: "left", dx: 5 },
          encoding: {
            text: {
              aggregate: "max",
              field: "temp_max",
              type: "quantitative",
            },
            x: { aggregate: "max", field: "temp_max", type: "quantitative" },
            y: { field: "date", timeUnit: "month", type: "ordinal" },
          },
        },
      ],
    } as VegaLiteSpec;

    const newSpec = makeSelectable(spec, {
      chartSelection: true,
    });

    expect(newSpec).toMatchSnapshot();
    expect(getSelectionParamNames(newSpec)).toEqual([
      "select_point_0",
      "select_interval_0",
      "pan_zoom",
      "select_point_1",
      "select_interval_1",
      "select_point_2",
      "select_interval_2",
    ]);
  });

  it("should work for geoshape", () => {
    const spec = {
      mark: "geoshape",
      encoding: {
        color: {
          datum: "red",
          type: "nominal",
        },
        x: {
          field: "x",
          type: "quantitative",
        },
        y: {
          field: "y",
          type: "quantitative",
        },
      },
    } as VegaLiteSpec;
    const newSpec = makeSelectable(spec, {});
    expect(newSpec).toMatchSnapshot();
    expect(getSelectionParamNames(newSpec)).toEqual([]);
  });

  it("should work for layered charts, with existing selection", () => {
    const spec = {
      data: {
        name: "data-34c3e7380bd529c27667c64406db8bb8",
      },
      datasets: {
        "data-34c3e7380bd529c27667c64406db8bb8": [
          {
            Level1: "a",
            count: 1,
            stage: "france",
          },
          {
            Level1: "b",
            count: 2,
            stage: "france",
          },
          {
            Level1: "c",
            count: 3,
            stage: "england",
          },
        ],
      },
      layer: [
        {
          encoding: {
            color: {
              condition: {
                field: "stage",
                param: "param_22",
              },
              value: "lightgray",
            },
            x: {
              field: "Level1",
              sort: {
                order: "descending",
              },
              title: "Subpillar",
              type: "nominal",
            },
            y: {
              field: "count",
              title: "Number of Companies",
              type: "quantitative",
            },
          },
          mark: {
            type: "bar",
          },
          name: "view_21",
        },
        {
          encoding: {
            color: {
              datum: "england",
            },
            y: {
              datum: 2,
            },
          },
          mark: {
            strokeDash: [2, 2],
            type: "rule",
          },
        },
      ],
      params: [
        {
          name: "param_22",
          select: {
            encodings: ["x"],
            type: "point",
          },
          views: ["view_21"],
        },
      ],
    } as VegaLiteSpec;
    const newSpec = makeSelectable(spec, {});
    expect(newSpec).toMatchSnapshot();
    expect(getSelectionParamNames(newSpec)).toMatchInlineSnapshot(`
      [
        "param_22",
      ]
    `);
  });

  it("should work for layered charts, with existing legend selection", () => {
    const spec = {
      data: {
        name: "data-34c3e7380bd529c27667c64406db8bb8",
      },
      datasets: {
        "data-34c3e7380bd529c27667c64406db8bb8": [
          {
            Level1: "a",
            count: 1,
            stage: "france",
          },
          {
            Level1: "b",
            count: 2,
            stage: "france",
          },
          {
            Level1: "c",
            count: 3,
            stage: "england",
          },
        ],
      },
      layer: [
        {
          encoding: {
            color: {
              condition: {
                field: "stage",
                param: "param_22",
              },
              value: "lightgray",
            },
            x: {
              field: "Level1",
              sort: {
                order: "descending",
              },
              title: "Subpillar",
              type: "nominal",
            },
            y: {
              field: "count",
              title: "Number of Companies",
              type: "quantitative",
            },
          },
          mark: {
            type: "bar",
          },
          name: "view_21",
        },
        {
          encoding: {
            color: {
              datum: "england",
            },
            y: {
              datum: 2,
            },
          },
          mark: {
            strokeDash: [2, 2],
            type: "rule",
          },
        },
      ],
      params: [
        {
          name: "param_22",
          bind: "legend",
          select: {
            fields: ["x"],
            type: "point",
          },
          views: ["view_21"],
        },
      ],
    } as VegaLiteSpec;
    const newSpec = makeSelectable(spec, {});
    expect(newSpec).toMatchSnapshot();
    expect(getSelectionParamNames(newSpec)).toMatchInlineSnapshot(`
      [
        "param_22",
      ]
    `);
  });

  it.each(["errorbar", "errorband", "boxplot"])(
    "should return the same spec if mark is %s",
    (mark) => {
      const spec = {
        mark,
      } as unknown as VegaLiteSpec;
      const newSpec = makeSelectable(spec, {});
      expect(newSpec).toEqual(spec);
      expect(getSelectionParamNames(newSpec)).toEqual([]);
    },
  );
});
