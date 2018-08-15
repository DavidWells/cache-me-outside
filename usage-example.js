const path = require('path')
const cacheMeOutside = require('./lib') // require('cache-me-outside')

/* local cache folder */
const cacheDir = path.resolve('./cache')

/* Netlify cache folder */
const yourFolderNameSpace = 'storage'
const netlifyCacheFolder = path.join('/opt/build/cache', yourFolderNameSpace)

/* Array of folders to cache */
const contentsToCache = [
  {
    /**
     * Directory of files to cache
     * @type {String}
     */
    contents: path.join(__dirname, 'node_modules'),
    /**
     * Command or Function to run on `shouldCacheUpdate = true`
     * @type {String|Function}
     */
    handleCacheUpdate: 'npm install && echo "this runs when cache is invalid"',
    /**
     * Sets whether or not cache should get updated
     * @param  {object}  cacheManifest contains useful info for custom invalidation
     * @param  {object}  utils         contains helpful functions for diffing
     * @return {Boolean}              Returns true or false
     */
    shouldCacheUpdate: async (cacheManifest, utils) => {
      // This example uses changes to package.json to invalid cached 'node_modules' folder
      const packageJson = path.join(__dirname, 'package.json')
      const packageJsonChanged = await utils.diff(packageJson)
      // You can check multiple files or run custom logic
      return packageJsonChanged
    },
  },
  {
    contents: path.join(__dirname, 'other/node_modules'),
    shouldCacheUpdate: function() {
      /* your custom cache invalidation logic here */
      return false
    },
    handleCacheUpdate: 'yarn install'
  },
  {
    contents: path.join(__dirname, 'serverless-test/.serverless'),
    handleCacheUpdate: () => {
      console.log('run my custom stuff here')
    }
    // if `shouldCacheUpdate` omitted will use contents folder hash
  },
]

// Run lib
cacheMeOutside(netlifyCacheFolder, contentsToCache).then((cacheInfo) => {
  console.log('Success! You are ready to rock')
  cacheInfo.forEach((info) => {
    console.log(info.cacheDir)
  })
})
