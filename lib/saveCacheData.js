const { writeFile } = require('./utils/fs')
const hashFolder = require('./utils/dirSum')

module.exports = async function saveCacheFile(hash, filePath, directory) {
  const date = new Date()
  const folderHash = await hashFolder(directory)
  const contents = JSON.stringify({
    hash: hash,
    diffs: {},
    timestamp: date.getTime(),
    date: date.toUTCString(),
    contents: {
      path: directory,
      hash: folderHash.hash,
      files: folderHash.files
    }
  }, null, 2)
  return writeFile(filePath, contents)
}
