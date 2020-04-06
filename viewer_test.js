const ViewerHandle = require("./viewer_handle").ViewerHandle;

const random_string = (length) => Math.random().toString(36).substring(2, length);

const _configs = [
    {
        "row-pivots": ["client"],
        "column-pivots": ["exchange"],
        columns: ["high", "low", "open", "close"],
        plugin: "datagrid",
        sort: [["last_update", "desc"]]
    },
    {
        "row-pivots": ["name"],
        "column-pivots": ["type"],
        columns: [],
        "computed-columns": [],
        plugin: "d3_y_bar"
    },
    {
        "row-pivots": ["last_update"],
        "column-pivots": ["type"],
        columns: [],
        "computed-columns": [],
        plugin: "d3_ohlc",
        filters: [["name", "contains", "Y"]]
    }
];

const CONFIGS = {
    get: (idx) => {
        const cfg = _configs[idx];
        
        if (cfg["computed-columns"]) {
            const computed_column_name = random_string(8);
            const computed_column = [`"close" - "open" as "${computed_column_name}"`];
            cfg["computed-columns"] = computed_column;
            cfg["columns"].push(computed_column_name);
        }

        return cfg;
    }
}

exports.make_viewer = async (page, instance_name, viewer_name) => {
    const _viewer = await page.$("perspective-viewer");
    return new ViewerHandle(_viewer, page, instance_name, viewer_name);
}


/**
 * Run a series of operations on a `perspective-viewer`.
 */
exports.viewer_test = async (viewer, timeit) => {
    await timeit("Load page", viewer, viewer.wait);

    let counter = 0;
    for (let i = 0; i < _configs.length; i++) {
        const config = CONFIGS.get(i);
        await timeit(
            `Restore config ${counter}`,
            viewer,
            viewer.restore,
            config
        );
        counter++;
    }

    await timeit("Reset", viewer, viewer.reset);
    await viewer.setAttribute("sort", [["last_update", "desc"]]);

    await timeit(
        "Add 3 numeric computed columns",
        viewer,
        viewer.setAttribute,
        "computed-columns",
        ["((pow2('high')) + 'low') / 'open' as 'computed'"]
    );

    await timeit("Set columns", viewer, viewer.setAttribute, "columns", [
        "computed",
        "high",
        "low",
        "open"
    ]);

    await timeit(
        "Set row pivots (deep)",
        viewer,
        viewer.setAttribute,
        "row-pivots",
        ["exchange", "type", "name"]
    );

    await viewer.setAttribute("row-pivots", []);
    await timeit(
        "Set column pivots (deep)",
        viewer,
        viewer.setAttribute,
        "column-pivots",
        ["exchange", "type", "name"]
    );

    await timeit(
        "Set row and column pivots (deep)",
        viewer,
        viewer.setAttribute,
        "row-pivots",
        ["exchange", "type", "name"]
    );

    await viewer.setAttribute("column-pivots", []);
    await timeit("Set filter", viewer, viewer.setAttribute, "filters", [
        ["name", "==", "FB.N"]
    ]);

    await timeit("Reset again", viewer, viewer.reset);
    await viewer.setAttribute("sort", [["last_update", "desc"]]);

    await timeit(
        "New set of row pivots",
        viewer,
        viewer.setAttribute,
        "row-pivots",
        ["client", "name"]
    );

    await timeit(
        "Add 3 string computed columns",
        viewer,
        viewer.setAttribute,
        "computed-columns",
        [
            "concat_comma('client', 'name') as 'identifier'",
            "uppercase('type')",
            "lowercase('name')"
        ]
    );

    await timeit(
        "Set computed as row pivots",
        viewer,
        viewer.setAttribute,
        "row-pivots",
        ["identifier"]
    );

    await timeit("Final reset", viewer, viewer.reset);
}