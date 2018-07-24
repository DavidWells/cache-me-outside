const path = require('path')
const hashFile = require('./utils/hashFile')
const installDeps = require('./installDeps')
const saveCacheData = require('./saveCacheData')
const getCacheData = require('./getCacheData')
const {
  fileExists,
  createDirectory,
  copyDirectory,
  removeDirectory,
} = require('./utils/fs')

const consolePrefix = 'Cache-magic:'

async function cacheMagic(options) {
  const opts = options || {}
  const cwd = opts.cwd || process.cwd()
  const directory = opts.directory || cwd
  const cacheDirectory = opts.cacheDir || path.resolve('./opt/buildhome/cache')

  const directoryExists = await fileExists(cwd)
  if (!directoryExists) {
    console.log(`${cwd} does not exist`)
    return false
  }

  // Read hash file
  const cleanDir = directory.replace(cwd, '')
  const currentCacheDir = path.join(cacheDirectory, cleanDir)
  // console.log('currentCacheDir', currentCacheDir)
  const currentHashFile = path.join(currentCacheDir, 'data.json')
  const cacheNodeModules = path.join(currentCacheDir, 'node_modules')
  // console.log('currentHashFile', currentHashFile)

  const cachedHash = await getCacheData(currentHashFile)
  // console.log(`cachedHash ${cachedHash}`)

  // Read current package.json
  const packageJSON = path.join(directory, 'package.json')
  // Grab type of dependencies here

  const hashAlgorithm = opts.algorithm || 'sha1'
  const hash = await hashFile(packageJSON, hashAlgorithm)
  console.log(`${consolePrefix} 1. Checking if dependencies have changed...`)
  const hashesMatch = (hash === cachedHash.hash)
  if (hashesMatch) {
    console.log(`${consolePrefix} ✓  No changes detected in package.json!\n`)
    // 1. Copy node_modules
    const nodeModules = path.join(directory, 'node_modules')
    const nodeModulesExist = await fileExists(cacheNodeModules)
    if (nodeModulesExist) {
      console.log(`${consolePrefix} 2. Copying over your dependencies...`)
      await copyDirectory(cacheNodeModules, nodeModules)
      console.log(`${consolePrefix} ✓  Dependencies copied from cache to ${nodeModules}\n`)
    }
    return Promise.resolve()
  }

  if (!cachedHash || !hashesMatch) {
    console.log(`\n${consolePrefix} ℹ Changes detected in package.json!\n`)

    await removeDirectory(cacheNodeModules)

    console.log(`${consolePrefix} 2. Installing new dependencies...\n`)
    console.log('----------------- NPM LOGS -----------------\n')
    await installDeps({
      cwd: directory
    })
    console.log('----------------- END NPM LOGS -----------------\n')
    console.log(`${consolePrefix} ✓ Install complete!\n`)

    // create the corresponding cache directory
    await createDirectory(currentCacheDir)
    // copy node_modules over
    const nodeModules = path.join(directory, 'node_modules')
    const nodeModulesExist = await fileExists(nodeModules)
    if (nodeModulesExist) {
      console.log(`${consolePrefix} 3. Copying over your dependencies...`)
      await copyDirectory(nodeModules, cacheNodeModules)
      console.log(`${consolePrefix} ✓  Dependencies copied cache ${cacheNodeModules}\n`)
    }
  }

  // Save Hash info
  console.log(`${consolePrefix} 4. Saving new dependencies hash ${hash}...`)
  await saveCacheData(hash, currentHashFile)
  console.log(`${consolePrefix} ✓  Dependencies cached for next run!\n`)

  return Promise.resolve()
}
// "build": "npm-install-cache && npm run build"
module.exports = cacheMagic
