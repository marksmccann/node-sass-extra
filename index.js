/**
 * The Node API for `node-sass-extra`.
 *
 * @module node-sass-extra
 */

const path = require('path');
const fs = require('fs-extra');
const glob = require('glob');
const sass = require('node-sass');
const eol = require('os').EOL;
const pkg = require('./package.json');

/**
 * A `node-sass-extra` config object.
 *
 * @typedef {object} options
 * @property {string|string[]} data - String(s) to be compiled.
 * @property {string|string[]} file - File(s) to be compiled; can be a file path or a glob pattern.
 * @property {string|module:node-sass-extra~setOutFile} output - The output destination; can be a file path, a directory, or a {@link module:node-sass-extra~setOutFile|callback} that returns a file path or directory. Must be/return a file path when paried with `data`. If provided, files will be written to disk.
 * @property {string|module:node-sass-extra~setOutFile} outFile - The output destination; can be a file path, a directory, or a {@link module:node-sass-extra~setOutFile|callback} that returns a file path or directory. Must be/return a file path when paried with `data`. `output` will override this value if provided. Does NOT write files to disk.
 * @property {string|module:node-sass-extra~setSourceMap} sourceMap - The source map destination; can be a boolean, a file path, a directory, or a {@link module:node-sass-extra~setSourceMap|callback} that returns a boolean, file path or directory. If a boolean or directory, the file will be named after the output file. If paired with `output`, source maps will be written to disk.
 * @property {object} globOptions - The {@link external:globOptions|configuration options} for the glob pattern.
 * @property {*} ... - {@link external:nodeSassOptions}
 * @augments external:nodeSassOptions
 *
 * @example
 * // compiles a single file and writes to disk
 * {
 *     file: 'src/file.scss',
 *     output: 'css/file.css'
 * }
 *
 * @example
 * // compiles sass and creates source maps, but does NOT write them
 * {
 *     file: 'src/*.scss',
 *     outFile: 'css',
 *     sourceMap: true
 * }
 *
 * @example
 * // compiles sass and creates source maps; writes css to `css/` and source maps to `maps/`
 * {
 *     file: ['src/file1.scss', 'src/file2.scss'],
 *     output: 'css',
 *     sourceMap: 'maps'
 * }
 *
 * @example
 * // compiles sass and creates source map; writes css to `css/file.css` and source map to `css/file.css.map`
 * {
 *     data: '$color: red; .foo { background: $color; } ...',
 *     output: 'css/file.css',
 *     sourceMap: true
 * }
 *
 * @example
 * // compiles multiple files and writes all to single file
 * {
 *     file: 'src/*.scss',
 *     output: 'main.css'
 * }
 *
 * @example
 * // compile compressed css and write to file with `.min` suffix
 * {
 *     file: 'src/*.scss',
 *     output: srcFile => srcFile.replace(/.scss$/, '.min.css'),
 *     outputStyle: 'compressed'
 * }
 *
 * @example
 * // compiles sass, excluding files that start with an underscore
 * {
 *     file: 'src/*.scss',
 *     globOptions: {
 *         ignore: '_*.scss',
 *         follow: true
 *     }
 * }
 */

/**
 * Callback for dynamically defining the output path via the source file.
 *
 * @callback setOutFile
 * @param {string} srcFile - The source file path.
 * @returns {string} A file path or directory.
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
 * output and/or source file.
 *
 * @callback setSourceMap
 * @param {string} outFile - The output file path.
 * @returns {string|boolean} A file path, directory or boolean.
 *
 * @example
 * render({
 *     file: 'src/path/to/file.scss',
 *     outFile: 'css',
 *     sourceMap: outFile => {
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
 * @external globOptions
 * @see https://www.npmjs.com/package/glob#options
 */

/**
 * Gets version information.
 *
 * @returns {string}
 * @private
 */
function getVersionInfo() {
    const versionInfo = [
        'node-sass-extra',
        pkg.version,
        '(Wrapper)',
        '[JavaScript]',
    ].join('\t');
    return versionInfo + eol + sass.info;
}

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
 * Joins a list of file paths as sass import statements.
 *
 * @param {string|string[]} files - file paths
 * @returns {string}
 * @private
 *
 * @example
 * const joined = joinSourceFiles(['file1.scss', 'file2.scss']);
 * console.log(joined); // "@import 'file1.scss';\n@import 'file2.scss';"
 */
