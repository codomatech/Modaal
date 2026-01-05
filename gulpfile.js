var gulp = require('gulp'),
	sass = require('gulp-sass')(require('sass')),
	autoprefixer = require('gulp-autoprefixer'),
	uglify = require('gulp-uglify'),
	rename = require('gulp-rename'),
	notify = require('gulp-notify'),
	del = require('del'),
	mmq = require('gulp-merge-media-queries'),
	cleanCSS = require('gulp-clean-css');


// Development tasks
// ----------------------------------------------------------------------

gulp.task('styles', function() {
	return gulp.src('source/css/modaal.scss')
		.pipe(sass({
			outputStyle: 'expanded'
		})
			.on('error', sass.logError))
		.pipe(autoprefixer({
			overrideBrowserslist: ['last 3 versions', 'Explorer > 8', 'android 4']
		}))
		.pipe(mmq({
			log: true
		}))
		.pipe(gulp.dest('source/css'))
		.pipe(notify({
			message: 'Modaal styles task complete'
		}));
});

// For demo website only, can be removed
gulp.task('demo-styles', function() {
	return gulp.src('demo/css/demo.scss')
		.pipe(sass({
			outputStyle: 'expanded'
		})
			.on('error', sass.logError))
		.pipe(autoprefixer({
			overrideBrowserslist: ['last 2 version', 'ie 8', 'ie 9']
		}))
		.pipe(gulp.dest('demo/css'))
		.pipe(notify({
			message: 'Demo styles task complete'
		}));
});

gulp.task('watch', function() {
	gulp.watch('source/css/*.scss', gulp.series('styles'));
	gulp.watch('demo/css/*.scss', gulp.series('demo-styles'));
});



// Distribute tasks
// ----------------------------------------------------------------------

gulp.task('min-modaal', function() {
	// Minify JS
	gulp.src(['source/js/modaal.js'])
		.pipe(uglify({
			output: {
				comments: /^!/
			}
		}))
		.pipe(rename({
			suffix: '.min',
			extname: '.js'
		}))
		.pipe(gulp.dest('dist/js/'))
		.pipe(notify({
			message: 'Successfully uglified Modaal.'
		}));

	// Minify CSS
	return gulp.src(['source/css/*.css'])
		.pipe(cleanCSS({compatibility: 'ie9'}))
		.pipe(rename({
			extname : '.min.css'
		}))
		.pipe(gulp.dest('dist/css/'))
		.pipe(notify({ message: 'Min copy created.' }));
});

gulp.task('copy-to-dist', function() {
	// copy JS
	gulp.src('source/js/modaal.js')
		.pipe(gulp.dest('dist/js/'));

	// copy SCSS
	gulp.src('source/css/modaal.scss')
		.pipe(gulp.dest('dist/css/'));

	// copy CSS
	return gulp.src('source/css/modaal.css')
		.pipe(gulp.dest('dist/css/'))
		.pipe(notify({
			message: 'Moved to dist.'
		}));
});

// Now run in order (Gulp 4 syntax)
gulp.task('dist', gulp.series('min-modaal', 'copy-to-dist'));

// Default task
gulp.task('default', gulp.series('styles'));
