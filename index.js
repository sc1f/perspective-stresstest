const fs = require("fs-extra");
const path = require("path");
const minimist = require("minimist");
const driver = require("./driver");
const viewer_test = require("./viewer_test").viewer_test;

(async () => {
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

    const URL = args.url || "https://perspective-stresstest.herokuapp.com/";
    const NUM_INSTANCES = 1 || args.instances;
    const NUM_ITERATIONS = 5 || args.iterations;

    let instance_count = 0;
    let iteration_count = 0;
    let full_results = [];

    const run_instance = () => {
        if (instance_count == NUM_INSTANCES) return;
        run_iteration();
        instance_count++;
    };

    const run_iteration = () => {
        const promises = [];
        const instance_name = `instance_${instance_count}`;

        for (let i = 0; i < NUM_ITERATIONS; i++) {
            const viewer_name = `viewer_${i}`;
            driver.make_screenshot_folder(`${instance_name}_${viewer_name}`);
            promises.push(driver.run(URL, viewer_test, instance_name, viewer_name));
        }

        iteration_count = 0;

        Promise.all(promises).then(results => {
            console.log(results);
            for (const r of results) {
                full_results = full_results.concat(r);
            }

            fs.writeFileSync(
                path.join(__dirname, "results.json"),
                JSON.stringify(full_results)
            );
        });
    };

    run_instance();
})();