function joinSourceFiles(files) {
    return arrayify(files)
        .map(file => `@import '${path.resolve(file)}';`)
        .join('\n');
}

/**
 * Retrieves a list of file paths that match a given glob pattern.
 *
 * @param {string} pattern - a glob pattern
 * @param {object} [options] - glob config
 * @returns {Promise}
 * @private
 */
function getGlobMatches(pattern, options = {}) {
    return new Promise((resolve, reject) => {
        glob(pattern, options, (err, matches) => {
            /* istanbul ignore next */
            if (err) {
                reject(err);
            }

            resolve(matches);
        });
    });
}

/**
 * Synchronously takes source file(s) and returns a list of files to be compiled.
 *
 * @param {string|string[]} sources - file paths or globs
 * @param {object} [globOptions] - glob config
 * @returns {string[]}
 * @private
 */
function getSourceFilesSync(sources, globOptions) {
    return arrayify(sources).reduce((sourceFiles, path) => {
        if (glob.hasMagic(path)) {
            sourceFiles = sourceFiles.concat(glob.sync(path, globOptions));
        } else {
            sourceFiles.push(path);
        }

        return sourceFiles;
    }, []);
}

/**
 * Asynchronously takes source file(s) and returns a list of files to be compiled.
 *
 * @param {string|string[]} sources - file paths or globs
 * @param {object} [globOptions] - glob config
 * @returns {string[]}
 * @private
 * @async
 */
async function getSourceFiles(sources, globOptions) {
    let sourceFiles = [];

    // asynchronously map through sources in order, resolving globs
    // and collecting in a single array.
    for (const path of arrayify(sources)) {
        if (glob.hasMagic(path)) {
            sourceFiles = sourceFiles.concat(
                await getGlobMatches(path, globOptions)
            );
        } else {
            sourceFiles.push(path);
        }
    }

    return sourceFiles;
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
 * Compiles via node-sass; resolves with {@link external:nodeSassResult|nodeSassResult(s)},
 * rejects with {@link external:nodeSassError}.
 *
 * @param {external:nodeSassOptions} options
 * @returns {Promise}
 * @private
 * @async
 */
function compile(options) {
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
            `Invalid output: "${outFile}" is not a valid file path for "output" or "outFile".`
        );
    }

    // resolve and ensure '.css' extension
    return path.resolve(outFile.replace(/\.(s[ca]|c)ss$/, '.css'));
}

/**
 * Determines the source map file path for a given source via the "sourceMap"
 * config option and an output file path; returns an absolute path.
 *
 * @param {string} outFile
 * @param {boolean|string|module:node-sass-extra~setSourceMap} sourceMap
 * @returns {string}
 * @private
 */
function getSourceMap(outFile, sourceMap) {
    // dynamic source map; run the given iterator function
    if (typeof sourceMap === 'function') {
        sourceMap = sourceMap(outFile);
    }

    // source map is a boolean; use the output file
    if (sourceMap === true) {
        sourceMap = outFile;
    }

    // source map is a directory; append the output's basename
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
 * @param {string|string[]} sources - file paths, globs, or data strings
 * @param {module:node-sass-extra~options} options
 * @returns {external:nodeSassOptions|external:nodeSassOptions[]}
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
        task.sourceMap = getSourceMap(task.outFile, sourceMap);
    }

    return {
        ...nodeSassOptions,
        ...task,
    };
}

/**
 * Reduces a list of tasks by their common output files; tasks that share an output file will
 * have their sources combined. Data sources are concatenated directly; file sources are concatenated
 * as sass import statements.
 *
 * @param {external:nodeSassOptions|external:nodeSassOptions[]} tasks
 * @returns {external:nodeSassOptions[]}
 * @private
 *
 * @example
 * const tasks = reduceTasksByOutFile([
 *     {data: '.class1 {}', outFile: 'dest.css'},
 *     {data: '.class2 {}', outFile: 'dest.css'}
 * ]);
 *
 * console.log(tasks);
 * // [{
 * //     data: '.class1 {} .class2 {}',
 * //     outFile: 'dest.css'
 * // }]
 *
 * @example
 * const tasks = reduceTasksByOutFile([
 *     {file: 'file1.scss', outFile: 'dest.css'},
 *     {file: 'file2.scss', outFile: 'dest.css'}
 * ]);
 *
 * console.log(tasks);
 * // [{
 * //     data: '@import "file1.css"; @import "file2.css"',
 * //     outFile: 'dest.css'
 * // }]
 */
