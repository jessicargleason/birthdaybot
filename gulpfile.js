var {watch, src, dest} = require('gulp');
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer');
var nested = require('postcss-nested');
var cssImport = require('postcss-import');
var tailwindcss = require('tailwindcss');


function styles(){
    return src('src/style.css')
     .pipe(postcss([cssImport, nested, autoprefixer, tailwindcss]))
     .pipe(dest('public'))
};

exports.default = function() {
    watch('src/*.css', styles);
};