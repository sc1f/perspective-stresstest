const fs = require("fs-extra");
const path = require("path");
const puppeteer = require("puppeteer");
const performance = require("perf_hooks").performance;

const SCREENSHOT_PATH = path.join(__dirname, "screenshots");

exports.Driver = class Driver {
    constructor(url, instances, iterations) {
        this._url = url;

        // The number of puppeteer browsers
        this._instances = instances || 1;

        // How many times the test script runs on the page
        this._iterations = iterations || 5;
    }

    async make_screenshot_folder(folder_name) {
        await fs.ensureDir(path.join(SCREENSHOT_PATH, folder_name));
    };

    /**
     * Open x browser `instance`s and run the `action` for y `iteration`s,
     * calling the `initializer` function for each instance and iteration.
     * 
     * @param {*} initializer a function that returns an object handle that is
     * required by the action script.
     * @param {*} action an async function that receives an object handle and
     * runs a set of tests on it.
     * @param {perspective.table} results_table a Perspective Table that is
     * used to store the serialized results of the test.
     * runs a set of tests on it.
     * @param  {...any} args arguments to be passed through to the `action`
     * function.
     */
    run(initializer, action, results_table, ...args) {
        return new Promise(async (resolve, reject) => {
            const results = [];
            const browsers = [];
    
            for (let i = 0; i < this._instances; i++) {
                const browser = await puppeteer.launch();
                const page = await browser.newPage();
                browsers.push(browser);
    
                await page.setViewport({
                    width: 1024,
                    height: 768
                });
        
                await page.goto(this._url);
    
                results.push(this.run_iterations(page, results_table, initializer, action, i + "", ...args));
            }
            
            await Promise.all(results).then(async () => {
                for (const browser of browsers) {
                    //await browser.close();
                }
                resolve(results);
            }).catch(e => {
                reject(e);
            });
        });
    }
    
    /**
     * Run n `iterations` of the `action` on a page from the browser.
     *
     * @param {*} page
     * @param {*} initializer a function that returns an object handle that is
     * required by the action script.
     * @param {*} action an async function that receives an object handle and
     * runs a set of tests on it.
     * @param {String} instance_name the name of the instance this iteration
     * belongs to.
     * @param  {...any} args arguments to be passed through to the `action`
     * function. 
     */
    run_iterations(page, results_table, initializer, action, instance_name, ...args) {
        return new Promise(async (resolve, reject) => {
            const results = {};
            const table = results_table;

            const start_all = performance.now();
            let OPERATION_COUNT = 0;
    
            // Given a viewer and a method, call the method and time its execution.
            const timeit = async (description, viewer, method, ...args) => {
                const start = performance.now();
                const instance_name = viewer.instance_name();
                const viewer_name = viewer.viewer_name();

                if (!Object.keys(results).includes(instance_name)) {
                    results[instance_name] = {};
                }

                if (!Object.keys(results[instance_name]).includes(viewer_name)) {
                    results[instance_name][viewer_name] = [];
                }

                const viewer_results = results[instance_name][viewer_name];
    
                try {
                    await method.call(viewer, ...args);
                } catch (e) {
                    const debug_data = {
                        "operation number": OPERATION_COUNT,
                        "completion timestamp": Date.now(),
                        "instance name": instance_name,
                        "iteration name": viewer_name,
                        description: description,
                        "time taken (ms)": performance.now() - start,
                        "success": false,
                        "error": JSON.stringify(e)
                    };

                    console.log(
                        `${method} failed with error:`,
                        e,
                        "debug data: ",
                        debug_data
                    );

                    viewer_results.push(debug_data);
                    table.update([debug_data]);
    
                    return;
                }
    
                const end = performance.now() - start;
                console.log(
                    `${OPERATION_COUNT}: ${viewer.instance_name()} | ${viewer.viewer_name()} | ${description} | ${end}ms`
                );
                await viewer.screenshot(
                    `${OPERATION_COUNT}_${description.split(" ").join("_")}`
                );

                OPERATION_COUNT++;

                const result = {
                    "operation number": OPERATION_COUNT,
                    "completion timestamp": Date.now(),
                    "instance name": instance_name,
                    "iteration name": viewer_name,
                    description: description,
                    "time taken (ms)": end,
                    "success": true
                };

                viewer_results.push(result);

                table.update([result]);
            };

            for (let iteration = 0; iteration < this._iterations; iteration++) {
                // Call the action script
                console.log("Calling instance:", instance_name, "iteration:", iteration);
                await this.make_screenshot_folder(instance_name + "_" + iteration);
                const object_handle = await initializer(page, instance_name, iteration + "");
                await action(object_handle, timeit, ...args);
            }
    
            const end_all = performance.now() - start_all;
    
            console.log(
                `Instance ${instance_name} in ${this._iterations} iterations: Performed ${OPERATION_COUNT} operations in ${end_all}ms (${(
                    end_all / 1000
                ).toFixed(3)}s).`
            );
    
            resolve(results);
        });
    }
};
