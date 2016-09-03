'use strict';

const path = require('path');
const gulp = require('gulp');
const gulpif = require('gulp-if');

global.config = {
  polymerJsonPath: path.join(process.cwd(), 'polymer.json'),
  build: {
    rootDirectory: 'build',
    bundledDirectory: 'bundled',
    unbundledDirectory: 'unbundled',
    bundleType: 'both'
  }
}

const polymer = require('polymer-build');
const polymerJSON = require(global.config.polymerJsonPath);
const project = new polymer.PolymerProject(polymerJSON);
const cssnano = require('gulp-cssnano');
const mergeStream = require('merge-stream');
const del = require('del');

function source(){
  return project.sources().pipe(project.splitHtml())
      .pipe(gulpif('**/*.css', cssnano()))
      .pipe(project.rejoinHtml());
}

function dependencies(){
  return project.dependencies().pipe(project.splitHtml())
      .pipe(project.rejoinHtml());
}

function merge(source, dependencies) {
  return function output() {
    const mergedFiles = mergeStream(source(), dependencies())
      .pipe(project.analyzer);
    const bundleType = global.config.build.bundleType;
    let outputs = [];

    if (bundleType === 'both' || bundleType === 'bundled') {
      outputs.push(writeBundledOutput(polymer.forkStream(mergedFiles)));
    }
    if (bundleType === 'both' || bundleType === 'unbundled') {
      outputs.push(writeUnbundledOutput(polymer.forkStream(mergedFiles)));
    }

    return Promise.all(outputs);
  };
}

const bundledPath = path.join(global.config.build.rootDirectory, global.config.build.bundledDirectory);
const unbundledPath = path.join(global.config.build.rootDirectory, global.config.build.unbundledDirectory);

function writeBundledOutput(stream) {
  return new Promise(resolve => {
    stream.pipe(project.bundler)
      .pipe(gulp.dest(bundledPath))
      .on('end', resolve);
  });
}

function writeUnbundledOutput(stream) {
  return new Promise(resolve => {
    stream.pipe(gulp.dest(unbundledPath))
      .on('end', resolve);
  });
}

function clean(){
  return del(global.config.build.rootDirectory);
}

gulp.task('default', gulp.series([
  clean,
  merge(source, dependencies)
]));