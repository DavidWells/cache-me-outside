var minimist = require('minimist');
var args = minimist(process.argv.slice(2));

// we're being used from the command line
switch (args.exec) {
  case 'install':
    console.log('do install')
    break;
  case 'verify':
    // for simple testing in the monorepo
    console.log('verify')

    break;
  default:
    // export our node module interface
    console.log('default thing')
}
