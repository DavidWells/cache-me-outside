const childProcess = require('child_process')
const exec = childProcess.exec

module.exports = function execPromise(script, opts) {
  const options = opts || {}
  return new Promise((resolve, reject) => {
    const process = exec(script, options, (error, stdout, stderr) => {
      if (error) {
        return reject(stderr)
      }
      return resolve(stdout)
    })
    process.stdout.on('data', (data) => {
      console.log(`  ${data}`)
    })
    process.stderr.on('data', (data) => {
      console.log(`  ${data.toString()}`)
    })
    process.on('exit', (code) => {
      // console.log('child process exited with code ' + code.toString())
    })
  })
}
