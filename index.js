/**
 * The Node API for `node-sass-extra`.
 *
 * @module node-sass-extra
 */

const path = require('path');
const fs = require('fs-extra');
const glob = require('glob');
const sass = require('node-sass');

/**
 * A `node-sass-extra` config object.
 *
 * @typedef {object} options
 * @property {string|string[]} data - String(s) to be compiled.
 * @property {string|string[]} file - File(s) to be compiled; can be a file path or a glob pattern.
 * @property {string|module:node-sass-extra~setOutFile} output - The output destination; can be a file path, a directory, or a callback that returns a file path or directory. Must be/return a file path when paried with `data`. If provided, files will be written to disk.
 * @property {string|module:node-sass-extra~setOutFile} outFile - The output destination; can be a file path, a directory, or a callback that returns a file path or directory. Must be/return a file path when paried with `data`. `output` will override this value if provided.
 * @property {string|module:node-sass-extra~setSourceMap} sourceMap - The source map destination; can be a boolean, a file path, a directory, or a callback that returns a file path or directory. If a boolean or directory, the file will be named after the output file.
 * @property {*} ... - {@link external:nodeSassOptions}
 * @augments external:nodeSassOptions
 *
 * @example
 * // compiles and writes file
 * {
 *     file: 'src/file.scss',
 *     output: 'css/file.css'
 * }
 *
 * @example
 * // compiles and creates source maps, but does NOT write them
 * {
 *     file: 'src/*.scss',
 *     outFile: 'css',
 *     sourceMap: true
 * }
 *
 * @example
 * // compiles and creates source maps; writes css to `css/` and source maps to `maps/`
 * {
 *     file: ['src/file1.scss', 'src/file2.scss'],
 *     output: 'css',
 *     sourceMap: 'maps'
 * }
 *
 * @example
 * // compiles and creates source map; writes css and source map to `css/file.css.map`
 * {
 *     data: '$color: red; .foo { background: $color; } ...',
 *     output: 'css/file.css',
 *     sourceMap: true
 * }
 */

/**
 * Callback for dynamically defining the output path via the source
 * file; must return a valid file path.
 *
 * @callback setOutFile
 * @param {string} srcFile - The source file path.
 * @returns {string} A file path.
 *
 * @example
 * render({
 *     file: 'src/path/to/file.scss',
 *     output: srcFile => {
 *         // returns 'css/path/to/file.css';
 *         return srcFile.replace(/src\//, 'css/');
 *     }
 * });
 */

/**
 * Callback for dynamically defining the source map's output path via the
 * output and/or source files; must return a valid file path.
 *
 * @callback setSourceMap
 * @param {string} outFile - The output file path.
 * @param {string} srcFile - The source file path.
 * @returns {string} A file path.
 *
 * @example
 * render({
 *     file: 'src/path/to/file.scss',
 *     outFile: 'css',
 *     sourceMap: (outFile, srcFile) => {
 *         // returns 'map/file.css.map';
 *         return outFile.replace(/css\//, 'map/');
 *     }
 * });
 */

/**
 * @external nodeSassOptions
 * @see https://github.com/sass/node-sass#options
 */

/**
 * @external nodeSassResult
 * @see https://github.com/sass/node-sass#result-object
 */

/**
 * @external nodeSassError
 * @see https://github.com/sass/node-sass#error-object
 */

/**
 * Utility for determining whether a given path is a file.
 *
 * @param {string} filePath
 * @returns {boolean}
 * @private
 */
function isFile(filePath) {
    return /\.\S+$/.test(filePath);
}

/**
 * Utility for flattening arrays; is not recursive, so only flattens down to
 * a single level as that's all that's required.
 *
 * @param {Array} arr
 * @returns {Array}
 * @private
 */
function flattenArray(arr) {
    return arr.reduce((flattened, items) => {
        return flattened.concat(items);
    }, []);
}

/**
 * Utility for coercing a given item into an array.
 *
 * @param {*} item
 * @returns {Array}
 * @private
 */
function arrayify(item) {
    return [].concat(item);
}

/**
 * Utlitity for marshalling array data; if an array contains only a single item, the item is
 * returned. Otherwise, the entire array is returned.
 *
 * @param {Array} arrayData
 * @returns {*}
 * @private
 */
function marshalArray(arrayData) {
    return arrayData.length === 1 ? arrayData[0] : arrayData;
}

/**
 * Synchronously takes source file(s) and returns a list of files to
 * be compiled; sources can be file paths or globs.
 *
 * @param {string|string[]} sources
 * @returns {string[]}
 * @private
 */
function getSourceFilesSync(sources) {
    const sourceFiles = arrayify(sources).map(sourcePath =>
        glob.sync(sourcePath)
    );
    return flattenArray(sourceFiles);
}

/**
 * Asynchronously takes source file(s) and returns a list of files to
 * be compiled; sources can be file paths or globs.
 *
 * @param {string|string[]} sources
 * @returns {string[]}
 * @private
 * @async
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
 * Synchronously compiles via node-sass
 *
 * @param {external:nodeSassOptions} options
 * @returns {external:nodeSassResult}
 * @throws {external:nodeSassError}
 * @private
 */
function compileSync(options) {
    return sass.renderSync(options);
}

