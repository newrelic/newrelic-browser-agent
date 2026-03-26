var gulp = require('gulp');
var exec = require('child_process').exec;

// iOS本番ビルドタスク
gulp.task('ios-prod', function (done) {
  console.log('Building for iOS production...');
  build_prod(
    'ios',
    ' --base-href /store-cloud-asia1-terminal-storage-tst1-01/NCJ-test/ios-test-x/sampleAPP-page/'
  );
  done();
});
// Chrome GCPビルドタスク
gulp.task('chrome-gcp', function (done) {
  console.log('Building for Chrome GCP...');
  build_prod(
    'chrome',
    ' --base-href /store-cloud-asia1-terminal-storage-tst1-01/common-ui-sample-page-after-test/'
  );
  done();
});

function build_prod(envConfig, path) {
  exec(
    'ng build --configuration production' + path,
    function (err, stdout, stderr) {
      console.log(stdout);
      console.log(stderr);
      if (err) {
        throw err;
      }
    }
  );
}

// 開発用のデフォルトタスク
gulp.task('default', function (done) {
  console.log('Available tasks:');
  console.log('  gulp ios-prod - Build for iOS production');
  console.log('  gulp chrome-gcp - Build for Chrome GCP');
  done();
});
