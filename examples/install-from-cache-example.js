const path = require('path')
const cacheMeOutside = require('../lib') // require('cache-me-outside')

/* cache destination folder */
// const cacheFolder = path.join('/opt/build/cache', 'storage')
const cacheFolder = path.join(__dirname, '.cache')
/* Array of folders to cache */
const contentsToCache = [
  {
    contents: path.join(__dirname, '../node_modules'),
    handleCacheUpdate: 'npm install',
    shouldCacheUpdate: async ({ cacheManifest, actions }) => {
      console.log('cacheManifest', cacheManifest)
      console.log(actions)
      /* Your custom invalidation logic */

      /*
         - Dates cache last updated
         - Make remote api request
         - Diff dependencies files like package.json
         - Whatever you want
      */

      // This example uses changes to package.json to invalid cached 'node_modules' folder
      const packageJson = path.join(__dirname, '../package.json')
      const packageJsonChanged = await actions.diff(packageJson)
      console.log('packageJsonChanged', packageJsonChanged)
      const updateCache = packageJsonChanged
      return updateCache // Boolean
    },
  },
  // ... add more folders if you want
]

// Run cacheMeOutside
cacheMeOutside(cacheFolder, contentsToCache).then((cacheInfo) => {
  console.log('Success! You are ready to rock')
  cacheInfo.forEach((info) => {
    console.log(info.cacheDir)
  })
})
