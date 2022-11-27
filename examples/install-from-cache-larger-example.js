const path = require('path')
const cacheMeOutside = require('../lib') // require('cache-me-outside')

/* Netlify cache folder */
//let cacheFolder = path.join('/opt/build/cache', 'my-cache-folder')
let cacheFolder = path.join(__dirname, '.cache')
/* Array of folders to cache */
const contentsToCache = [
  {
    /**
     * Directory of files to cache
     * @type {String}
     */
    contents: path.join(__dirname, '../node_modules'),
    /**
     * Command or Function to run on `shouldCacheUpdate = true`
     * @type {String|Function}
     */
    handleCacheUpdate: 'npm install && echo "this runs when cache is invalid"',
    /**
     * Sets whether or not cache should get updated
     * @param  {object}  api
     * @param  {object}  api.cacheManifest - contains useful info for custom invalidation
     * @param  {object}  api.actions       - contains helpful functions for diffing
     * @return {Boolean} Returns true or false
     */
    shouldCacheUpdate: async ({ cacheManifest, actions }) => {
      // This example uses changes to package.json to invalid cached 'node_modules' folder
      const packageJson = path.join(__dirname, 'package.json')
      const packageJsonChanged = await actions.diff(packageJson)
      // You can check multiple files or run custom logic
      return packageJsonChanged
    },
  },
  {
    contents: path.join(__dirname, '../other/node_modules'),
    shouldCacheUpdate: function() {
      /* your custom cache invalidation logic here */
      return false
    },
    handleCacheUpdate: 'yarn install'
  },
  {
    contents: path.join(__dirname, '../serverless-test/.serverless'),
    handleCacheUpdate: () => {
      console.log('run my custom stuff here')
    }
    // if `shouldCacheUpdate` omitted will use contents folder hash
  },
]

/*
// local cache folder for testing
cacheFolder = path.resolve('./cache')
/**/

// Run cacheMeOutside
cacheMeOutside(cacheFolder, contentsToCache).then((cacheInfo) => {
  console.log('Success! You are ready to rock')
  cacheInfo.forEach((info) => {
    console.log(info.cacheDir)
  })
})
