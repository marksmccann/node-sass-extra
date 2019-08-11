/*!
 * node-sass-extra: src/index.js
 */

const path = require('path');
const fs = require('fs-extra');
const glob = require('glob');
const sass = require('node-sass');

/**
 * Utility for determining whether a given path is a file.
 *
 * @param {String} filePath
 * @api private
 */

function isFile(filePath) {
    return /\.\S+$/.test(filePath);
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
 * Determines the output file path for a given source via the "outFile"
 * config option; returns an absolute path.
 *
 * @param {String} source
 * @param {String|Function} outFile
 * @api private
 */

function getOutFile(source, outFile) {
    if (isFile(source)) {
        // dynamic output; run the given iterator function on each source
        if (typeof outFile === 'function') {
            outFile = outFile(source);
        }

        // output is a directory; append the source's basename
        if (!isFile(outFile)) {
            outFile = path.join(outFile, path.basename(source));
        }
    }

    // throw error if the determined output is not a valid file path
    if (!isFile(outFile)) {
        throw new Error(
            `"${outFile}" is not a valid file path for "output" or "outFile".`
        );
    }

    // resolve and ensure '.css' extension
    return path.resolve(outFile.replace(/\.(s[ca]|c)ss$/, '.css'));
}

/**
 * Determines the source map file path for a given source via the "sourceMap"
 * config option and an output file path; returns an absolute path.
 *
 * @param {String} source
 * @param {String|Function|Boolean} sourceMap
 * @param {String} outFile
 * @api private
 */

function getSourceMap(source, sourceMap, outFile) {
    // dynamic source map; run the given iterator function on each source map file
    if (typeof sourceMap === 'function') {
        sourceMap = sourceMap(outFile, source);

        // source map is just a boolean; use `outFile` for the path
    } else if (sourceMap === true) {
        sourceMap = outFile;
    }

    // sourceMap is a directory; use `outFile` for the file name
    if (!isFile(sourceMap)) {
        sourceMap = path.join(sourceMap, path.basename(outFile));
    }

    // resolve and ensure '.map' extension
    return path.resolve(sourceMap.replace(/(\.map)?$/, '.map'));
}

/**
 * Takes some sources and user-defined options to return a
 * set of node-sass config objects ready for compilation.
 *
 * @param {Array|String} sources
 * @param {Object} userOptions
 * @api private
 */

function getTasks(sources, userOptions) {
    if (Array.isArray(sources)) {
        return sources.map(source => getTasks(source, userOptions));
    }

    let { output, outFile, sourceMap, ...options } = userOptions;
    let task = {};

    outFile = output || outFile;

    if (isFile(sources)) {
        task.file = sources;
    } else {
        task.data = sources;
    }

    if (outFile) {
        task.outFile = getOutFile(sources, outFile);
    }

    if (sourceMap) {
        if (!outFile) {
            throw new Error(
                'Either "output" or "outFile" option is required with "sourceMap".'
            );
        }

        task.sourceMap = getSourceMap(sources, sourceMap, task.outFile);
    }

    return {
        ...options,
        ...task,
    };
}

/**
 * Async rendering of source files; maps to nodeSass.render.
 *
 * @param {Object} userOptions
 * @return {Object|Array}
 * @api public
 */

async function render(userOptions = {}) {
    let { data, file, output } = userOptions;

    if (!file && !data) {
        throw new Error('Either a "data" or "file" option is required.');
    }

    // retrieve the list of sources
    const sources = file ? await getSourceFiles(file) : data;

    // retrieve the compiler tasks
    let tasks = [].concat(getTasks(sources, userOptions));

    // compile tasks
    const compiled = await Promise.all(tasks.map(task => compile(task)));

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
//         // file: [
//         //     'test-files/test-scss-1.scss',
//         //     'test-files/nested/test-scss-2.scss',
//         // ],

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
//         // output: 'dest',
//         // outFile: 'dest',

//         // dynamic output
//         // output: sourcePath => {
//         //     return sourcePath.replace('test-files', 'dest');
//         // },
//         // outFile: sourcePath => {
//         //     return sourcePath.replace('test-files', 'test-compiled');
//         // },

//         // dynamic output returns a directory
//         // output: () => {
//         //     return 'dest';
//         // },
//         // outFile: () => {
//         //     return 'dest';
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
//         // sourceMap: 'dest/compiled.css.map',

//         // source map directory
//         // sourceMap: 'dest',

//         // dynamic source map
//         // sourceMap: outPath => {
//         //     return outPath.replace('dest', 'test-compiled')
//         // },

//         // dynamic source map directory
//         sourceMap: () => {
//             return 'test-compiled';
//         },
//     })
//     .then(compiled => {
//         console.log('Done!', compiled);
//     })
//     .catch(err => {
//         console.log('Error:', err);
//     });
