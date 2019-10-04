![npm](https://img.shields.io/npm/v/node-sass-extra)
![Travis (.org)](https://img.shields.io/travis/marksmccann/node-sass-extra)
![Libraries.io dependency status for GitHub repo](https://img.shields.io/librariesio/github/marksmccann/node-sass-extra)
[![GitHub stars](https://img.shields.io/github/stars/marksmccann/node-sass-extra)](https://github.com/marksmccann/node-sass-extra/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/marksmccann/node-sass-extra)](https://github.com/marksmccann/node-sass-extra/issues)
[![GitHub license](https://img.shields.io/github/license/marksmccann/node-sass-extra)](https://github.com/marksmccann/node-sass-extra/blob/master/LICENSE)
[![Open Source Love](https://badges.frapsoft.com/os/v2/open-source.svg?v=102)](https://github.com/ellerbrock/open-source-badge/)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

# node-sass-extra

A drop-in replacement for [node-sass](https://github.com/sass/node-sass)' Node API that adds support for globs, promises and more.

## Why?

:heavy_check_mark: Glob support  
:heavy_check_mark: Promise support  
:heavy_check_mark: Write css  
:heavy_check_mark: Write source maps  
:heavy_check_mark: Output to directory  
:heavy_check_mark: Dynamically define output destination  
:heavy_check_mark: Compile multiple files at once  
:heavy_check_mark: Compile multiple files into single output  
:heavy_check_mark: Sync and async support  
:heavy_check_mark: Non-breaking `node-sass` API  

## Install

```shell
npm install node-sass-extra -D
```

## Usage

```js
const sass = require('node-sass-extra');

const results = await sass.render({
    file: 'src/**/*.scss',
    [, ...options]
});

// OR

const results = sass.renderSync({
    file: 'src/**/*.scss',
    [, ...options]
});
```

## Options

|Name|Type|Description|
|----|----|-----------|
|data|`string` \| `string[]`|String(s) to be compiled.|
|file|`string` \| `string[]`|File(s) to be compiled; can be a file path or a glob pattern.|
|output|`string` \| `function`|The output destination; if provided, files WILL be written to disk. Can be a file path, a directory, or a callback that returns a file path or directory. Must be/return a file path when paired with `data`.|
|outFile|`string` \| `function`|The output destination; does NOT write files to disk. Can be a file path, a directory, or a callback that returns a file path or directory. Must be/return a file path when paired with `data`. `output` will override this value if provided.|
|sourceMap|`string` \| `function`|The source map destination. If paired with `output`, source maps WILL be written to disk. Either the `output` or `outFile` option must be set to use this option. Can be a boolean, a file path, a directory, or a callback that returns a boolean, file path or directory. If a boolean or directory, the file will be named after the output file.|
|globOptions|`object`|The [configuration options](https://www.npmjs.com/package/glob#options) for the glob pattern.|
|...||All other [`node-sass` options](https://github.com/sass/node-sass#options).|

### Examples

```js
// compile but don't write files
const results = await sass.render({
    file: 'src/**/*.scss',
    outFile: 'css'
});

// write css and source maps
await sass.render({
    file: 'src/**/*.scss',
    output: 'css',
    sourceMap: true
});

// add `.min` suffix to compressed output
await sass.render({
    file: 'src/**/*.scss',
    output: srcFile => srcFile.replace(/.scss$/, '.min.css'),
    outputStyle: 'compressed'
});

// ignore sass partials
await sass.render({
    file: 'src/**/*.scss',
    output: 'css',
    globOptions: {
        ignore: '_*.scss',
        follow: true
    }
});

// combine multiple sources into a single output
await sass.render({
    file: 'src/**/*.scss',
    output: 'main.css'
});

// dynamically determine the css and source map destinations
await sass.render({
    file: 'src/**/*.scss',
    output: srcFile => srcFile.replace(/src\//, 'css/'),
    sourceMap: destFile => destFile.replace(/css\//, 'maps/')
});
```

## API

### sass.render(options[, callback])

Asynchronous rendering; returns a promise. Promise resolves with a [result object(s)](https://github.com/sass/node-sass#result-object) and rejects with an
[error object](https://github.com/sass/node-sass#error-object). If more than one source is compiled an array of results is returned.

```js
const sass = require('node-sass-extra');

const results = await sass.render({
    file: 'src/**/*.scss'
    [, ...options]
});
```

### sass.renderSync(options)

Synchronous rendering; returns a [result object(s)](https://github.com/sass/node-sass#result-object). If more than one source is compiled an array of results is returned.

```js
const sass = require('node-sass-extra');

const results = sass.renderSync({
    file: 'src/**/*.scss'
    [, ...options]
});
```

### sass.info

Version information for `node-sass-extra`, `node-sass` and `libsass`.

```js
const sass = require('node-sass-extra');

console.log(sass.info);

// outputs something like:

// node-sass-extra 0.1.0   (Wrapper)       [JavaScript]
// node-sass       2.0.1   (Wrapper)       [JavaScript]
// libsass         3.1.0   (Sass Compiler) [C/C++]
```