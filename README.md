# node-sass-extra

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Open Source Love](https://badges.frapsoft.com/os/mit/mit.svg?v=102)](https://github.com/ellerbrock/open-source-badge/)
[![Open Source Love](https://badges.frapsoft.com/os/v2/open-source.svg?v=102)](https://github.com/ellerbrock/open-source-badge/)
[![GitHub issues](https://img.shields.io/github/issues/marksmccann/node-sass-extra)](https://github.com/marksmccann/node-sass-extra/issues)
[![Build Status](https://travis-ci.com/marksmccann/node-sass-extra.svg?branch=master)](https://travis-ci.com/marksmccann/node-sass-extra)

A drop-in replacement for [node-sass](https://github.com/sass/node-sass)' Node API that adds support for globs, promises and more.

:heavy_check_mark: Glob support  
:heavy_check_mark: Promise support  
:heavy_check_mark: Write files  
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

## API

<a name="module_node-sass-extra"></a>

## node-sass-extra
The Node API for `node-sass-extra`.


* [node-sass-extra](#module_node-sass-extra)
    * [~info](#module_node-sass-extra..info) : <code>string</code>
    * [~render(options, [callback])](#module_node-sass-extra..render) ⇒ <code>Promise</code>
    * [~renderSync(options)](#module_node-sass-extra..renderSync) ⇒ [<code>nodeSassResult</code>](https://github.com/sass/node-sass#result-object) \| [<code>Array.&lt;nodeSassResult&gt;</code>](https://github.com/sass/node-sass#result-object)
    * [~options](#module_node-sass-extra..options) : <code>object</code>
    * [~setOutFile](#module_node-sass-extra..setOutFile) ⇒ <code>string</code>
    * [~setSourceMap](#module_node-sass-extra..setSourceMap) ⇒ <code>string</code> \| <code>boolean</code>

<a name="module_node-sass-extra..info"></a>

### node-sass-extra~info : <code>string</code>
Version information for `node-sass-extra`, `node-sass` and `libsass`.

**Kind**: inner constant of [<code>node-sass-extra</code>](#module_node-sass-extra)  
**Access**: public  
**Example**  
```js
const sass = require('node-sass-extra');

console.log(sass.info);

// outputs something like:

// node-sass-extra 0.1.0   (Wrapper)       [JavaScript]
// node-sass       2.0.1   (Wrapper)       [JavaScript]
// libsass         3.1.0   (Sass Compiler) [C/C++]
```
<a name="module_node-sass-extra..render"></a>

### node-sass-extra~render(options, [callback]) ⇒ <code>Promise</code>
Asynchronous rendering; resolves with [nodeSassResult(s)](https://github.com/sass/node-sass#result-object), rejects with
[nodeSassError](https://github.com/sass/node-sass#error-object). If more than one source is compiled an array of results is returned.

**Kind**: inner method of [<code>node-sass-extra</code>](#module_node-sass-extra)  
**Access**: public  

| Param | Type |
| --- | --- |
| options | [<code>options</code>](#module_node-sass-extra..options) | 
| [callback] | <code>function</code> | 

**Example**  
```js
const sass = require('node-sass-extra');

sass.render({
    file: 'src/*.scss'
    [, ...options]
})
    .then(result => {
        // ...
    })
    .catch(err => {
        // ...
    });
```
**Example**  
```js
const sass = require('node-sass-extra');

try {
    const result = await sass.render({
        file: 'src/*.scss'
        [, ...options]
    });
} catch (err) {
    // ...
}
```
**Example**  
```js
const sass = require('node-sass-extra');

sass.render(
    {
        file: 'src/*.scss'
        [, ...options]
    },
    function(err, result) {
        // ...
    }
);
```
<a name="module_node-sass-extra..renderSync"></a>

### node-sass-extra~renderSync(options) ⇒ [<code>nodeSassResult</code>](https://github.com/sass/node-sass#result-object) \| [<code>Array.&lt;nodeSassResult&gt;</code>](https://github.com/sass/node-sass#result-object)
Synchronous rendering. If more than one source is compiled an array of results is returned.

**Kind**: inner method of [<code>node-sass-extra</code>](#module_node-sass-extra)  
**Throws**:

- [<code>nodeSassError</code>](https://github.com/sass/node-sass#error-object) 

**Access**: public  

| Param | Type |
| --- | --- |
| options | [<code>options</code>](#module_node-sass-extra..options) | 

**Example**  
```js
const sass = require('node-sass-extra');

const result = sass.renderSync({
    file: 'src/*.scss'
    [, ...options]
});
```
<a name="module_node-sass-extra..options"></a>

### node-sass-extra~options : <code>object</code>
A `node-sass-extra` config object.

**Kind**: inner typedef of [<code>node-sass-extra</code>](#module_node-sass-extra)  
**Extends**: [<code>nodeSassOptions</code>](https://github.com/sass/node-sass#options)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| data | <code>string</code> \| <code>Array.&lt;string&gt;</code> | String(s) to be compiled. |
| file | <code>string</code> \| <code>Array.&lt;string&gt;</code> | File(s) to be compiled; can be a file path or a glob pattern. |
| output | <code>string</code> \| [<code>setOutFile</code>](#module_node-sass-extra..setOutFile) | The output destination; can be a file path, a directory, or a [callback](#module_node-sass-extra..setOutFile) that returns a file path or directory. Must be/return a file path when paried with `data`. If provided, files will be written to disk. |
| outFile | <code>string</code> \| [<code>setOutFile</code>](#module_node-sass-extra..setOutFile) | The output destination; can be a file path, a directory, or a [callback](#module_node-sass-extra..setOutFile) that returns a file path or directory. Must be/return a file path when paried with `data`. `output` will override this value if provided. |
| sourceMap | <code>string</code> \| [<code>setSourceMap</code>](#module_node-sass-extra..setSourceMap) | The source map destination; can be a boolean, a file path, a directory, or a [callback](#module_node-sass-extra..setSourceMap) that returns a boolean, file path or directory. If a boolean or directory, the file will be named after the output file. |
| ... | <code>\*</code> | [nodeSassOptions](https://github.com/sass/node-sass#options) |

**Example**  
```js
// compiles and writes file
{
    file: 'src/file.scss',
    output: 'css/file.css'
}
```
**Example**  
```js
// compiles and creates source maps, but does NOT write them
{
    file: 'src/*.scss',
    outFile: 'css',
    sourceMap: true
}
```
**Example**  
```js
// compiles and creates source maps; writes css to `css/` and source maps to `maps/`
{
    file: ['src/file1.scss', 'src/file2.scss'],
    output: 'css',
    sourceMap: 'maps'
}
```
**Example**  
```js
// compiles and creates source map; writes css to `css/file.css` and source map to `css/file.css.map`
{
    data: '$color: red; .foo { background: $color; } ...',
    output: 'css/file.css',
    sourceMap: true
}
```
**Example**  
```js
// compiles multiple files and writes all to single file
{
    file: 'src/*.scss',
    output: 'main.css'
}
```
**Example**  
```js
// compile compressed css and write to file with `.min` suffix
{
    file: 'src/*.scss',
    output: srcFile => srcFile.replace(/.scss$/, '.min.css'),
    outputStyle: 'compressed'
}
```
<a name="module_node-sass-extra..setOutFile"></a>

### node-sass-extra~setOutFile ⇒ <code>string</code>
Callback for dynamically defining the output path via the source file.

**Kind**: inner typedef of [<code>node-sass-extra</code>](#module_node-sass-extra)  
**Returns**: <code>string</code> - A file path or directory.  

| Param | Type | Description |
| --- | --- | --- |
| srcFile | <code>string</code> | The source file path. |

**Example**  
```js
render({
    file: 'src/path/to/file.scss',
    output: srcFile => {
        // returns 'css/path/to/file.css';
        return srcFile.replace(/src\//, 'css/');
    }
});
```
<a name="module_node-sass-extra..setSourceMap"></a>

### node-sass-extra~setSourceMap ⇒ <code>string</code> \| <code>boolean</code>
Callback for dynamically defining the source map's output path via the
output and/or source file.

**Kind**: inner typedef of [<code>node-sass-extra</code>](#module_node-sass-extra)  
**Returns**: <code>string</code> \| <code>boolean</code> - A file path, directory or boolean.  

| Param | Type | Description |
| --- | --- | --- |
| outFile | <code>string</code> | The output file path. |

**Example**  
```js
render({
    file: 'src/path/to/file.scss',
    outFile: 'css',
    sourceMap: (outFile) => {
        // returns 'map/file.css.map';
        return outFile.replace(/css\//, 'map/');
    }
});
```
