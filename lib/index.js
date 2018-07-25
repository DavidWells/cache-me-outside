const path = require('path')
const hashFile = require('./utils/hashFile')
const installDeps = require('./installDeps')
const saveCacheData = require('./saveCacheData')
const getCacheData = require('./getCacheData')
const prefix = require('./utils/prefix')
const execPromise = require('./utils/execPromise')
const {
  fileExists,
  createDirectory,
  copyDirectory,
  removeDirectory,
} = require('./utils/fs')

async function cacheMagic(options = {}) {
  const currentWorkingDir = process.cwd()
  const defaultOptions = {
    cwd: currentWorkingDir,
    contents: currentWorkingDir,
    directory: currentWorkingDir
  }
  const opts = Object.assign(defaultOptions, options)

  const cwd = opts.cwd
  const contents = opts.contents || cwd
  // TODO refactor how directory array is made
  let directory = opts.contents || cwd
  // console.log('directory', directory)
  const cacheDirectory = opts.cacheFolder || path.resolve('./opt/buildhome/cache')

  // coerse single path into array
  if (!Array.isArray(contents)) {
    directory = [
      {
        path: contents,
        invalidateOn: opts.invalidateOn,
      }
    ]
  }

  if (Array.isArray(directory)) {
    // console.log(directory)
    const checkFilesParallel = directory.map(async (dir) => {
      const exists = await fileExists(dir.path)
      return exists
    })
    const directoryData = await Promise.all(checkFilesParallel).then((data) => {
      return data.map((exists, i) => {
        const obj = directory[i]
        obj.exists = exists
        return obj
      })
    })

    const everythingExists = directoryData.filter((d) => {
      return !d.exists
    })
    // console.log(directoryData)
    if (everythingExists.length) {
      everythingExists.forEach((err) => {
        console.log(`Error: ${err.path} NOT FOUND`)
      })
      throw new Error('Supplied content paths invalid')
    }
  }

  // Todo check for multiple folders
  const directoryExists = await fileExists(cwd)
  if (!directoryExists) {
    console.log(`${cwd} does not exist`)
    return false
  }

  const checkCacheParallel = directory.map(async (dir) => {
    const cache = await checkCache(dir, opts, cacheDirectory)
    return cache
  })
  await Promise.all(checkCacheParallel).then((data) => {
    console.log('data', data)
  })

  return Promise.resolve()
}

async function checkCache(d, opts, cacheDirectory) {
  // console.log('d', d)
  const cwd = opts.cwd
  const directory = d.path
  const parentDirectory = path.dirname(directory)

  const cleanPath = nicePath(cwd, directory)
  const cleanParentPath = nicePath(cwd, parentDirectory)
  //console.log('cleanParentPath', cleanParentPath)
  const consolePrefix = prefix(cleanPath)
  const cleanDir = directory.replace(cwd, '') || '_base'
  // console.log('cleanDir', cleanDir)
  const cachedFiles = path.join(cacheDirectory, cleanDir)
  // console.log('cachedFiles', cachedFiles)
  const cachedFilesDirectory = path.dirname(cachedFiles)
  // console.log('cachedFilesDirectory', cachedFilesDirectory)
  const casheFileName = 'cache.json'
  const currentHashFile = path.join(cachedFilesDirectory, casheFileName)
  // console.log('currentHashFile', currentHashFile)

  // console.log('currentHashFile', currentHashFile)

  const cachedHash = await getCacheData(currentHashFile)
  if (!cachedHash) {
    console.log(`${consolePrefix} No ${casheFileName} found in ${cachedFilesDirectory}`)
  }

  // console.log(`cachedHash ${cachedHash}`)

  // TODO refactor which files to check
  const dependenciesFile = (d.invalidateOn.match(/\//)) ? d.invalidateOn : path.join(parentDirectory, d.invalidateOn)
  // console.log('invalidate on', dependenciesFile)
  // Grab type of dependencies here

  const hashAlgorithm = opts.algorithm || 'sha1'
  const hash = await hashFile(dependenciesFile, hashAlgorithm)
  console.log(`${consolePrefix} 1. Checking if ${dependenciesFile} has changed...`)
  const hashesMatch = (hash === cachedHash.hash)
  // console.log('hashesMatch', hashesMatch)

  if (hashesMatch) {
    console.log(`${consolePrefix} ✓  No changes detected in ${dependenciesFile}\n`)

    // 1. Copy node_modules
    // const nodeModules = path.join(directory, 'node_modules')
    const cachedFilesExist = await fileExists(cachedFiles)
    if (cachedFilesExist) {
      console.log(`${consolePrefix} 2. Copying over ${cachedFiles} to ${directory}`)
      await copyDirectory(cachedFiles, directory)
      console.log(`${consolePrefix} ✓  Dependencies copied from cache to ${directory}\n`)
    }
    return Promise.resolve()
  }

  // If no cache exists or the hash has changed. Install deps and save
  if (!cachedHash || !hashesMatch) {
    console.log(`\n${consolePrefix} ℹ Changes detected in ${dependenciesFile}\n`)

    // Clear out cache dir
    await removeDirectory(cachedFiles)

    if (d.command) {
      console.log('Do command', d.command)
      await execPromise(d.command)
    }
    /*
    console.log(`${consolePrefix} 2. Installing new dependencies...\n`)
    console.log('----------------- NPM LOGS -----------------\n')
    await installDeps({
      cwd: directory
    })
    console.log('----------------- END NPM LOGS -----------------\n')
    console.log(`${consolePrefix} ✓ Install complete!\n`)
    /**/

    // Create the corresponding cache directory
    await createDirectory(cachedFilesDirectory)
    // console.log('cachedFilesDirectory', cachedFilesDirectory)
    // Copy node_modules over to cache
    const filesToCopyExist = await fileExists(directory)
    if (filesToCopyExist) {
      console.log(`${consolePrefix} 3. Copying over ${directory} to ${cachedFiles}...`)
      await copyDirectory(directory, cachedFiles)
      console.log(`${consolePrefix} ✓  Dependencies copied to cache ${cachedFiles}\n`)
    }
  }
  // Save Hash data
  console.log(`${consolePrefix} 4. Saving new dependencies hash ${hash}...`)
  await saveCacheData(hash, currentHashFile)
  console.log(`${consolePrefix} ✓  Dependencies cached for next run!\n`)

  return Promise.resolve()
}

function nicePath(cwd, dir) {
  const cwdDir = cwd.replace(path.basename(cwd), '')
  return `./${dir.replace(cwdDir, '')}` || './_base'
}

// "build": "npm-install-cache && npm run build"
module.exports = cacheMagic
