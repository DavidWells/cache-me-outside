const path = require('path')
const cacheMeOutside = require('./lib')

// Netlify cache folder
const yourCustomNameSpace = 'storage'
const netlifyCacheFolder = path.join('/opt/build/cache', yourCustomNameSpace)
// const cacheDir = netlifyCacheFolder
const cacheFolder = path.resolve('./cache')

const contentsToCache = [
  {
    contents: path.join(__dirname, 'node_modules'),
    handleCacheUpdate: 'npm install',
    shouldCacheUpdate: async function(data, utils) {
      const pkgChanged = await utils.diff(path.join(__dirname, 'package.json'))
      const lolChanged = await utils.diff(path.join(__dirname, 'lol.json'))

      return pkgChanged || lolChanged
    },
  },
  {
    contents: path.join(__dirname, 'other/node_modules'),
    shouldCacheUpdate: function() {
      const nodeModulesDifferent = null
      if (nodeModulesDifferent) {
        return true
      }
      return false
    },
    invalidateOn: path.join(__dirname, 'other/package.json'),
    command: 'npm install'
  },
  {
    contents: path.join(__dirname, 'serverless-test/.serverless'),
    shouldCacheUpdate: function() {
      return false
    },
    invalidateOn: 'serverless.yml',
    command: 'echo "hi"'
  }
]

cacheMeOutside(contentsToCache, cacheFolder).then(() => {
  console.log('Success! You are ready to rock')
})
