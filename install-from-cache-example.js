const path = require('path')
const cacheMeOutside = require('cache-me-outside')

/* cache destination folder */
const cacheFolder = path.join('/opt/build/cache', 'storage')

/* Array of folders to cache */
const contentsToCache = [
  {
    contents: path.join(__dirname, 'node_modules'),
    handleCacheUpdate: 'npm install',
    shouldCacheUpdate: async (cacheManifest, utils) => {
      /* Your custom invalidation logic */

      /*
         - Dates cache last updated
         - Make remote api request
         - Diff dependencies files like package.json
         - Whatever you want
      */

      const updateCache = true
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
