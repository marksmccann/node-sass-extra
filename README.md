# node-sass-extra

A drop-in replacement for [node-sass](https://github.com/sass/node-sass) that adds support for globs, promises and more.

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)


# API

<a name="module_node-sass-extra"></a>

## node-sass-extra
The Node API for `node-sass-extra`.


* [node-sass-extra](#module_node-sass-extra)
    * [~render(options)](#module_node-sass-extra..render) ⇒ <code>Promise</code>
    * [~renderSync(options)](#module_node-sass-extra..renderSync) ⇒ [<code>nodeSassResult</code>](https://github.com/sass/node-sass#result-object) \| [<code>Array.&lt;nodeSassResult&gt;</code>](https://github.com/sass/node-sass#result-object)
    * [~options](#module_node-sass-extra..options) : <code>object</code>
    * [~setOutFile](#module_node-sass-extra..setOutFile) ⇒ <code>string</code>
    * [~setSourceMap](#module_node-sass-extra..setSourceMap) ⇒ <code>string</code>

<a name="module_node-sass-extra..render"></a>

### node-sass-extra~render(options) ⇒ <code>Promise</code>
Asynchronous rendering; maps to nodeSass.render. Resolves with [nodeSassResult](https://github.com/sass/node-sass#result-object);
rejects with [nodeSassError](https://github.com/sass/node-sass#error-object). If more than one source is compiled an array of results is returned.

**Kind**: inner method of [<code>node-sass-extra</code>](#module_node-sass-extra)  
**Access**: public  

| Param | Type |
| --- | --- |
| options | [<code>options</code>](#module_node-sass-extra..options) | 

**Example**  
```js
const sass = require('node-sass-extra');

sass.render({
    file: 'src/*.scss',
    output: 'css'
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
        file: 'src/*.scss',
        output: 'css'
        [, ...options]
    });
} catch (err) {
    // ...
}
```
<a name="module_node-sass-extra..renderSync"></a>

### node-sass-extra~renderSync(options) ⇒ [<code>nodeSassResult</code>](https://github.com/sass/node-sass#result-object) \| [<code>Array.&lt;nodeSassResult&gt;</code>](https://github.com/sass/node-sass#result-object)
Synchronous rendering; maps to nodeSass.renderSync. If more than one source is compiled
an array of results is returned.

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
    file: 'src/*.scss',
    output: 'css'
    [, ...options]
});
```
**Example**  
```js
const sass = require('node-sass-extra');

try {
    const result = sass.renderSync({
        file: 'src/*.scss',
        output: 'css'
        [, ...options]
    });
} catch(err) {
    // ...
};
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
| output | <code>string</code> \| [<code>setOutFile</code>](#module_node-sass-extra..setOutFile) | The output destination; can be a file path, a directory, or a callback that returns a file path or directory. Must be/return a file path when paried with `data`. If provided, files will be written to disk. |
| outFile | <code>string</code> \| [<code>setOutFile</code>](#module_node-sass-extra..setOutFile) | The output destination; can be a file path, a directory, or a callback that returns a file path or directory. Must be/return a file path when paried with `data`. `output` will override this value if provided. |
| sourceMap | <code>string</code> \| [<code>setSourceMap</code>](#module_node-sass-extra..setSourceMap) | The source map destination; can be a boolean, a file path, a directory, or a callback that returns a file path or directory. If a boolean or directory, the file will be named after the output file. |
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
// compiles and creates source map; writes css and source map to `css/file.css.map`
{
    data: '$color: red; .foo { background: $color; } ...',
    output: 'css/file.css',
    sourceMap: true
}
```
<a name="module_node-sass-extra..setOutFile"></a>

### node-sass-extra~setOutFile ⇒ <code>string</code>
Callback for dynamically defining the output path via the source
file; must return a valid file path.

**Kind**: inner typedef of [<code>node-sass-extra</code>](#module_node-sass-extra)  
**Returns**: <code>string</code> - A file path.  

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

### node-sass-extra~setSourceMap ⇒ <code>string</code>
Callback for dynamically defining the source map's output path via the
output and/or source files; must return a valid file path.

**Kind**: inner typedef of [<code>node-sass-extra</code>](#module_node-sass-extra)  
**Returns**: <code>string</code> - A file path.  

| Param | Type | Description |
| --- | --- | --- |
| outFile | <code>string</code> | The output file path. |
| srcFile | <code>string</code> | The source file path. |

**Example**  
```js
render({
    file: 'src/path/to/file.scss',
    outFile: 'css',
    sourceMap: (outFile, srcFile) => {
        // returns 'map/file.css.map';
        return outFile.replace(/css\//, 'map/');
    }
});
```
