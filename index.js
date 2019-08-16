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
 * Utility for coercing a given item into an array
 *
 * @param {*}
 * @return {Array}
 * @api private
 */
function arrayify(item) {
    return [].concat(item);
}

/**
 * Utlitity for marshalling array data; if an array contains only a single item, the item is
 * returned. Otherwise, the entire array is returned.
 *
 * @param {Array} arrayData
 * @return {*}
 * @api private
 */

function marshalArray(arrayData) {
    return arrayData.length === 1 ? arrayData[0] : arrayData;
}

/**
 * Synchronously takes a single source or array of sources and returns a list of files to
 * be compiled; sources can be file paths or globs.
 *
 * @param {String|Array} sources
 * @return {Array}
 * @api private
 */

function getSourceFilesSync(sources) {
    const sourceFiles = arrayify(sources).map(sourcePath =>
        glob.sync(sourcePath)
    );
    return flattenArray(sourceFiles);
}

/**
 * Asynchronously takes a single source or array of sources and returns a list of files to
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
 * Synchronously compiles via node-sass
 *
 * @param {Object} options
 * @api private
 */

function compileSync(options) {
    return sass.renderSync(options);
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
 * Synchronously writes content to disk at the given destination
 *
 * @param {String} content
 * @param {String} filePath
 * @api private
 */

function writeFileSync(content, filePath) {
    fs.ensureDirSync(path.dirname(filePath));
    fs.writeFileSync(filePath, content);
}

/**
 * Asynchronously writes content to disk at the given destination; returns a promise.
 *
 * @param {String} content
 * @param {String} filePath
 * @return {Promise}
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
 * @param {Object} options
 * @api private
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
 * @param {Object} options
 * @return {Object}
 * @api private
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
 * Async rendering of source files; maps to nodeSass.render.
 *
 * @param {Object} options
 * @return {Object|Array}
 * @api public
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
 * Synchronous rendering of source files; maps to nodeSass.renderSync
 *
 * @param {Object} options
 * @return {Object|Array}
 * @api public
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
