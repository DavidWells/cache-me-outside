const path = require('path')
const cacheMeOutside = require('../lib') // require('cache-me-outside')

/* cache destination folder */
// const cacheFolder = path.join('/opt/build/cache', 'storage')
const cacheFolder = path.join(__dirname, '.cache')
/* Array of folders to cache */
const cacheInstructions = [
  {
    contents: path.join(__dirname, '../other/node_modules'),
    shouldCacheUpdate: async ({ cacheManifest, actions }) => {
      /*
        - Dates cache last updated
        - Make remote api request
        - Diff dependencies files like package.json
        - Whatever you want
      */
      console.log('cacheManifest', cacheManifest)
      // const { files, src } = cacheManifest.contents
      // This example uses changes to package.json to invalid cached 'node_modules' folder
      const filePath = path.join(path.join(__dirname, '../serverless-test'), 'serverless.yml')
      const fileChanged = await actions.diff(filePath)
      console.log('fileChanged', fileChanged)
      return fileChanged // Boolean
    },
    /* Run cache update as simple command */
    // handleCacheUpdate: 'npm install',
    /* Custom cache update functionality */
    handleCacheUpdate: async (api) => {
      console.log('UPDATE CACHE', api)
      await api.actions.runCommand('npm install')
    },
    /* Custom cache restore functionality */
    handleCacheRestore: async (api) => {
      console.log('RESTORE CACHE', api)
      await api.actions.restoreCache()
    },
    /* Custom cache persistance functionality */
    handleCacheSave: async (api) => {
      console.log('SAVE CACHE', api)
      await api.actions.saveCache()
    },
  },
  // ... add more folders if you want
]

// Run cacheMeOutside
cacheMeOutside(cacheFolder, cacheInstructions).then((cacheInfo) => {
  console.log('Success! You are ready to rock', cacheInfo)
})
