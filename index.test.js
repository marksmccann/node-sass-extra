const sass = require('./index');

test('should return `hello world`', () => {
    expect(sass()).toEqual('hello world');
});
