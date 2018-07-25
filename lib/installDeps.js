const path = require('path')
const execPromise = require('./utils/execPromise')
const { fileExists } = require('./utils/fs')

module.exports = function npmInstall(opts, dir) {
  const lockFilePath = path.join(opts.cwd, 'package-lock.json')
  return fileExists(lockFilePath).then((hasLock) => {
    if (hasLock) {
      // run faster ci command if package-lock.json exists
      return execPromise(`npm ci`, opts)
    }
    return execPromise(`npm install`, opts)
  })
}
