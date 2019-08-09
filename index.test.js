const sass = require('./index');
const nodeSassBaseModule = require('node-sass');
const { render } = sass;
const path = require('path');
const glob = require('glob');
const fs = require('fs-extra');

const sourceDir = path.resolve(__dirname, 'test-files');
const outputDir = path.resolve(__dirname, 'test-compiled');
const dynamicOutputDir = path.join(outputDir, 'dynamic');

const dataSources = [
    '$color: red; body { color: $color; }',
    '$padding: 10px; body { padding: $padding; }',
];

const testConfig = {
    sourceDir,
    outputDir,
    singleSource: {
        file: path.join(sourceDir, 'test-scss-1.scss'),
    },
    multiSource: {
        file: [
            path.join(sourceDir, 'test-scss-1.scss'),
            path.join(sourceDir, 'nested/test-scss-2.scss'),
            path.join(sourceDir, 'nested/deeper/test-scss-3.scss'),
        ],
    },
    globSource: {
        file: path.join(sourceDir, '**/*.scss'),
    },
    multiGlobSource: {
        file: [
            path.join(sourceDir, '**/*.scss'),
            path.join(sourceDir, '**/*.sass'),
        ],
    },
    dataSource: {
        data: dataSources[0],
    },
    multiDataSource: {
        data: dataSources,
    },
    singleOutput: {
        output: path.join(outputDir, 'test.css'),
    },
    multiOutput: {
        output: outputDir,
    },
    dynamicOutput: {
        output: sourceFile => sourceFile.replace(outputDir, dynamicOutputDir),
    },
    singleOutFile: {
        outFile: path.join(outputDir, 'test.css'),
    },
    multiOutFile: {
        outFile: outputDir,
    },
    dynamicOutFile: {
        outFile: sourceFile => sourceFile.replace(outputDir, dynamicOutputDir),
    },
    sourceMap: {
        sourceMap: true,
    },
    singleSourceMap: {
        sourceMap: path.join(outputDir, 'test.css.map'),
    },
    dynamicSourceMap: {
        sourceMap: sourceFile =>
            sourceFile.replace(outputDir, dynamicOutputDir),
    },
};

describe('index.js', () => {
    function removeOutputDir() {
        fs.removeSync(testConfig.outputDir);
    }

    function getOutputCSSFiles() {
        return new Promise((resolve, reject) => {
            glob(path.join(testConfig.outputDir, '**/*.css'), (err, files) => {
                if (err) {
                    reject(err);
                }

                resolve(files);
            });
        });
    }

    function getNodeSassResult(sourceFile) {
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
        results = [].concat(results);

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
            error: () => false,
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
        test('returns a promise', done => {
            render(testConfig.singleSource).then(results => {
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
                results.map(async result => {
                    const nodeSassResult = await getNodeSassResult({
                        file: result.stats.entry,
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
            expect(results.length).toBe(3);
            expect(areAllCompiled(results)).toBe(true);
        });

        test('accepts multiple glob sources', async () => {
            const results = await render(testConfig.multiGlobSource);
            expect(results.length).toBe(4);
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
            renderedFiles.forEach(renderedFile => {
                if (/dynamic/.test(renderedFile) === false) {
                    areAllDynamic = false;
                }
            });

            expect(areAllDynamic).toBe(true);
        });

        test('throws an error if required props are not provided', async () => {
            try {
                await render();
            } catch (err) {
                expect(err.message).toEqual(
                    'Either a "data" or "file" option is required.'
                );
            }
        });

        test('throws an error if a source file is not found', async () => {
            try {
                await render({
                    file: 'nonexistant.scss',
                });
            } catch (err) {
                expect(err.message).toContain('not found');
            }
        });

        test('throws an error on a `data` when `outFile` is a directory', async () => {
            const { dataSource } = testConfig;

            try {
                await render({
                    data: dataSource,
                    outFile: 'dir',
                });
            } catch (err) {
                expect(err.message).toContain('valid file path');
            }
        });

        test('throws an error if dynamic `output` does not return a file path', async () => {
            const { multiSource } = testConfig;

            try {
                await render({
                    ...multiSource,
                    output: () => 'dir',
                });
            } catch (err) {
                expect(err.message).toContain('valid file path');
            }
        });

        test('generate source map', async () => {
            const { singleSource, singleOutFile, sourceMap } = testConfig;

            const results = await render({
                ...singleSource,
                ...singleOutFile,
                ...sourceMap,
            });

            expect(results.map).toBeDefined();
        });

        test('generate single source map', async () => {
            const { singleSource, singleOutFile, singleSourceMap } = testConfig;

            const results = await render({
                ...singleSource,
                ...singleOutFile,
                ...singleSourceMap,
            });

            expect(results.map).toBeDefined();
        });

        test('generate single source map from dynamic prop', async () => {
            const { multiSource, singleOutFile, dynamicSourceMap } = testConfig;

            const results = await render({
                ...multiSource,
                ...singleOutFile,
                ...dynamicSourceMap,
            });

            expect(results.map).toBeDefined();
        });

        test('writes source map to disk', async () => {
            const { singleSource, singleOutput, singleSourceMap } = testConfig;

            await render({
                ...singleSource,
                ...singleOutput,
                ...singleSourceMap,
            });

            expect(fs.pathExistsSync(singleSourceMap.sourceMap)).toBe(true);
        });

        test('throws an error if `sourceMap` is provided without `outFile` or `output`', async () => {
            const { singleSource } = testConfig;

            try {
                await render({
                    ...singleSource,
                    sourceMap: true,
                });
            } catch (err) {
                expect(err.message).toEqual(
                    'Either "output" or "outFile" option is required with "sourceMap".'
                );
            }
        });

        test('throws an error `sourceMap` is not a valid file path', async () => {
            const { singleSource, outputDir } = testConfig;

            try {
                await render({
                    ...singleSource,
                    outFile: outputDir,
                    sourceMap: 'dir',
                });
            } catch (err) {
                expect(err.message).toContain('valid file path');
            }
        });

        test('throws an error if dynamic `sourceMap` does not return a file path', async () => {
            const { multiSource, outputDir } = testConfig;

            try {
                await render({
                    ...multiSource,
                    outFile: outputDir,
                    sourceMap: () => 'dir',
                });
            } catch (err) {
                expect(err.message).toContain('valid file path');
            }
        });
    });
});
