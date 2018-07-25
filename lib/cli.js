const minimist = require('minimist')
const args = minimist(process.argv.slice(2))

// we're being used from the command line
switch (args.exec) {
  case 'foo':
    console.log('do foo')
    break
  case 'bar':
    // for simple testing in the monorepo
    console.log('do bar')
    break
  default:
    // export our node module interface
    console.log('default thing')
}
