const nodeSassBaseModule = require('node-sass');
const path = require('path');
const glob = require('glob');
const fs = require('fs-extra');
const sass = require('./index');

const { render, renderSync } = sass;
const SOURCE_DIR = path.resolve(__dirname, 'test-files');
const OUTPUT_DIR = path.resolve(__dirname, 'test-compiled');
const DYNAMIC_OUTPUT_DIR = path.join(OUTPUT_DIR, 'dynamic');

const dataSources = [
    '$color: red; body { color: $color; }',
    '$padding: 10px; body { padding: $padding; }'
];

const testConfig = {
    sourceDir: SOURCE_DIR,
    outputDir: OUTPUT_DIR,
    singleSource: {
        file: path.join(SOURCE_DIR, 'test-scss-1.scss')
    },
    unknownSource: {
        file: path.join(SOURCE_DIR, 'unknown.scss')
    },
    multiSource: {
        file: [
            path.join(SOURCE_DIR, 'test-scss-1.scss'),
            path.join(SOURCE_DIR, 'nested/test-scss-2.scss'),
            path.join(SOURCE_DIR, 'nested/deeper/test-scss-3.scss')
        ]
    },
    globSource: {
        file: path.join(SOURCE_DIR, '**/*.scss')
    },
    multiGlobSource: {
        file: [
            path.join(SOURCE_DIR, '**/*.scss'),
            path.join(SOURCE_DIR, '**/*.sass')
        ]
    },
    dataSource: {
        data: dataSources[0]
    },
    multiDataSource: {
        data: dataSources
    },
    singleOutput: {
        output: path.join(OUTPUT_DIR, 'test.css')
    },
    multiOutput: {
        output: OUTPUT_DIR
    },
    dynamicOutput: {
        output: (sourceFile) =>
            sourceFile.replace(OUTPUT_DIR, DYNAMIC_OUTPUT_DIR)
    },
    dynamicOutputDir: {
        output: () => DYNAMIC_OUTPUT_DIR
    },
    singleOutFile: {
        outFile: path.join(OUTPUT_DIR, 'test.css')
    },
    multiOutFile: {
        outFile: OUTPUT_DIR
    },
    dynamicOutFile: {
        outFile: (sourceFile) =>
            sourceFile.replace(OUTPUT_DIR, DYNAMIC_OUTPUT_DIR)
    },
    dynamicOutFileDir: {
        outFile: () => DYNAMIC_OUTPUT_DIR
    },
    sourceMap: {
        sourceMap: true
    },
    singleSourceMap: {
        sourceMap: path.join(OUTPUT_DIR, 'test.css.map')
    },
    dynamicSourceMap: {
        sourceMap: (sourceFile) =>
            sourceFile.replace(OUTPUT_DIR, DYNAMIC_OUTPUT_DIR)
    }
};

