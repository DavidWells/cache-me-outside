const { writeFile } = require('./utils/fs')

module.exports = function saveCacheFile(hash, filePath) {
  const date = new Date()
  const contents = JSON.stringify({
    hash: hash,
    timestamp: date.getTime(),
    date: date.toUTCString()
  }, null, 2)
  return writeFile(filePath, contents)
}
