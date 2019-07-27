const sass = require('./index');
const nodeSassBaseModule = require('node-sass');
const { render } = sass;
const path = require('path');
const glob = require('glob');
const fs = require('fs-extra');

const sourceDir = path.resolve(__dirname, 'test-files');
const outputDir = path.resolve(__dirname, 'test-compiled');

const dataSources = [
    '$color: red; body { color: $color; }',
    '$padding: 10px; body { padding: $padding; }',
];

const testConfig = {
    sourceDir,
    outputDir,
    singleSource: {
        file: path.join(sourceDir, 'test.scss'),
    },
    multiSource: {
        file: [
            path.join(sourceDir, 'test.scss'),
            path.join(sourceDir, 'nested/test.scss'),
            path.join(sourceDir, 'nested/deeper/test.scss'),
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

            expect(css.indexOf('body')).toBeGreaterThan(-1);
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

        test('concatenates multiple sources into a single output', async () => {
            const { multiSource, singleOutput } = testConfig;
            await render({ ...multiSource, ...singleOutput });

            const fileContent = await fs.readFile(singleOutput.output, 'utf8');
            const bodyCount = fileContent.match(/body/g);

            expect(bodyCount.length).toEqual(3);
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
    });
});
