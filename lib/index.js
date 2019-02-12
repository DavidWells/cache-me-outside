const path = require('path')
const hashFile = require('./utils/hashFile')
const getHash = require('./utils/getHash')
const installDeps = require('./installDeps')
const getCacheData = require('./getCacheData')
const execPromise = require('./utils/execPromise')
const hashFolder = require('./utils/dirSum')
const checkForDiffs = require('./utils/asyncReduce')
const os = require('os')
const {
  fileExists,
  createDirectory,
  copyDirectory,
  removeDirectory,
  writeFile
} = require('./utils/fs')

const homeDir = os.homedir()

async function cacheMeOutside(cacheFolder, contents) {
  const options = {}
  const currentWorkingDir = process.cwd()
  const defaultOptions = {
    cwd: currentWorkingDir,
    contents: currentWorkingDir,
    directory: currentWorkingDir
  }
  const opts = Object.assign(defaultOptions, options)

  // console.log('directory', directory)
  const cacheDirectory = cacheFolder || path.resolve('./opt/buildhome/cache')

  // coerse single path into array
  if (!Array.isArray(contents)) {
    contents = [
      {
        path: contents,
        invalidateOn: opts.invalidateOn,
      }
    ]
  }

  /* disable exists check for right meow
  if (Array.isArray(directory)) {
    // console.log(directory)
    const checkFilesParallel = directory.map(async (dir) => {
      console.log('dir.path', dir.path)
      const exists = await fileExists(dir.path)
      console.log('exists')
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
  */

  // // Todo check for multiple folders
  // const directoryExists = await fileExists(cwd)
  // if (!directoryExists) {
  //   console.log(`${cwd} does not exist`)
  //   return false
  // }

  const checkCacheParallel = contents.map(async (dir) => {
    const cacheInfo = await checkCache(dir, opts, cacheDirectory)
    return cacheInfo
  })

  return Promise.all(checkCacheParallel)
}

async function checkCache(d, opts, cacheDirectory) {
  const directory = d.contents

  const parentDirectory = path.dirname(directory)

  const cleanDir = directory.replace(homeDir, '') || '_base'

  const cachedContents = path.join(cacheDirectory, cleanDir)
  // console.log('cachedContents', cachedContents)
  const cachedContentsDirectory = path.dirname(cachedContents)
  // console.log('cachedContentsDirectory', cachedContentsDirectory)
  const cacheInfo = path.join(cachedContentsDirectory, 'cache.json')
  // console.log('cacheInfo', cacheInfo)

  let cacheData
  try {
    cacheData = await getCacheData(cacheInfo)
  } catch (e) {
    console.log(`cacheData error from ${cacheInfo}`)
    console.log(e)
  }

  let firstRun = false
  if (!cacheData) {
    console.log(`No 'cache.json' found in ${cachedContentsDirectory}`)
    firstRun = true
  }

  async function diffWrapper (filePath) {
    return diff(filePath, cacheInfo)
  }

  let shouldCacheUpdate = false
  let shouldUpdateFunction = defaultShouldUpdate

  if (d.shouldCacheUpdate && typeof d.shouldCacheUpdate === 'function') {
    shouldUpdateFunction = d.shouldCacheUpdate
  }
  console.log(`1. 🔍 Checking for changes in ${directory} ...`)
  // Run custom or default shouldCacheUpdate
  shouldCacheUpdate = await shouldUpdateFunction(cacheData, {
    diff: diffWrapper
  })

  // shouldCacheUpdate = true
  let currentCacheData
  try {
    currentCacheData = await getCacheData(cacheInfo)
  } catch (e) {
    console.log(`cacheData error from ${cacheInfo}`)
    console.log(e)
    currentCacheData = {}
  }

  if (!shouldCacheUpdate && !firstRun) {
    console.log(`2. 👍  No changes detected in ${directory}`)

    console.log(`3. ♺  Copying cache "${cachedContents}" to "${directory}"`)
    await copyDirectory(cachedContents, directory)

    console.log(`4. ✅ Copying cache to "${directory}"`)
    return Promise.resolve(currentCacheData)
  }

  if (!cacheData || shouldCacheUpdate) {
    console.log(`2. ✎  Changes detected in ${directory}. Running cache update logic`)

    // Clear out cache directory
    await removeDirectory(cachedContents)

    // Run handleCacheUpdate cmd/function
    if (d.handleCacheUpdate) {
      // Handle CLI commands
      if (typeof d.handleCacheUpdate === 'string') {
        console.log(`3. ◉  Running command in ${parentDirectory}...`)
        await execPromise(d.handleCacheUpdate, {
          cwd: parentDirectory
        })
      }

      // Handle custom functions
      if (typeof d.handleCacheUpdate === 'function') {
        console.log('3. ◉  Running handleCacheUpdate function...')
        await d.handleCacheUpdate(cacheData)
      }

      // TODO use heuristic to determine how to update cache
    }

    console.log(`4. Copying over ${directory} to ${cachedContents}...`)
    await copyDirectory(directory, cachedContents)
    console.log(`5. ✓  Dependencies copied to cache ${cachedContents}\n`)
  }

  console.log(`6. Saving cache info...`)

  const date = new Date()
  const now = date.getTime()
  const info = {
    createdOn: currentCacheData.createdOn || now,
    createdOnDate: currentCacheData.createdOnDate || date.toUTCString(),
    modifiedOn: now
  }

  if (currentCacheData.diffs) {
    info.diffs = currentCacheData.diffs
  }

  const folderHash = await hashFolder(directory)

  const defaultInfo = {
    ...info,
    cacheDir: path.dirname(cachedContents),
    cacheDirContents: cachedContents,
    contents: {
      src: directory,
      hash: folderHash.hash,
      files: folderHash.files
    }
  }

  const contents = JSON.stringify(defaultInfo, null, 2)

  // Save cache data for next run
  await writeFile(cacheInfo, contents)
  console.log(`✓ Dependencies cached for next run!`)
  console.log(`Cache Location: ${cachedContents}`)

  return Promise.resolve(defaultInfo)
}

