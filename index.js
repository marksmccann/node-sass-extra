const path = require('path');
const fs = require('fs-extra');
const sass = require('node-sass');

// utility for determining whether a given path is a file (with a supported extension) or not
function isFile(filePath) {
    // TODO: should we harden this? it'll work fine for matching my.css, my.scss, and my.sass ...
    // but it'll also match my.ass
    return /\.s?(c|a)ss$/.test(filePath);
}

// compiles a given source (file or string) to CSS via node-sass; returns a promise
function compile(source, options) {
    const filePath = path.resolve(source);
    const sourceObj = isFile(filePath)
        ? { file: filePath }
        : { data: filePath };

    // console.log('sourceObj', sourceObj);
    return new Promise((resolve, reject) => {
        sass.render(
            {
                ...sourceObj,
                ...options,
            },
            (err, result) => {
                if (err) {
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
        Promise.reject(err);
    }
}

// async rendering of source files; maps to nodeSass.render
async function render(options = {}) {
    try {
        const { data, file, output } = options;
        const sources = file || data;

        if (!sources) {
            throw new Error('Either a "data" or "file" option is required.');
        }

        // clean up the options obj to pass to node-sass
        delete options.data;
        delete options.file;
        delete options.output;

        //
        // NOTE:
        // `data` is currently unsupported; working just with `file` for proof of concept
        //

        const isSourceArray = Array.isArray(sources);

        let result = isSourceArray
            ? await Promise.all(sources.map(source => compile(source, options)))
            : await compile(sources, options);

        // write compiled files to disk?
        if (output) {
            // arrayify results for easier handling
            const compiled = [].concat(result);

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
        return result;
    } catch (err) {
        console.error(err);
        return err;
    }
}

const nodeSassExtra = {
    render,
};

// dev - DELETE ME
nodeSassExtra.render({
    // compile multiple files
    file: ['test-files/test.scss', 'test-files/nested/test.scss'],

    // compile a single file
    // file: 'test-files/test.scss',

    // output to a directory
    // output: 'dest',

    // output to a single file
    output: 'dest/compiled.css',
});

module.exports = nodeSassExtra;

// function sass() {
//     return 'hello world';
// }
//
// module.exports = sass;
