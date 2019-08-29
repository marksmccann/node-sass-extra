const fs = require('fs-extra');
const sass = require('./index'); // eslint-disable-line

fs.removeSync('dest');
fs.removeSync('test-compiled');

const config = {
    // compile multiple files
    // file: ['test-files/test-scss-1.scss', 'test-files/nested/test-scss-2.scss'],

    // compile a single file
    // file: 'test-files/test-scss-1.scss',

    // compile fake single file
    // file: 'test-files/non-existant-file.scss',

    // compile multiple globs
    file: ['test-files/**/*.scss', 'test-files/**/*.sass'],

    // compile a single glob
    // file: 'test-files/**/*.scss',

    // compile a single data source
    // data: '$color: red; .data { color: $color; }',

    // compile multiple data sources
    // data: [
    //     '$color: red; .data { color: $color; }',
    //     '$padding: 10px; .data-2 { padding: $padding; }',
    // ],

    // output to a directory
    // output: 'dest',
    outFile: 'dest',

    // dynamic output
    // output: sourcePath => {
    //     return sourcePath.replace('test-files', 'dest');
    // },
    // outFile: sourcePath => {
    //     return sourcePath.replace('test-files', 'test-compiled');
    // },

    // dynamic output returns a directory
    // output: () => {
    //     return 'dest';
    // },
    // outFile: () => {
    //     return 'dest';
    // },

    // dynamic output w/concatenation
    // output: sourcePath => {
    //     const replaced = /\.scss$/.test(sourcePath) ? 'from-scss.css' : 'from-sass.css';
    //     return 'test-dest/' + replaced;
    // },
    // outFile: sourcePath => {
    //     const replaced = /\.scss$/.test(sourcePath) ? 'from-scss.css' : 'from-sass.css';
    //     return 'test-dest/' + replaced;
    // },

    // output to a single file
    // output: 'dest/compiled.css',
    // outFile: 'dest/compiled.css',

    // source map
    // sourceMap: true,

    // single source map
    // sourceMap: 'dest/compiled.css.map',

    // source map directory
    // sourceMap: 'dest',

    // dynamic source map
    // sourceMap: outPath => {
    //     return outPath.replace('dest', 'test-compiled')
    // },

    // dynamic source map directory
    // sourceMap: () => {
    //     return 'test-compiled';
    // },
};

//
// Sync
//
console.log('\n--- Sync ---\n', sass.renderSync(config));

//
// Async
//
// sass.render(config)
//     .then(compiled => {
//         console.log('\n--- Async ---\n', compiled);
//     })
//     .catch(err => {
//         console.log(err);
//     });

//
// Async (w/ Callback)
//
// sass.render(config, (err, compiled) => {
//     if (err) {
//         console.log(err);
//     } else {
//         console.log('\n--- Async (w/ Callback) ---\n', compiled);
//     }
// });

//
// Info
//
// console.log(sass.info);

//
// Types
//
// console.log(sass.types);
// console.log(sass.TRUE);
// console.log(sass.FALSE);
// console.log(sass.NULL);
