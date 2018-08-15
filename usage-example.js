const path = require('path')
const cacheMeOutside = require('./lib')

// Netlify cache folder
const yourCustomNameSpace = 'storage'
const netlifyCacheFolder = path.join('/opt/build/cache', yourCustomNameSpace)
// const cacheDir = netlifyCacheFolder
const cacheDir = path.resolve('./cache')

const contentsToCache = [
  {
    // Directory of files to cache
    contents: path.join(__dirname, 'node_modules'),
    // Command or Function to run on `shouldCacheUpdate = true`
    handleCacheUpdate: 'npm install && echo "HIIIIIIIII"',
    // Should cache update? Return true or false
    shouldCacheUpdate: async (data, utils) => {
      const pkgChanged = await utils.diff(path.join(__dirname, 'package.json'))
      const lolChanged = await utils.diff(path.join(__dirname, 'lol.json'))
      return pkgChanged || lolChanged
    },
  },
  {
    contents: path.join(__dirname, 'other/node_modules'),
    handleCacheUpdate: 'npm install',
    shouldCacheUpdate: (data) => {
      // console.log('data', data)
      return false
    },
  },
  {
    contents: path.join(__dirname, 'serverless-test/.serverless'),
    shouldCacheUpdate: function() {
      return true
    },
    handleCacheUpdate: 'echo "hi"'
  }
]

cacheMeOutside(cacheDir, contentsToCache).then((cacheInfo) => {
  console.log('Success! You are ready to rock', cacheInfo)
})
