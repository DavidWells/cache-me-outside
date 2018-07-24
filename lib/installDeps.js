const execPromise = require('./utils/execPromise')

module.exports = function npmInstall(opts) {
  return execPromise(`npm install`, opts)
}