function reduceTasksByOutFile(tasks) {
    const sourceType = tasks[0].data ? 'data' : 'file';
    const outFileLookup = [];
    const reducedTasks = [];

    // groups tasks with common output files, arrayifing their sources
    arrayify(tasks).forEach(({ ...task }) => {
        const index = outFileLookup.indexOf(task.outFile);
        const source = task[sourceType];

        if (index === -1) {
            outFileLookup.push(task.outFile);
            task[sourceType] = arrayify(source);
            reducedTasks.push(task);
        } else {
            reducedTasks[index][sourceType].push(source);
        }
    });

    // map reduced tasks and concat their sources
    return reducedTasks.map(task => {
        const sources = task[sourceType];

        if (sources.length === 1) {
            task[sourceType] = sources[0];
        } else {
            delete task.file;
            task.data =
                sourceType === 'data'
                    ? sources.join('\n')
                    : joinSourceFiles(sources);
        }

        return task;
    });
}

/**
 * Validates the options passed into the compiler, ensuring required props are present.
 *
 * @param {module:node-sass-extra~options} options
 * @returns {module:node-sass-extra~options}
 * @throws {Error}
 * @private
 */
function validateOptions(options) {
    if (typeof options !== 'object') {
        throw new Error('Invalid: options is not an object');
    }

    const { data, file, output, outFile, sourceMap } = options;

    if (!file && !data) {
        throw new Error(
            'No input specified: either the "data" or "file" option is required.'
        );
    }

    if (sourceMap && (!output && !outFile)) {
        throw new Error(
            'No output specified: either the "output" or "outFile" option is required with "sourceMap".'
        );
    }

    return options;
}

/**
 * Asynchronous rendering; resolves with {@link external:nodeSassResult|nodeSassResult(s)}, rejects with
 * {@link external:nodeSassError}. If more than one source is compiled an array of results is returned.
 *
 * @param {module:node-sass-extra~options} options
 * @param {Function} [callback]
 * @returns {Promise}
 * @public
 * @async
 *
 * @example
 * const sass = require('node-sass-extra');
 *
 * sass.render({
 *     file: 'src/*.scss'
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
 *         file: 'src/*.scss'
 *         [, ...options]
 *     });
 * } catch (err) {
 *     // ...
 * }
 *
 * @example
 * const sass = require('node-sass-extra');
 *
 * sass.render(
 *     {
 *         file: 'src/*.scss'
 *         [, ...options]
 *     },
 *     function(err, result) {
 *         // ...
 *     }
 * );
 */
async function render(options, callback) {
    try {
        const { data, file, output, globOptions } = validateOptions(options);
        const sources = data || (await getSourceFiles(file, globOptions));
        let tasks = arrayify(getTasks(sources, options));

        if (tasks[0].outFile) {
            tasks = reduceTasksByOutFile(tasks);
        }

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

        const results = marshalArray(compiled);

        if (typeof callback === 'function') {
            callback(null, results);
        }

        return results;
    } catch (err) {
        if (typeof callback === 'function') {
            callback(err);
        } else {
            throw err;
        }
    }
}

/**
 * Synchronous rendering. If more than one source is compiled an array of results is returned.
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
 *     file: 'src/*.scss'
 *     [, ...options]
 * });
 */
function renderSync(options) {
    const { data, file, output, globOptions } = validateOptions(options);
    const sources = data || getSourceFilesSync(file, globOptions);
    let tasks = arrayify(getTasks(sources, options));

    if (tasks[0].outFile) {
        tasks = reduceTasksByOutFile(tasks);
    }

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
 * Version information for `node-sass-extra`, `node-sass` and `libsass`.
 *
 * @constant {string}
 * @public
 *
 * @example
 * const sass = require('node-sass-extra');
 *
 * console.log(sass.info);
 *
 * // outputs something like:
 *
 * // node-sass-extra 0.1.0   (Wrapper)       [JavaScript]
 * // node-sass       2.0.1   (Wrapper)       [JavaScript]
 * // libsass         3.1.0   (Sass Compiler) [C/C++]
 */
const info = getVersionInfo();

// Expose the API
module.exports = {
    ...sass,
    render,
    renderSync,
    info,
};
