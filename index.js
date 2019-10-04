/**
 * The Node API for `node-sass-extra`.
 */

const path = require('path');
const fs = require('fs-extra');
const glob = require('glob');
const sass = require('node-sass');
const eol = require('os').EOL;
const pkg = require('./package.json');

/**
 * Gets version information.
 */
function getVersionInfo() {
    const versionInfo = [
        'node-sass-extra',
        pkg.version,
        '(Wrapper)',
        '[JavaScript]'
    ].join('\t');
    return versionInfo + eol + sass.info;
}

/**
 * Utility for determining whether a given path is a file.
 */
function isFile(filePath) {
    return /\.\S+$/.test(filePath);
}

/**
 * Utility for coercing a given item into an array.
 */
function arrayify(item) {
    return [].concat(item);
}

/**
 * Utlitity for marshalling array data; if an array contains only a single item, the item is
 * returned. Otherwise, the entire array is returned.
 */
function marshalArray(arrayData) {
    return arrayData.length === 1 ? arrayData[0] : arrayData;
}

/**
 * Joins a list of file paths as sass import statements.
 */
function joinSourceFiles(files) {
    return arrayify(files)
        .map(file => `@import '${path.resolve(file)}';`)
        .join('\n');
}

/**
 * Retrieves a list of file paths that match a given glob pattern; returns promise.
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
 * Asynchronously takes source file(s) and returns a list of files to be compiled; returns promise.
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
 * Synchronously compiles via node-sass.
 */
function compileSync(options) {
    return sass.renderSync(options);
}

/**
 * Asynchronously compiles via node-sass; returns promise.
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
 */
function writeFileSync(content, filePath) {
    fs.ensureDirSync(path.dirname(filePath));
    fs.writeFileSync(filePath, content);
}

/**
 * Asynchronously writes content to disk at the given destination; returns promise.
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
        ...task
    };
}

/**
 * Reduces a list of tasks by their common output files; tasks that share an output file will
 * have their sources combined. Data sources are concatenated directly; file sources are concatenated
 * as sass import statements.
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
 * Asynchronous rendering.
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
 * Synchronous rendering.
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
 * Version info.
 */
const info = getVersionInfo();

// Expose the API
module.exports = {
    ...sass,
    render,
    renderSync,
    info
};