// "build": "npm-install-cache && npm run build"
module.exports = cacheMeOutside
module.exports.getHash = getHash

/* Default should update checks for folder hash change */
async function defaultShouldUpdate(cacheData) {
  // console.log('DEFUALT defaultShouldUpdate')
  if (!cacheData || !cacheData.contents || !cacheData.contents.hash) {
    // No cache, is first run
    return true
  }

  const cacheHash = cacheData.contents.hash

  const folderHash = await hashFolder(cacheData.contents.src)

  if (folderHash.hash !== cacheHash) {
    console.log('FOLDER HAS CHANGED PURGE CACHE')
    return true
  }

  if (folderHash.hash === cacheData.contents.hash) {
    // console.log('NO changes to FOLDER')
  }

  return false
}

async function diff(filePath, cacheFile) {
  let cacheData
  try {
    cacheData = await getCacheData(cacheFile)
  } catch (e) {
    console.log(`cacheData error from ${cacheFile}`)
    cacheData = {}
  }
  // No change file exists
  if (!cacheData.diffs || !Object.keys(cacheData.diffs).length || !cacheData.diffs[filePath]) {
    // console.log('previousDiff.diffs', cacheData.diffs)
    const prev = cacheData.diffs || {}

    const newContents = {
      ...cacheData,
      ...{
        diffs: Object.assign({}, prev, {
          [`${filePath}`]: await getHash(filePath),
        })
      },
    }

    // TODO make atomic write
    await writeFile(cacheFile, JSON.stringify(newContents, null, 2))
    // no difference
    return false
  }
  // console.log('filePath', filePath)
  const currenthash = await getHash(filePath)
  // console.log('cacheData', cacheData)

  // Hashes match, no difference
  if (cacheData && cacheData.diffs && cacheData.diffs[filePath] === currenthash) {
    // console.log(`NO DIFFs in ${filePath}`)
    return false
  }

  // hashes do not match. There is difference
  if (cacheData && cacheData.diffs && cacheData.diffs[filePath] !== currenthash) {
    console.log(`┃  "${filePath}" has changed`)
    console.log(`┃  Old hash: ${cacheData.diffs[filePath]}`)
    console.log(`┃  New hash: ${currenthash}`)

    const diffKeys = Object.keys(cacheData.diffs)
    const t = await checkForDiffs(diffKeys, filePath, cacheData)
    const newDiffs = t.reduce((acc, hash, i) => {
      const fileName = diffKeys[i]
      acc[fileName] = hash
      return acc
    }, {})

    const newContents = {
      ...cacheData,
      ...{
        diffs: newDiffs
      },
    }
    // Write new hash for next run
    await writeFile(cacheFile, JSON.stringify(newContents, null, 2))
    return true
  }
}

module.exports.diff = diff
