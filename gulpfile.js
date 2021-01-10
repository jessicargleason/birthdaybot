var gulp = require('gulp');
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer');
var nested = require('postcss-nested');
var cssImport = require('postcss-import');


gulp.task('styles', function(){
    return gulp.src('src/style.css')
     .pipe(postcss([cssImport, nested, autoprefixer]))
     .pipe(gulp.dest('public'))
   });