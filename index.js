/*!
 * node-sass-extra: src/index.js
 */

const path = require('path');
const fs = require('fs-extra');
const glob = require('glob');
const sass = require('node-sass');

/**
 * Utility for determining whether a given path is a css/sass/scss file or not.
 *
 * @param {String} filePath
 * @api private
 */

function isFile(filePath) {
    return /\.(s[ca]|c)ss$/.test(filePath);
}

/**
 * Utility for flattening arrays; is not recursive, so only flattens down to
 * a single level as that's all that's required.
 *
 * @param {Array} arr
 * @api private
 */

function flattenArray(arr) {
    return arr.reduce((flattened, items) => {
        return flattened.concat(items);
    }, []);
}

/**
 * Takes a single source or array of sources and returns a list of files to
 * be compiled; sources can be file paths or globs.
 *
 * @param {String|Array} sources
 * @return {Array}
 * @api private
 */

async function getSourceFiles(sources) {
    const sourcePaths = [].concat(sources);
    const sourceFiles = await Promise.all(
        sourcePaths.map(
            sourcePath =>
                new Promise((resolve, reject) => {
                    glob(sourcePath, (err, sourceFiles) => {
                        /* istanbul ignore next */
                        if (err) {
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

/**
 * Compiles via node-sass; returns a promise.
 *
 * @param {Object} options
 * @api private
 */

async function compile(options) {
    return new Promise((resolve, reject) => {
        sass.render(options, (err, result) => {
            /* istanbul ignore next */
            if (err) {
                reject(err);
            }

            resolve(result);
        });
    });
}

/**
 * Writes content to disk at the given destination; returns a promise.
 *
 * @param {Object} options
 * @api private
 */

async function writeFile(content, filePath) {
    try {
        await fs.ensureDir(path.dirname(filePath));
        return fs.writeFile(filePath, content);
    } catch (err) {
        /* istanbul ignore next */
        Promise.reject(err);
    }
}

/**
 * Takes one or more sources and config options to determine the essential aspects of a
 * compilation task; Returns node-sass config object(s) for each source/task.
 *
 * For example ...
 *
 * getCompilerTasks('src/file.scss', {
 *     outFile: 'dest'
 *     sourceMap: true
 * });
 *
 * would produce ...
 *
 * {
 *     file: '//path/to/src/file.scss',
 *     outFile: '//path/to/dest/file.css',
 *     sourceMap: '//path/to/dest/file.css.map'
 * }
 *
 * @param {String|Array} sources
 * @param {Object} config
 * @api private
 */

function getCompilerTasks(sources, config) {
    const { outFile, sourceMap } = config;
    let options = {};

    if (Array.isArray(sources)) {
        return sources.map(source => getCompilerTasks(source, config));
    }

    // single file source ...
    if (isFile(sources)) {
        options.file = path.resolve(__dirname, sources);

        // determine output file ...
        if (outFile) {
            // single file output
            if (isFile(outFile)) {
                options.outFile = outFile;

                // dynamic output; run the given iterator function on each source
            } else if (typeof outFile === 'function') {
                const output = outFile(sources);

                if (!isFile(output)) {
                    throw new Error(
                        '"output" and "outFile" function must return a valid file path'
                    );
                }

                options.outFile = output;

                // output is a directory; join the output with the source's basename
            } else {
                options.outFile = path.join(outFile, path.basename(sources));
            }
        }

        // single data source ...
    } else {
        // add data source to options
        options.data = sources;

        // determine output file ...
        if (outFile) {
            if (isFile(outFile)) {
                options.outFile = outFile;
            } else {
                throw new Error(
                    '"output" and "outFile" must be a valid file path when accompanying "data".'
                );
            }
        }
    }

    // resolve the output file and ensure it has a '.css' extension.
    if (options.outFile) {
        options.outFile = path.resolve(
            options.outFile.replace(/\.(s[ca]|c)ss$/, '.css')
        );
    }

    // determine source map ...
    if (sourceMap) {
        if (!options.outFile) {
            throw new Error(
                'Either "output" or "outFile" option is required with "sourceMap".'
            );
        }

        // single file source map
        if (typeof sourceMap === 'string') {
            if (/\.css(\.map)?$/.test(sourceMap)) {
                options.sourceMap = sourceMap;
            } else {
                throw new Error('"sourceMap" must be a valid file path');
            }

            // dynamic source map; run the given iterator function on each output file
        } else if (typeof sourceMap === 'function') {
            const map = sourceMap(options.outFile, options.file);

            if (!/\.css(\.map)?$/.test(map)) {
                throw new Error(
                    '"sourceMap" function must return a valid file path'
                );
            }

            options.sourceMap = map;

            // `sourceMap` === true; use `outFile` for the path
        } else {
            options.sourceMap = options.outFile;
        }

        // resolve source map file and ensure it has a `.map` file extension
        options.sourceMap = path.resolve(
            options.sourceMap.replace(/(\.map)?$/, '.map')
        );
    }

    return options;
}

/**
 * Async rendering of source files; maps to nodeSass.render.
 *
 * @param {Object} options
 * @return {Object|Array}
 * @api public
 */

async function render(userOptions = {}) {
    // don't mutate the original `options` object
    let { data, file, output, outFile, sourceMap, ...options } = userOptions;

    // default outFile to match output
    outFile = output || outFile;

    if (!file && !data) {
        throw new Error('Either a "data" or "file" option is required.');
    }

    // retrieve the list of sources
    const sources = file ? await getSourceFiles(file) : data;

    // retrieve the compiler tasks
    let tasks = [].concat(getCompilerTasks(sources, { outFile, sourceMap }));

    // compile tasks
    const compiled = await Promise.all(
        tasks.map(task =>
            compile({
                ...options,
                ...task,
            })
        )
    );

    // write files to disk?
    if (output) {
        await Promise.all(
            compiled.map(({ css, map }, i) => {
                const task = tasks[i];
                let toWrite = [writeFile(css, task.outFile)];

                if (map) {
                    toWrite.push(writeFile(map, task.sourceMap));
                }

                return Promise.all(toWrite);
            })
        );
    }

    // return the native nodeSass object(s) from compilation
    return compiled.length === 1 ? compiled[0] : compiled;
}

/**
 * Synchronous rendering of source files; maps to nodeSass.renderSync
 *
 * @param {Object} options
 * @return {Object|Array}
 * @api public
 */

function renderSync() {
    /* istanbul ignore next */
    return false;
}

/**
 * Expose the API
 *
 * @api public
 */

const nodeSassExtra = {
    render,
    renderSync,
};

module.exports = nodeSassExtra;

// --------------------------------------------------------------
// dev - DELETE ME
// --------------------------------------------------------------

// nodeSassExtra
//     .render({
//         // compile multiple files
//         file: [
//             'test-files/test-scss-1.scss',
//             'test-files/nested/test-scss-2.scss',
//         ],

//         // compile a single file
//         // file: 'test-files/test-scss-1.scss',

//         // compile multiple globs
//         // file: ['test-files/**/*.scss', 'test-files/**/*.sass'],

//         // compile a single glob
//         // file: 'test-files/**/*.scss',

//         // compile a single data source
//         // data: '$color: red; .data { color: $color; }',

//         // compile multiple data sources
//         // data: [
//         //     '$color: red; .data { color: $color; }',
//         //     '$padding: 10px; .data-2 { padding: $padding; }',
//         // ],

//         // output to a directory
//         output: 'dest',
//         // outFile: 'dest',

//         // dynamic output
//         // output: sourcePath => {
//         //     return sourcePath.replace('test-files', 'dest');
//         // },
//         // outFile: sourcePath => {
//         //     return sourcePath.replace('test-files', 'test-compiled');
//         // },

//         // dynamic output w/concatenation
//         // output: sourcePath => {
//         //     const replaced = /\.scss$/.test(sourcePath) ? 'from-scss.css' : 'from-sass.css';
//         //     return 'test-dest/' + replaced;
//         // },
//         // outFile: sourcePath => {
//         //     const replaced = /\.scss$/.test(sourcePath) ? 'from-scss.css' : 'from-sass.css';
//         //     return 'test-dest/' + replaced;
//         // },

//         // output to a single file
//         // output: 'dest/compiled.css',
//         // outFile: 'dest/compiled.css',

//         // source map
//         // sourceMap: true,

//         // single source map
//         // sourceMap: 'dest/compiled.css.map'

//         // dynamic source map
//         // sourceMap: outPath => {
//         //     return outPath.replace('dest', 'test-compiled')
//         // }
//     })
//     .then(compiled => {
//         console.log('Done!', compiled);
//     })
//     .catch(err => {
//         console.log('Error:', err);
//     });
