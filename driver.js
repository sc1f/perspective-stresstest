const fs = require("fs-extra");
const path = require("path");
const puppeteer = require("puppeteer");
const performance = require("perf_hooks").performance;

const SCREENSHOT_PATH = path.join(__dirname, "screenshots");

exports.make_screenshot_folder = async folder_name => {
    await fs.ensureDir(path.join(SCREENSHOT_PATH, folder_name));
};

/**
 * Given a URL and a callable async function that expects a `page` object
 * and `timeit` function, run and time each operation.
 *
 * @param {*} url
 * @param {*} action
 * @param  {...any} args
 */
exports.run = async (url, action, ...args) => {
    return new Promise(async (resolve, reject) => {
        const results = [];
        const start_all = performance.now();
        let OPERATION_COUNT = 0;

        // Given a viewer and a method, call the method and time its execution.
        const timeit = async (description, viewer, method, ...args) => {
            const start = performance.now();

            try {
                await method.call(viewer, ...args);
            } catch (e) {
                console.error(
                    `${method} failed wth error:`,
                    e,
                    "debug data: ",
                    {
                        "operation number": OPERATION_COUNT,
                        "completion timestamp": Date.now(),
                        "instance name": viewer.instance_name(),
                        "viewer name": viewer.viewer_name(),
                        description: description,
                        "time taken (ms)": performance.now() - start
                    }
                );
            }

            const end = performance.now() - start;
            console.log(
                `${OPERATION_COUNT}: ${viewer.instance_name()} | ${viewer.viewer_name()} | ${description} | ${end}ms`
            );
            await viewer.screenshot(
                `${OPERATION_COUNT}_${description.split(" ").join("_")}`
            );
            OPERATION_COUNT++;
            results.push({
                "operation number": OPERATION_COUNT,
                "completion timestamp": Date.now(),
                "instance name": viewer.instance_name(),
                "viewer name": viewer.viewer_name(),
                description: description,
                "time taken (ms)": end
            });
        };

        const browser = await puppeteer.launch();

        const page = await browser.newPage();
        await page.setViewport({
            width: 1366,
            height: 768
        });

        await page.goto(url);

        // Call the action script
        await action(page, timeit, ...args);

        const end_all = performance.now() - start_all;

        console.log(
            `Performed ${OPERATION_COUNT} operations in ${end_all}ms (${(
                end_all / 1000
            ).toFixed(3)}s).`
        );

        await browser.close();

        resolve(results);
    });
};