/**
 * Compiles via node-sass; returns a promise. Resolves with {@link external:nodeSassResult|nodeSassResult(s)};
 * rejects with {@link external:nodeSassError}.
 *
 * @param {external:nodeSassOptions} options
 * @returns {Promise}
 * @private
 * @async
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
 * Synchronously writes content to disk at the given destination.
 *
 * @param {string} content
 * @param {string} filePath
 * @private
 */
function writeFileSync(content, filePath) {
    fs.ensureDirSync(path.dirname(filePath));
    fs.writeFileSync(filePath, content);
}

/**
 * Asynchronously writes content to disk at the given destination; returns a promise.
 *
 * @param {string} content
 * @param {string} filePath
 * @returns {Promise}
 * @throws {Error}
 * @private
 * @async
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
 * @param {string} source
 * @param {string|module:node-sass-extra~setOutFile} outFile
 * @returns {string}
 * @throws {Error}
 * @private
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
 * @param {string} source
 * @param {boolean|string|module:node-sass-extra~setSourceMap} sourceMap
 * @param {string} outFile
 * @returns {string}
 * @private
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
 * Takes some sources and user-defined options to return a set of node-sass config
 * objects ready for compilation.
 *
 * @param {string|string[]} sources
 * @param {module:node-sass-extra~options} options
 * @returns {nodeSassOptions[]}
 * @private
 */
function getTasks(sources, options) {
    if (Array.isArray(sources)) {
        return sources.map(source => getTasks(source, options));
    }

    let { output, outFile, sourceMap, ...nodeSassOptions } = options;
    const task = {};

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
        task.sourceMap = getSourceMap(sources, sourceMap, task.outFile);
    }

    return {
        ...nodeSassOptions,
        ...task,
    };
}

/**
 * Validates the options passed into the compiler, ensuring required props are present.
 *
 * @param {module:node-sass-extra~options} options
 * @returns {module:node-sass-extra~options}
 * @throws {Error}
 * @private
 */
function validateOptions(options = {}) {
    const { data, file, output, outFile, sourceMap } = options;

    if (!file && !data) {
        throw new Error('Either a "data" or "file" option is required.');
    }

    if (sourceMap && (!output && !outFile)) {
        throw new Error(
            'Either "output" or "outFile" option is required with "sourceMap".'
        );
    }

    return options;
}

/**
 * Asynchronous rendering; maps to nodeSass.render. Resolves with {@link external:nodeSassResult|nodeSassResult};
 * rejects with {@link external:nodeSassError}. If more than one source is compiled an array of results is returned.
 *
 * @param {module:node-sass-extra~options} options
 * @returns {Promise}
 * @public
 * @async
 *
 * @example
 * const sass = require('node-sass-extra');
 *
 * sass.render({
 *     file: 'src/*.scss',
 *     output: 'css'
 *     [, ...options]
 * })
 *     .then(result => {
 *         // ...
 *     })
 *     .catch(err => {
 *         // ...
 *     });
 *
 * @example
 * const sass = require('node-sass-extra');
 *
 * try {
 *     const result = await sass.render({
 *         file: 'src/*.scss',
 *         output: 'css'
 *         [, ...options]
 *     });
 * } catch (err) {
 *     // ...
 * }
 */
async function render(options) {
    const { data, file, output } = validateOptions(options);

    // retrieve the list of sources
    const sources = file ? await getSourceFiles(file) : data;

    // retrieve the compiler tasks
    const tasks = arrayify(getTasks(sources, options));

    // compile tasks
    const compiled = await Promise.all(tasks.map(task => compile(task)));

    // write files to disk?
    if (output) {
        await Promise.all(
            compiled.map(({ css, map }, i) => {
                const task = tasks[i];
                const toWrite = [writeFile(css, task.outFile)];

                if (map) {
                    toWrite.push(writeFile(map, task.sourceMap));
                }

                return Promise.all(toWrite);
            })
        );
    }

    // return the native nodeSass object(s) from compilation
    return marshalArray(compiled);
}

/**
 * Synchronous rendering; maps to nodeSass.renderSync. If more than one source is compiled
 * an array of results is returned.
 *
 * @param {module:node-sass-extra~options} options
 * @returns {external:nodeSassResult|external:nodeSassResult[]}
 * @throws {external:nodeSassError}
 * @public
 *
 * @example
 * const sass = require('node-sass-extra');
 *
 * const result = sass.renderSync({
 *     file: 'src/*.scss',
 *     output: 'css'
 *     [, ...options]
 * });
 *
 * @example
 * const sass = require('node-sass-extra');
 *
 * try {
 *     const result = sass.renderSync({
 *         file: 'src/*.scss',
 *         output: 'css'
 *         [, ...options]
 *     });
 * } catch(err) {
 *     // ...
 * };
 */
function renderSync(options) {
    const { data, file, output } = validateOptions(options);
    const sources = file ? getSourceFilesSync(file) : data;
    const tasks = arrayify(getTasks(sources, options));
    const compiled = tasks.map(task => compileSync(task));

    // write files to disk?
    if (output) {
        compiled.forEach(({ css, map }, i) => {
            const task = tasks[i];
            writeFileSync(css, task.outFile);

            if (map) {
                writeFileSync(map, task.sourceMap);
            }
        });
    }

    return marshalArray(compiled);
}

// Expose the API
module.exports = {
    render,
    renderSync,
};