describe('index.js', () => {
    function removeOutputDir() {
        fs.removeSync(testConfig.outputDir);
    }

    function getOutputCSSFiles(sync = false) {
        const matchPath = path.join(testConfig.outputDir, '**/*.css');

        if (sync) {
            return glob.sync(matchPath);
        }

        return new Promise((resolve, reject) => {
            glob(matchPath, (err, files) => {
                if (err) {
                    reject(err);
                }

                resolve(files);
            });
        });
    }

    function getNodeSassResult(sourceFile, sync = false) {
        if (sync) {
            return nodeSassBaseModule.renderSync(sourceFile);
        }

        return new Promise((resolve, reject) => {
            nodeSassBaseModule.render(sourceFile, (err, result) => {
                if (err) {
                    reject(err);
                }

                resolve(result);
            });
        });
    }

    function areAllCompiled(results) {
        let allHaveCSS = true;
        results.forEach(({ css }) => {
            if (!css) {
                allHaveCSS = false;
            }
        });

        return allHaveCSS;
    }

    let originalConsole;

    beforeEach(() => {
        removeOutputDir();
        fs.ensureDirSync(testConfig.outputDir);

        originalConsole = console;
        /* eslint-disable */
        console = {
            log: () => false,
            error: () => false
        };
        /* eslint-enable */
    });

    afterEach(() => {
        console = originalConsole; // eslint-disable-line
    });

    afterAll(removeOutputDir);

    test('is an object', () => {
        expect(typeof sass).toEqual('object');
    });

    //
    // test the top-level API, matching `node-sass`
    //
    test('has a `render` method', () => {
        expect(typeof sass.render).toEqual('function');
    });

    test('has a `renderSync` method', () => {
        expect(typeof sass.renderSync).toEqual('function');
    });

    //
    // test `render` method
    //
    describe('sass.render()', () => {
        test('returns a promise', (done) => {
            render(testConfig.singleSource).then((results) => {
                expect(typeof results).toEqual('object');
                done();
            });
        });

        test('returns a `node-sass` results object for a single source', async () => {
            const { singleSource } = testConfig;
            const nodeSassResult = await getNodeSassResult(singleSource);
            const result = await render(singleSource);

            expect(Object.keys(result)).toEqual(Object.keys(nodeSassResult));
        });

        test('returns an array of `node-sass` results for multiple sources', async () => {
            const { multiSource } = testConfig;
            const results = await render(multiSource);

            await Promise.all(
                results.map(async (result) => {
                    const nodeSassResult = await getNodeSassResult({
                        file: result.stats.entry
                    });

                    expect(Object.keys(result)).toEqual(
                        Object.keys(nodeSassResult)
                    );
                    return result;
                })
            );
        });

        test('accepts a single file source', async () => {
            const results = await render(testConfig.singleSource);
            const css = results.css.toString();

            expect(css.indexOf('test-scss-1_scss')).toBeGreaterThan(-1);
        });

        test('accepts multiple file sources', async () => {
            const results = await render(testConfig.multiSource);
            expect(results.length).toBe(3);
            expect(areAllCompiled(results)).toBe(true);
        });

        test('accepts a single glob source', async () => {
            const results = await render(testConfig.globSource);
            expect(results.length).toBe(4);
            expect(areAllCompiled(results)).toBe(true);
        });

        test('accepts multiple glob sources', async () => {
            const results = await render(testConfig.multiGlobSource);
            expect(results.length).toBe(5);
            expect(areAllCompiled(results)).toBe(true);
        });

        test('exclude files via glob config', async () => {
            const results = await renderSync({
                ...testConfig.globSource,
                globOptions: { ignore: '**/_*' }
            });
            expect(results.length).toBe(3);
            expect(areAllCompiled(results)).toBe(true);
        });

        test('accepts a single Scss/Sass string source', async () => {
            const results = await render(testConfig.dataSource);
            const css = results.css.toString();

            expect(css.indexOf('color: red')).toBeGreaterThan(-1);
        });

        test('accepts multiple Scss/Sass string sources', async () => {
            const results = await render(testConfig.multiDataSource);
            expect(results.length).toBe(2);
            expect(areAllCompiled(results)).toBe(true);
        });

        test('writes a single CSS file to disk', async () => {
            const { singleSource, singleOutput } = testConfig;
            await render({ ...singleSource, ...singleOutput });

            expect(fs.pathExistsSync(singleOutput.output)).toBe(true);
        });

        test('writes multiple CSS files to disk', async () => {
            const { multiSource, multiOutput } = testConfig;
            await render({ ...multiSource, ...multiOutput });

            const renderedFiles = await getOutputCSSFiles();

            expect(renderedFiles.length).toEqual(3);
        });

        test('writes a single Scss/Sass string to disk', async () => {
            const { dataSource, singleOutput } = testConfig;
            await render({ ...dataSource, ...singleOutput });

            expect(fs.pathExistsSync(singleOutput.output)).toBe(true);
        });

        test('allows dynamic output via a function', async () => {
            const { multiSource, dynamicOutput } = testConfig;
            await render({ ...multiSource, ...dynamicOutput });

            const renderedFiles = await getOutputCSSFiles();

            let areAllDynamic = true;
            renderedFiles.forEach((renderedFile) => {
                if (/dynamic/.test(renderedFile) === false) {
                    areAllDynamic = false;
                }
            });

            expect(areAllDynamic).toBe(true);
        });

        test('allows dynamic output to directory via a function', async () => {
            const { multiSource, dynamicOutputDir } = testConfig;
            await render({ ...multiSource, ...dynamicOutputDir });

            const renderedFiles = await getOutputCSSFiles();

            let areAllDynamic = true;
            renderedFiles.forEach((renderedFile) => {
                if (/dynamic/.test(renderedFile) === false) {
                    areAllDynamic = false;
                }
            });

            expect(areAllDynamic).toBe(true);
        });

        test('throws an error if invalid props are provided', async () => {
            let message = '';

            try {
                await render('foo');
            } catch (err) {
                message = err.message;
            } finally {
                expect(message).toContain('Invalid');
            }
        });

        test('throws an error if required props are not provided', async () => {
            let message = '';

            try {
                await render({});
            } catch (err) {
                message = err.message;
            } finally {
                expect(message).toContain('is required');
            }
        });

        test('throws an error if an unknown source is provided', async () => {
            let message = '';

            try {
                await render(testConfig.unknownSource);
            } catch (err) {
                message = err.message;
            } finally {
                expect(message).toContain('not found');
            }
        });

        test('throws an error on a `data` when `outFile` is a directory', async () => {
            const { dataSource } = testConfig;
            let message = '';

            try {
                await render({
                    data: dataSource,
                    outFile: 'dir'
                });
            } catch (err) {
                message = err.message;
            } finally {
                expect(message).toContain('Invalid');
            }
        });

        test('generate source map', async () => {
            const { singleSource, singleOutFile, sourceMap } = testConfig;

            const results = await render({
                ...singleSource,
                ...singleOutFile,
                ...sourceMap
            });

            expect(results.map).toBeDefined();
        });

        test('generate single source map', async () => {
            const { singleSource, singleOutFile, singleSourceMap } = testConfig;

            const results = await render({
                ...singleSource,
                ...singleOutFile,
                ...singleSourceMap
            });

            expect(results.map).toBeDefined();
        });

        test('generate single source map from dynamic prop', async () => {
            const { multiSource, singleOutFile, dynamicSourceMap } = testConfig;

            const results = await render({
                ...multiSource,
                ...singleOutFile,
                ...dynamicSourceMap
            });

            expect(results.map).toBeDefined();
        });

        test('writes source map to disk', async () => {
            const { singleSource, singleOutput, singleSourceMap } = testConfig;

            await render({
                ...singleSource,
                ...singleOutput,
                ...singleSourceMap
            });

            expect(fs.pathExistsSync(singleSourceMap.sourceMap)).toBe(true);
        });

        test('throws an error if `sourceMap` is provided without `outFile` or `output`', async () => {
            const { singleSource } = testConfig;
            let message = '';

            try {
                await render({
                    ...singleSource,
                    sourceMap: true
                });
            } catch (err) {
                message = err.message;
            } finally {
                expect(message).toContain('is required');
            }
        });

        test('throws an error `sourceMap` is not a valid file path', async () => {
            const { singleSource, outputDir } = testConfig;

            try {
                await render({
                    ...singleSource,
                    outFile: outputDir,
                    sourceMap: 'dir'
                });
            } catch (err) {
                expect(err.message).toContain('Invalid');
            }
        });

        test('asynchronously compile sass via a callback', (done) => {
            render(testConfig.multiDataSource, (error, results) => {
                expect(error).toBe(null);
                expect(results.length).toBe(2);
                expect(areAllCompiled(results)).toBe(true);
                done();
            });
        });

        test('asynchronously throws error via callback', (done) => {
            render(testConfig.unknownSource, (error, results) => {
                expect(error.message).toContain('not found');
                expect(results).toBe(undefined);
                done();
            });
        });

        test('concat data sources with single output', async () => {
            const results = await render({
                ...testConfig.multiDataSource,
                ...testConfig.singleOutFile
            });

            const css = results.css.toString();

            expect(css.indexOf('color: red')).toBeGreaterThan(-1);
            expect(css.indexOf('padding: 10px;')).toBeGreaterThan(-1);
        });

        test('concat file sources with single output', async () => {
            const results = await render({
                ...testConfig.multiSource,
                ...testConfig.singleOutFile
            });

            const css = results.css.toString();

            expect(css.indexOf('test-scss-1')).toBeGreaterThan(-1);
            expect(css.indexOf('test-scss-2')).toBeGreaterThan(-1);
            expect(css.indexOf('test-scss-3')).toBeGreaterThan(-1);
        });
    });

    //
    // test `renderSync` method
    //
    describe('sass.renderSync()', () => {
        test('returns an array or object', () => {
            const results = renderSync(testConfig.singleSource);
            const isArrayOrObject =
                Array.isArray(results) || typeof results === 'object';

            expect(isArrayOrObject).toBe(true);
        });

        test('returns a `node-sass` results object for a single source', () => {
            const { singleSource } = testConfig;
            const nodeSassResult = getNodeSassResult(singleSource, true);
            const result = renderSync(singleSource);

            expect(Object.keys(result)).toEqual(Object.keys(nodeSassResult));
        });

        test('returns an array of `node-sass` results for multiple sources', () => {
            const { multiSource } = testConfig;
            const results = renderSync(multiSource);

            results.map((result) => {
                const nodeSassResult = getNodeSassResult(
                    {
                        file: result.stats.entry
                    },
                    true
                );

                expect(Object.keys(result)).toEqual(
                    Object.keys(nodeSassResult)
                );

                return result;
            });
        });

        test('accepts a single file source', () => {
            const results = renderSync(testConfig.singleSource);
            const css = results.css.toString();

            expect(css.indexOf('test-scss-1_scss')).toBeGreaterThan(-1);
        });

        test('accepts multiple file sources', () => {
            const results = renderSync(testConfig.multiSource);
            expect(results.length).toBe(3);
            expect(areAllCompiled(results)).toBe(true);
        });

        test('accepts a single glob source', () => {
            const results = renderSync(testConfig.globSource);
            expect(results.length).toBe(4);
            expect(areAllCompiled(results)).toBe(true);
        });

        test('accepts multiple glob sources', () => {
            const results = renderSync(testConfig.multiGlobSource);
            expect(results.length).toBe(5);
            expect(areAllCompiled(results)).toBe(true);
        });

        test('exclude files via glob config', () => {
            const results = renderSync({
                ...testConfig.globSource,
                globOptions: { ignore: '**/_*' }
            });
            expect(results.length).toBe(3);
            expect(areAllCompiled(results)).toBe(true);
        });

        test('accepts a single Scss/Sass string source', () => {
            const results = renderSync(testConfig.dataSource);
            const css = results.css.toString();

            expect(css.indexOf('color: red')).toBeGreaterThan(-1);
        });

        test('accepts multiple Scss/Sass string sources', () => {
            const results = renderSync(testConfig.multiDataSource);
            expect(results.length).toBe(2);
            expect(areAllCompiled(results)).toBe(true);
        });

        test('writes a single CSS file to disk', () => {
            const { singleSource, singleOutput } = testConfig;
            renderSync({ ...singleSource, ...singleOutput });

            expect(fs.pathExistsSync(singleOutput.output)).toBe(true);
        });

        test('writes multiple CSS files to disk', () => {
            const { multiSource, multiOutput } = testConfig;
            renderSync({ ...multiSource, ...multiOutput });

            const renderedFiles = getOutputCSSFiles(true);

            expect(renderedFiles.length).toEqual(3);
        });

        test('writes a single Scss/Sass string to disk', () => {
            const { dataSource, singleOutput } = testConfig;
            renderSync({ ...dataSource, ...singleOutput });

            expect(fs.pathExistsSync(singleOutput.output)).toBe(true);
        });

        test('allows dynamic output via a function', () => {
            const { multiSource, dynamicOutput } = testConfig;
            renderSync({ ...multiSource, ...dynamicOutput });

            const renderedFiles = getOutputCSSFiles(true);

            let areAllDynamic = true;
            renderedFiles.forEach((renderedFile) => {
                if (/dynamic/.test(renderedFile) === false) {
                    areAllDynamic = false;
                }
            });

            expect(areAllDynamic).toBe(true);
        });

        test('allows dynamic output to directory via a function', () => {
            const { multiSource, dynamicOutputDir } = testConfig;
            renderSync({ ...multiSource, ...dynamicOutputDir });

            const renderedFiles = getOutputCSSFiles(true);

            let areAllDynamic = true;
            renderedFiles.forEach((renderedFile) => {
                if (/dynamic/.test(renderedFile) === false) {
                    areAllDynamic = false;
                }
            });

            expect(areAllDynamic).toBe(true);
        });

        test('throws an error if invalid props are provided', async () => {
            let message = '';

            try {
                renderSync('foo');
            } catch (err) {
                message = err.message;
            } finally {
                expect(message).toContain('Invalid');
            }
        });

        test('throws an error if required props are not provided', () => {
            let message = '';

            try {
                renderSync({});
            } catch (err) {
                message = err.message;
            } finally {
                expect(message).toContain('is required');
            }
        });

        test('throws an error if an unknown source is provided', async () => {
            let message = '';

            try {
                await renderSync(testConfig.unknownSource);
            } catch (err) {
                message = err.message;
            } finally {
                expect(message).toContain('not found');
            }
        });

        test('throws an error on a `data` when `outFile` is a directory', () => {
            const { dataSource } = testConfig;
            let message = '';

            try {
                renderSync({
                    data: dataSource,
                    outFile: 'dir'
                });
            } catch (err) {
                message = err.message;
            } finally {
                expect(message).toContain('Invalid');
            }
        });

        test('generate source map', () => {
            const { singleSource, singleOutFile, sourceMap } = testConfig;

            const results = renderSync({
                ...singleSource,
                ...singleOutFile,
                ...sourceMap
            });

            expect(results.map).toBeDefined();
        });

        test('generate single source map', () => {
            const { singleSource, singleOutFile, singleSourceMap } = testConfig;

            const results = renderSync({
                ...singleSource,
                ...singleOutFile,
                ...singleSourceMap
            });

            expect(results.map).toBeDefined();
        });

        test('generate single source map from dynamic prop', () => {
            const { multiSource, singleOutFile, dynamicSourceMap } = testConfig;

            const results = renderSync({
                ...multiSource,
                ...singleOutFile,
                ...dynamicSourceMap
            });

            expect(results.map).toBeDefined();
        });

        test('writes source map to disk', () => {
            const { singleSource, singleOutput, singleSourceMap } = testConfig;

            renderSync({
                ...singleSource,
                ...singleOutput,
                ...singleSourceMap
            });

            expect(fs.pathExistsSync(singleSourceMap.sourceMap)).toBe(true);
        });

        test('throws an error if `sourceMap` is provided without `outFile` or `output`', () => {
            const { singleSource } = testConfig;
            let message = '';

            try {
                renderSync({
                    ...singleSource,
                    sourceMap: true
                });
            } catch (err) {
                message = err.message;
            } finally {
                expect(message).toContain('is required');
            }
        });

        test('concat data sources with single output', () => {
            const results = renderSync({
                ...testConfig.multiDataSource,
                ...testConfig.singleOutFile
            });

            const css = results.css.toString();

            expect(css.indexOf('color: red')).toBeGreaterThan(-1);
            expect(css.indexOf('padding: 10px;')).toBeGreaterThan(-1);
        });

        test('concat file sources with single output', () => {
            const results = renderSync({
                ...testConfig.multiSource,
                ...testConfig.singleOutFile
            });

            const css = results.css.toString();

            expect(css.indexOf('test-scss-1')).toBeGreaterThan(-1);
            expect(css.indexOf('test-scss-2')).toBeGreaterThan(-1);
            expect(css.indexOf('test-scss-3')).toBeGreaterThan(-1);
        });
    });
});
