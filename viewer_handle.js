/**
 * A thin wrapper around the `perspective-viewer` API.
 *
 * All member methods are async, and return a `Promise<ElementHandle>` that
 * signifies completion of the requested operation.
 */
exports.ViewerHandle = class ViewerHandle {
    constructor(element, page, instance_name, viewer_name) {
        this._instance_name = instance_name || Math.random() + "";
        this._viewer_name = viewer_name || Math.random() + "";
        this._element = element;
        this._page = page;
    }

    viewer_name() {
        return this._viewer_name;
    }

    instance_name() {
        return this._instance_name;
    }

    async load(data) {
        await this._element.evaluate(
            async (viewer, data) => await viewer.load(data),
            data
        );
        return this.wait();
    }

    async restore(config) {
        await this._element.evaluate(
            async (viewer, config) => await viewer.restore(config),
            config
        );
        return this.wait();
    }

    async reset() {
        await this._element.evaluate(async viewer => await viewer.reset());
        return this.wait();
    }

    async toggle_config() {
        await this._element.evaluate(
            async viewer => await viewer.toggleConfig()
        );
        return this.wait();
    }

    async getAttribute(attribute) {
        await this._element.evaluate(
            (viewer, attribute) => viewer.getAttribute(attribute),
            attribute
        );
        return this.wait();
    }

    async setAttribute(attribute, value) {
        if (typeof value !== "string") {
            value = JSON.stringify(value);
        }
        await this._element.evaluate(
            (viewer, attr, val) => viewer.setAttribute(attr, val),
            attribute,
            value
        );
        return this.wait();
    }

    async screenshot(name) {
        await this._page.screenshot({
            type: "png",
            path: `./screenshots/${this._instance_name}_${this._viewer_name}/${name}.png`
        });
    }

    /**
     * After an operation is requested, awaits completion by observing
     * `perspective-viewer`'s `updating` attribute.
     */
    wait() {
        return this._page.waitForSelector("perspective-viewer:not([updating])");
    }
}