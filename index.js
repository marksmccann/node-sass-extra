const path = require('path');
const fs = require('fs-extra');
const glob = require('glob');
const sass = require('node-sass');

// utility for determining whether a given path is a file (with a supported extension) or not
function isFile(filePath) {
    // TODO: should we harden this? it'll work fine for matching my.css, my.scss, and my.sass ...
    // but it'll also match my.ass
    return /\.(s[ca]|c)ss$/.test(filePath);
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
    return sourceFiles.reduce((flattened, fileList) => {
        return flattened.concat(fileList);
    }, []);
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
        const { data, file, output } = userOptions;

        if (!file && !data) {
            throw new Error('Either a "data" or "file" option is required.');
        }

        // don't mutate the original `options` object
        const options = { ...userOptions };

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

            if (isFile(output)) {
                await writeFile(
                    // combine the contents of each compiled file into a single string
                    compiled.reduce(
                        (content, { css }) => (content += css.toString()),
                        ''
                    ),
                    path.resolve(output)
                );
            } else {
                const outputDir = path.resolve(output);

                await Promise.all(
                    compiled.map(({ css, stats }) => {
                        const filePath = path.join(
                            outputDir,
                            stats.entry.replace(__dirname, '')
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
//         // file: ['test-files/**/*.scss', 'test-files/**/*.sass'],
//
//         // compile a single glob
//         // file: 'test-files/**/*.scss',
//
//         // compile a single data source
//         // data: '$color: red; body { color: $color; }',
//
//         // compile multiple data sources
//         data: [
//             '$color: red; body { color: $color; }',
//             '$padding: 10px; body { padding: $padding; }',
//         ],
//
//         // output to a directory
//         // output: 'dest',
//
//         // output to a single file
//         output: 'dest/compiled.css',
//     })
//     .then(compiled => console.log('Done!', compiled))
//     .catch(err => console.log('Error:', err));

module.exports = nodeSassExtra;
