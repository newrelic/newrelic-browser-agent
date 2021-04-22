/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var gulp = require('gulp')

gulp.task('default', gulp.series(require('./gulp-build')))
