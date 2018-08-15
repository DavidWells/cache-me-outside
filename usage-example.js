const path = require('path')
const cacheMeOutside = require('./lib') // require('cache-me-outside')

/* local cache folder */
const cacheDir = path.resolve('./cache')

/* Netlify cache folder */
const yourFolderNameSpace = 'storage'
const netlifyCacheFolder = path.join('/opt/build/cache', yourFolderNameSpace)

const contentsToCache = [
  {
    // Directory of files to cache
    contents: path.join(__dirname, 'node_modules'),
    // Command or Function to run on `shouldCacheUpdate = true`
    handleCacheUpdate: 'npm install',
    // Should cache update? Return true or false
    shouldCacheUpdate: async (data, utils) => {
      // utils contains helpful functions for diffing
      const packageJson = path.join(__dirname, 'package.json')
      const packageJsonChanged = await utils.diff(packageJson)
      // You can check multiple files or run custom logic
      return packageJsonChanged
    },
  },
  {
    contents: path.join(__dirname, 'other/node_modules'),
    shouldCacheUpdate: function() {
      // your custom cache invalidation logic here
      return false
    },
    handleCacheUpdate: 'yarn install'
  },
  {
    contents: path.join(__dirname, 'serverless-test/.serverless'),
    handleCacheUpdate: () => {
      console.log('run my custom stuff here')
    }
    // shouldCacheUpdate if omitted will use contents folder hash
  },
]

cacheMeOutside(netlifyCacheFolder, contentsToCache).then((cacheInfo) => {
  console.log('Success! You are ready to rock')
  cacheInfo.forEach((info) => {
    console.log(info.cacheDir)
  })
})
