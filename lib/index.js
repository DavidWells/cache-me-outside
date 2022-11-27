const os = require('os')
const path = require('path')
const getHash = require('./utils/getHash')
// const installDeps = require('./installDeps')
const execPromise = require('./utils/execPromise')
const hashFolder = require('./utils/dirSum')
const checkForDiffs = require('./utils/asyncReduce')
const hashFile = require('./utils/hashFile')
const { flattie } = require('./utils/flattie')
const {
  fileExists,
  createDirectory,
  copyDirectory,
  removeDirectory,
  writeFile,
  readFile
} = require('./utils/fs')

const cwd = process.cwd()
const homeDir = os.homedir()

function nicePath(filePath = '') {
  return filePath.replace(cwd, '')
}

async function cacheMeOutside(cacheFolder, cacheInstructions) {
  const options = {}
  const currentWorkingDir = cwd
  const defaultOptions = {
    cwd: currentWorkingDir,
    contents: currentWorkingDir,
    directory: currentWorkingDir
  }
  const opts = Object.assign(defaultOptions, options)

  // console.log('directory', directory)
  const cacheDirectory = cacheFolder || path.resolve('./opt/buildhome/cache')

  // coerse single path into array
  if (!Array.isArray(cacheInstructions)) {
    cacheInstructions = [
      {
        path: cacheInstructions,
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

  const checkCacheParallel = cacheInstructions.map(async (instructions) => {
    return checkCache(instructions, {
      cacheDirectory
    })
  })

  return Promise.all(checkCacheParallel)
}

async function checkCache(instructions, { cacheDirectory }) {
  const d = instructions
  const directory = d.contents

  const parentDirectory = path.dirname(directory)
  // console.log('parentDirectory', parentDirectory)
  const cleanDir = directory.replace(homeDir, '') || '_base'

  const cacheContentDirectory = path.join(cacheDirectory, cleanDir)
  // console.log('cacheContentDirectory', cacheContentDirectory)
  const cacheContentsDirectory = path.dirname(cacheContentDirectory)
  // console.log('cacheContentsDirectory', cacheContentsDirectory)
  const cacheDetailsPath = path.join(cacheContentsDirectory, 'cache.json')
  // console.log('cacheDetailsPath', cacheDetailsPath)
  const niceDirPath = nicePath(directory)

  let cacheData
  try {
    cacheData = await getCacheFile(cacheDetailsPath)
  } catch (e) {
    console.log(`cacheData error from ${cacheDetailsPath}`)
    console.log(e)
  }

  const firstRun = (typeof cacheData === 'undefined') ? true : false
  if (firstRun) {
    console.log(`No 'cache.json' found in ${cacheContentsDirectory}`)
  }

  let shouldCacheUpdate = false
  let shouldUpdateFn = defaultShouldUpdate
  if (d.shouldCacheUpdate && typeof d.shouldCacheUpdate === 'function') {
    shouldUpdateFn = d.shouldCacheUpdate
  }
  function diffWrapper(filePath) {
    return diff(filePath, cacheDetailsPath)
  }
  console.log(`1. 🔍 Checking for changes in ${niceDirPath} ...`)

  // Run custom or default shouldCacheUpdate
  shouldCacheUpdate = await shouldUpdateFn({
    directory,
    cacheDirectory,
    cacheContentDirectory,
    actions: {
      diff: diffWrapper
    },
    cacheManifest: cacheData,
    settings: d
  })

  let currentCacheData = {}
  try {
    currentCacheData = await getCacheFile(cacheDetailsPath) || {}
  } catch (e) {
    console.log(`cacheData error from ${cacheDetailsPath}`)
    console.log(e)
  }

  /* If shouldn't update and it's not the first run. Exit early */
  let cacheRestoreFailure = false
  if (!shouldCacheUpdate && !firstRun) {
    console.log(`2. 👍  No changes detected in ${niceDirPath}\n`)
    console.log(`   Cache created on ${currentCacheData.createdAt}`)
    console.log(`   Cache updated on ${currentCacheData.updatedAt}`)
    console.log()
    /* Copy cached files to their proper source location */
    /* Run Restore cache function */
    const handleCacheRestore = d.handleCacheRestore || restoreCachedFiles
    const payload = {
      isNoOp: false, // TODO add check if skip handleCacheRestore logic if we need to.
      directory,
      cacheDirectory,
      cacheContentDirectory,
      actions: {
        restoreCache: () => restoreCachedFiles({ directory, cacheContentDirectory }),
      },
      cacheManifest: cacheData,
      settings: d
    }
    try {
      await handleCacheRestore(payload)
    } catch (e) {
      console.log('❌ Cache Restore error', e)
      cacheRestoreFailure = true
      shouldCacheUpdate = true
      // throw new Error(e)
    }

    if (!cacheRestoreFailure) {
      return Promise.resolve(currentCacheData)
    }
  }

  if (!cacheData || shouldCacheUpdate) {
    console.log(`2. 👩‍🎤  Changes detected in ${niceDirPath}. Running cache update logic\n`)
    /* Clear out cache directory */
    await removeDirectory(cacheContentDirectory)

    // Run handleCacheUpdate cmd/function
    if (d.handleCacheUpdate) {
      // Handle CLI commands
      if (typeof d.handleCacheUpdate === 'string') {
        console.log(`3. ⚙️   Running command "${d.handleCacheUpdate}" in ${parentDirectory}...\n`)
        await execPromise(d.handleCacheUpdate, {
          cwd: parentDirectory
        })
      }
      // Handle custom functions
      if (typeof d.handleCacheUpdate === 'function') {
        console.log('3. ⚙️   Running handleCacheUpdate function...\n')
        await d.handleCacheUpdate({
          directory,
          cacheDirectory,
          cacheContentDirectory,
          actions: {
            runCommand: (cmd, cwd = parentDirectory) => execPromise(cmd, { cwd: cwd }),
          },
          cacheManifest: cacheData, // TODO refactor shape
          settings: d,
        })
      }
      // TODO use smart heuristic to determine how to update caches
    }

    /* Run Restore cache function */
    const handleCacheSave = d.handleCacheSave || saveCache
    try {
      await handleCacheSave({
        directory,
        cacheDirectory,
        cacheContentDirectory,
        actions: {
          saveCache: () => saveCache({ directory, cacheContentDirectory }),
        },
        cacheManifest: cacheData,
        settings: d,
      })
    } catch (e) {
      console.log('❌ Cache Save error')
      throw new Error(e)
    }
  }

  console.log(`6. Saving cache info...`)

  const date = new Date()
  const now = date.toISOString()
  const info = {
    // createdOn: currentCacheData.createdOn || now,
    createdAt: currentCacheData.createdAt || now,
    updatedAt: now
  }

  if (currentCacheData.diffs) {
    info.diffs = currentCacheData.diffs
  }

  const folderHash = await hashFolder(directory)

  const defaultInfo = {
    ...info,
    cacheDir: path.dirname(cacheContentDirectory),
    cacheDirContents: cacheContentDirectory,
    contents: {
      src: directory,
      hash: folderHash.hash,
      files: folderHash.files
    }
  }

  const contents = JSON.stringify(defaultInfo, null, 2)
  // Save cache data for next run
  await writeFile(cacheDetailsPath, contents)
  console.log(`✓ Dependencies cached for next run!`)
  console.log(`Cache Location: ${cacheContentDirectory}`)

  return Promise.resolve(defaultInfo)
}

// "build": "npm-install-cache && npm run build"
module.exports = cacheMeOutside
module.exports.getHash = getHash

async function restoreCachedFiles({ directory, cacheContentDirectory }) {
  const niceDirPath = nicePath(directory)
  console.log(`3. 👯  Restoring cached contents 
  - from "${cacheContentDirectory}" 
  - to src "${directory}"\n`)
  try {
    await copyDirectory(cacheContentDirectory, directory)
  } catch (e) {
    console.log('❌ Cache Copy error')
    throw new Error(e)
  }
  console.log(`4. ✅  Finished Restoring cached contents to src directory "${niceDirPath}"\n`)
}

async function saveCache({ directory, cacheContentDirectory }) {
  console.log(`4. Copying over ${directory} to ${cacheContentDirectory}...\n`)
  await copyDirectory(directory, cacheContentDirectory)
  console.log(`5. ✓  Dependencies copied to cache ${cacheContentDirectory}\n`)
}

/* Default should update checks for folder hash change */
async function defaultShouldUpdate(cacheData) {
  // console.log('DEFUALT defaultShouldUpdate')
  if (!cacheData || !cacheData.contents || !cacheData.contents.hash) {
    // No cache, is first run
    return true
  }
  const cacheHash = cacheData.contents.hash
  let folderHash = {}
  try {
    folderHash = await hashFolder(cacheData.contents.src)
  } catch(e) {
    if (e.code !== 'ENOENT') {
      throw new Error(e)
    }
  }

  if (folderHash.hash !== cacheHash) {
    console.log(`\nDetected changes in "${cacheData.contents.src}\n`)
    /* Do deep comparsion to find hash changes */
    const fileChanges = findChanges(cacheData.contents, folderHash)
    if (fileChanges.length) {
      const parentDir = path.basename(cacheData.contents.src)
      fileChanges.forEach(({ fileName, type }) => {
        console.log(`- "${path.join(parentDir, fileName)}" ${type}`)
      })
    }
    console.log('\nTIME TO PURGE CACHE & RENEW SRC DIR\n')
    return true
  }

  if (folderHash.hash === cacheData.contents.hash) {
    console.log(`\nNO changes to folder ${cacheData.contents.src}\n`)
    // console.log(cacheData)
  }

  return false
}

function findChanges(one, two) {
  const y = flattie(one)
  const z = flattie(two)
  const yKeys = Object.keys(y)
  const zKeys = Object.keys(z)
  // Use longest array
  const array = (yKeys.length >= zKeys.length) ? yKeys : zKeys
  const foundDiffs = []
  for (let index = 0; index < array.length; index++) {
    const key = array[index]
    if (y[key] !== z[key]) {
      // console.log('Old', y[key])
      // console.log('New', z[key])
      let type = 'changed'
      if (typeof y[key] === 'undefined') {
        type = 'added'
      } else if (typeof z[key] === 'undefined') {
        type = 'removed'
      }
      if (key !== 'src' && key !== 'hash' && !key.endsWith('hash')) {
        const fileName = key
          .replace(/^files\./g, '')
          .replace(/\.files\.(?!files\.)/g, '/')
        foundDiffs.push({ fileName, type })
      }
    }
  }
  return foundDiffs
}

async function diff(filePath, cacheFile) {
  let cacheData = {}
  try {
    cacheData = await getCacheFile(cacheFile) || {}
  } catch (e) {
    console.log(`cacheData error from ${cacheFile}`)
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
  const currentHash = await getHash(filePath)
  // console.log('cacheData', cacheData)

  // Hashes match, no difference
  if (cacheData && cacheData.diffs && cacheData.diffs[filePath] === currentHash) {
    // console.log(`NO DIFFs in ${filePath}`)
    return false
  }

  // hashes do not match. There is difference
  if (cacheData && cacheData.diffs && cacheData.diffs[filePath] !== currentHash) {
    console.log(`┃  "${filePath}" has changed`)
    console.log(`┃  Old hash: ${cacheData.diffs[filePath]}`)
    console.log(`┃  New hash: ${currentHash}`)

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

async function getCacheFile(filePath) {
  const fileDoesExist = await fileExists(filePath)
  if (!fileDoesExist) {
    return
  }

  return readFile(filePath).then((data) => JSON.parse(data))
}

module.exports.diff = diff
