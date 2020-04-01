const puppeteer = require("puppeteer");
const performance = require("perf_hooks").performance;

CONFIGS = [
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
        columns: ["delta"],
        "computed-columns": ['"close" - "open" as "delta"'],
        plugin: "d3_y_bar"
    },
    {
        "row-pivots": ["last_update"],
        "column-pivots": ["type"],
        columns: ["delta"],
        "computed-columns": ['"close" - "open" as "delta"'],
        plugin: "d3_ohlc",
        filters: [["name", "contains", "Y"]]
    }
];

/**
 * A thin wrapper around the `perspective-viewer` API.
 * 
 * All member methods are async, and return a `Promise<ElementHandle>` that
 * signifies completion of the requested operation.
 */
class viewerHandle {
    constructor(element, page) {
        this._name = Math.random() + "";
        this._element = element;
        this._page = page;
    }

    name() {
        return this._name;
    }

    async load(data) {
        await this._element.evaluate(
            async (viewer, data) => await viewer.load(data), data);
        return this.wait();
    }
    
    async restore(config) {
        await this._element.evaluate(
            async (viewer, config) => await viewer.restore(config), config);
        return this.wait();
    }
    
    async reset() {
        await this._element.evaluate(async viewer => await viewer.reset());
        return this.wait();
    }
    
    async toggle_config() {
        await this._element.evaluate(async viewer => await viewer.toggleConfig());
        return this.wait();
    }

    async getAttribute(attribute) {
        await this._element.evaluate((viewer, attribute) => viewer.getAttribute(attribute), attribute);
        return this.wait();
    }
    
    async setAttribute(attribute, value) {
        if (typeof value !== "string") {
            value = JSON.stringify(value);
        }
        await this._element.evaluate((viewer, attribute, value) => viewer.setAttribute(attribute, value));
        return this.wait();
    }

    async screenshot(name) {
        await this._page.screenshot({
            type: "png",
            path: `./screenshots/${name}.png`
        });
    }

    /**
     * After an operation is requested, awaits completion by observing
     * `perspective-viewer`'s `updating` attribute.
     */
    wait() {
        return this._page.waitForSelector("perspective-viewer:not([updating])");
    };
}

/**
 * Given a viewer context, an async function reference to be called, and
 * arguments for the function, call the function and log its execution time.
 * 
 * @param {String} description
 * @param {*} viewer 
 * @param {*} method 
 * @param  {...any} args 
 */
async function timeit(description, viewer, method, ...args) {
    const start = performance.now();
    await method.call(viewer, ...args);
    const end = performance.now() - start;
    console.log(`Viewer ${viewer.name()} | ${description} | ${end}ms.`)
}

const LOCAL_URL = "http://localhost:5000";
const REMOTE_URL = "https://perspective-stresstest.herokuapp.com/";

(async () => {
    const browser = await puppeteer.launch();

    const page = await browser.newPage();
    await page.setViewport({
        width: 1366,
        height: 768
    });

    await page.goto(REMOTE_URL);

    const _viewer = await page.$("perspective-viewer");
    const viewer = new viewerHandle(_viewer, page);
    await timeit("Load page", viewer, viewer.wait);

    let counter = 0;
    for (const config of CONFIGS) {
        await timeit("Restore config", viewer, viewer.restore, config);
        await viewer.screenshot(`restore_${counter}`);
        counter++;
    }

    await timeit("Reset", viewer, viewer.reset);
    await viewer.screenshot("reset");

    await viewer.setAttribute("sort", [["last_update", "desc"]]);

    await timeit("Add 3 computed columns", viewer, viewer.setAttribute, "computed-columns", ["((pow2('high')) + 'low') / 'open' as 'computed'"]);
    await viewer.screenshot("add_computed_columns");

    await timeit("Set columns", viewer, viewer.setAttribute, "columns", ["computed", "high", "low", "open"]);
    await viewer.screenshot("set_columns");

    await timeit("Set row pivots (deep)", viewer, viewer.setAttribute, "row-pivots", ["exchange", "type", "name"]);
    await viewer.screenshot("set_row_pivots");

    await viewer.setAttribute("row-pivots", []);
    await timeit("Set column pivots (deep)", viewer, viewer.setAttribute, "column-pivots", ["exchange", "type", "name"]);
    await viewer.screenshot("set_column_pivots");

    await viewer.setAttribute("column-pivots", []);
    await timeit("Set filter", viewer, viewer.setAttribute, "filters", [["name", "==", "FB.N"]]);
    await viewer.screenshot("set_filter");

    await timeit("Reset again", viewer, viewer.reset);

    await browser.close();
})();