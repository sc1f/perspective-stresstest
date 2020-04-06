const fs = require("fs-extra");
const path = require("path");
const minimist = require("minimist");
const Driver = require("./driver").Driver;
const make_viewer = require("./viewer_test").make_viewer;
const viewer_test = require("./viewer_test").viewer_test;
const perspective = require("@finos/perspective");

(async () => {
    const to_arrow = async function(table) {
        const arrow = await table.view().to_arrow();
        const name = `results_${Math.random()}.arrow`;
        fs.writeFileSync(path.join(process.cwd(), name), new Buffer(arrow), "binary");
        console.log(`Wrote ${await table.size()} rows to ${name}`);
        return arrow;
    }

    const args = minimist(process.argv.slice(2));

    if (args.h || args.help) {
        console.log(`
            Run a concurrent stress test on a remote URL using Puppeteer.

            Arguments:

            --url - a URL to access
            --instances - the number of tabs that headless chrome will open
            --iterations - the number of times your script will be executed in each tab
        `);
        return;
    }

    let full_results = [];
    const URL = args.url || "https://perspective-stresstest.herokuapp.com/";
    const NUM_INSTANCES = args.instances || 5;
    const NUM_ITERATIONS = args.iterations || 1;

    console.log(`Running ${NUM_INSTANCES} instances for ${NUM_ITERATIONS} iterations against "${URL}"`)

    const results_table = perspective.table({
        "operation number": "integer",
        "completion timestamp": "datetime",
        "instance name": "string",
        "iteration name": "string",
        description: "string",
        "time taken (ms)": "float",
        "success": "string",
        "error": "string"
    });

    const test_driver = new Driver(URL, NUM_INSTANCES, NUM_ITERATIONS);
    Promise.all(await test_driver.run(make_viewer, viewer_test, results_table)).then(async results => {
        await to_arrow(results_table);

        for (const r of results) {
            full_results = full_results.concat(r);
        }
    
        fs.writeFileSync(
            path.join(__dirname, "results.json"),
            JSON.stringify(full_results)
        );
    });
})();
