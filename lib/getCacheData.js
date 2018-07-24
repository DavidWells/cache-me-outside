const { readFile, fileExists } = require('./utils/fs')

module.exports = async function getCacheFile(filePath) {
  const fileDoesExist = await fileExists(filePath)
  if (!fileDoesExist) {
    console.log('No cache found')
    return false
  }

  return readFile(filePath).then((data) => JSON.parse(data))
}
