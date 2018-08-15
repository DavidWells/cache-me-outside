const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')
const isInvalidFilePath = require('is-invalid-path')
const execPromise = require('./execPromise')
const prefix = require('./prefix')
const consolePrefix = prefix('')

module.exports = {
  writeFile: writeFile,
  readFile: readFile,
  fileExists: fileExists,
  createDirectory: createDirectory,
  removeDirectory: removeDirectory,
  copyDirectory: copyDirectory,
}

function createDirectory(dist) {
  // Valid path is a path
  if (isInvalidFilePath(dist) || isInvalidFilePath(dist)) {
    throw new Error(`Not a valid file path. ${dist}`)
  }
  const makeDirectoryCommand = `mkdir -p ${dist}`
  return execPromise(makeDirectoryCommand)
}

function removeDirectory(dir) {
  if (isInvalidFilePath(dir) || isInvalidFilePath(dir)) {
    throw new Error(`Not a valid file path. ${dir}`)
  }
  return new Promise((resolve, reject) => {
    rimraf(dir, function (error) {
      if (error) {
        return reject(error)
      }
      return resolve(true)
    })
  })
}

async function copyDirectory(src, dist) {
  const finalSrc = src.replace(/\/$/, '')
  // Valid path is a path
  if (isInvalidFilePath(src) || isInvalidFilePath(dist)) {
    throw new Error('Not a valid file path')
  }

  const dir = path.dirname(dist)
  const dirExists = await fileExists(dist)
  if (!dirExists) {
    await createDirectory(dir)
  }

  const copyCommand = `rsync -ahr ${finalSrc}/ ${dist} --recursive`
  // const copyCommand = `cp -r ${src}/* ${dist}`
  return execPromise(copyCommand)
}

function writeFile(file, contents) {
  return new Promise(async (resolve, reject) => {
    const dir = path.dirname(file)
    const dirExists = await fileExists(dir)
    if (!dirExists) {
      await createDirectory(dir)
    }
    fs.writeFile(file, contents, (error) => {
      if (error) {
        return reject(error)
      }
      return resolve()
    })
  })
}

function readFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (error, data) => {
      if (error) {
        return reject(error)
      }
      return resolve(data)
    })
  })
}

function fileExists(filePath) {
  return new Promise((resolve, reject) => {
    fs.access(filePath, fs.F_OK, (err) => {
      if (err) {
        // console.log(`${consolePrefix} No ${filePath} found. Proceeding`)
        return resolve(false) // eslint-disable-line
      }
      return resolve(true)
    })
  })
}

// Future window support
function copySyncWindows(src, dist) {
  const srcWindows = src.replace(/\//gim, '\\')
  const distWindows = dist.replace(/\//gim, '\\')
  // Valid path is a path
  if (isInvalidFilePath(src) || isInvalidFilePath(dist)) {
    throw new Error('Not a valid file path')
  }
  execSync("xcopy /y /q \"" + srcWindows + "\\*\" \"" + distWindows + "\\\"") // eslint-disable-line
}
