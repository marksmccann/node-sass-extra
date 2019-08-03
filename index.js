const path = require('path');
const fs = require('fs-extra');
const glob = require('glob');
const sass = require('node-sass');

// utility for determining whether a given path is a file (with a supported extension) or not
function isFile(filePath) {
    return /\.(s[ca]|c)ss$/.test(filePath);
}

// utility for flattening arrays; is not recursive, so only flattens down to a single level as
// that's all that's required
function flattenArray(arr) {
    return arr.reduce((flattened, items) => {
        return flattened.concat(items);
    }, []);
}

// utility for concatenating CSS output from a `node-sass` object
function concatCompiled(compiled) {
    return compiled.reduce(
        (content, { css }) => (content += css.toString()),
        ''
    );
}

// takes a single source or array of sources and returns a list of files to be compiled; sources
// can be file paths or globs
async function getSourceFiles(sources) {
    const sourcePaths = [].concat(sources);
    const sourceFiles = await Promise.all(
        sourcePaths.map(
            sourcePath =>
                new Promise((resolve, reject) => {
                    glob(sourcePath, (err, sourceFiles) => {
                        if (err) {
                            /* istanbul ignore next */
                            reject(err);
                        }

                        resolve(sourceFiles);
                    });
                })
        )
    );

    // flatten the list of source files, as it will be an array of arrays from the above ... since
    // we support both file paths and globs, any single `file` entry could be either 1 or N files
    return flattenArray(sourceFiles);
}

// compiles a given source (file or string) to CSS via node-sass; returns a promise
async function compile(source, options) {
    const sourceObj = isFile(source)
        ? { file: path.resolve(__dirname, source) }
        : { data: source };

    return new Promise((resolve, reject) => {
        sass.render(
            {
                ...sourceObj,
                ...options,
            },
            (err, result) => {
                if (err) {
                    /* istanbul ignore next */
                    reject(err);
                }

                resolve(result);
            }
        );
    });
}

// writes compiled CSS to disk at the given destination; returns a promise
async function writeFile(css, filePath) {
    try {
        await fs.ensureDir(path.dirname(filePath));
        return fs.writeFile(filePath.replace(/\.s(c|a)ss$/, '.css'), css);
    } catch (err) {
        /* istanbul ignore next */
        Promise.reject(err);
    }
}

// async rendering of source files; maps to nodeSass.render
async function render(userOptions = {}) {
    try {
        // don't mutate the original `options` object
        const options = { ...userOptions };
        const { data, file, output } = options;

        if (!file && !data) {
            throw new Error('Either a "data" or "file" option is required.');
        }

        // clean up the options obj to pass to node-sass
        delete options.data;
        delete options.file;
        delete options.output;

        let sources;
        if (file) {
            sources = await getSourceFiles(file);
        } else {
            sources = data;
        }

        const isSourceArray = Array.isArray(sources);
        let compiled = isSourceArray
            ? await Promise.all(sources.map(source => compile(source, options)))
            : await compile(sources, options);

        // write files to disk?
        if (output) {
            // arrayify results for easier handling
            compiled = [].concat(compiled);

            // single file output; combine the contents of each compiled source
            if (isFile(output)) {
                await writeFile(concatCompiled(compiled), path.resolve(output));

                // dynamic output; run the given iterator function on each source
            } else if (typeof output === 'function') {
                const filesToWrite = {};

                // group compilation objects by output path so anything writing to the same place
                // will be concatenated
                compiled.forEach(result => {
                    const {
                        stats: { entry, includedFiles },
                    } = result;
                    const outputPath = output(entry, includedFiles);

                    if (!isFile(outputPath)) {
                        throw new Error(
                            '`output` function must return a valid file path.'
                        );
                    }

                    if (!filesToWrite[outputPath]) {
                        filesToWrite[outputPath] = [];
                    }

                    filesToWrite[outputPath].push(result);
                });

                await Promise.all(
                    Object.keys(filesToWrite).map(outputPath => {
                        const resultsToConcat = filesToWrite[outputPath];
                        return writeFile(
                            concatCompiled(resultsToConcat),
                            outputPath
                        );
                    })
                );

                // output is a directory; keep sources separate and write them individuallly to the
                // specified location
            } else {
                const outputDir = path.resolve(output);

                await Promise.all(
                    compiled.map(({ css, stats }) => {
                        const filePath = path.join(
                            outputDir,
                            path.basename(stats.entry)
                        );

                        return writeFile(css, filePath);
                    })
                );
            }
        }

        // return the native nodeSass object(s) from compilation
        return compiled.length === 1 ? compiled[0] : compiled;
    } catch (err) {
        console.error(err);
        throw err;
    }
}

function renderSync() {
    return false;
}

const nodeSassExtra = {
    render,
    renderSync,
};

// dev - DELETE ME
// nodeSassExtra
//     .render({
//         // compile multiple files
//         // file: ['test-files/test.scss', 'test-files/nested/test.scss'],
//
//         // compile a single file
//         // file: 'test-files/test.scss',
//
//         // compile multiple globs
//         file: ['test-files/**/*.scss', 'test-files/**/*.sass'],
//
//         // compile a single glob
//         // file: 'test-files/**/*.scss',
//
//         // compile a single data source
//         // data: '$color: red; body { color: $color; }',
//
//         // compile multiple data sources
//         // data: [
//         //     '$color: red; body { color: $color; }',
//         //     '$padding: 10px; body { padding: $padding; }',
//         // ],
//
//         // output to a directory
//         // output: 'dest',
//
//         // dynamic output
//         output: sourcePath => {
//             return sourcePath.replace('test-files', 'test-compiled');
//         },
//
//         // dynamic output w/concatenation
//         // output: sourcePath => {
//         //     const replaced = /\.scss$/.test(sourcePath) ? 'from-scss.css' : 'from-sass.css';
//         //     return 'test-dest/' + replaced;
//         // },
//
//         // output to a single file
//         // output: 'dest/compiled.css',
//     })
//     .then(compiled => console.log('Done!', compiled))
//     .catch(err => console.log('Error:', err));

module.exports = nodeSassExtra;
