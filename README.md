# Cache me outside

Caching tool for quicker builds in CI systems

<img align="right" width="335" height="188" src="http://www.fillmurray.com/100/100">

<!-- AUTO-GENERATED-CONTENT:START (TOC) -->
- [Usage](#usage)
- [How it works](#how-it-works)
<!-- AUTO-GENERATED-CONTENT:END -->

## Usage

Inside your build scripts:

```json
{
  "scripts": {
    "build": "node ./usage-example.js"
  }
}
```

Inside of CI system: `npm run build` will run through the diagram below.

1. Check for the cached files
2. If no cache, run the `handleCacheUpdate` commands or function (ie `npm install`)
3. Then save the contents to the cache directory for the next run.

If any of `shouldCacheUpdate` return true, the cached files are invalidated and `handleCacheUpdate` is ran again.

If you omit `shouldCacheUpdate`, the hash of the folder contents will be used, so if any file changes within the contents you are caching, the `handleCacheUpdate` will run.

<!-- AUTO-GENERATED-CONTENT:START (CODE:src=./usage-example.js&header=/* code from usage-example.js */) -->
<!-- The below code snippet is automatically added from ./usage-example.js -->
```js
/* code from usage-example.js */
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
```
<!-- AUTO-GENERATED-CONTENT:END -->


## How it works

```


                       ┌───────────────────────────────────────┐
                       │                                       │
                       │             npm run build             │
                       │                                       │
                       │     "node ./build-with-cache.js"      │
                       │                                       │
                       └───────────────────────────────────────┘
                                           │
                                   Does cache exist?
                                           │
                                           │
                                           ├───────────Yes───────────┐
                                           │                         │
                                           │                         │
                 ┌────────────No───────────┘                         │
                 │                                                   ▼
                 │                                     ┌───────────────────────────┐
                 │                                     │                           │
                 │                                     │  Check if Cache is valid  │
                 │                                     │  via `shouldCacheUpdate`  │
                 │                                     │                           │
                 │                                     │                           │
                 ▼                                     └───────────────────────────┘
   ┌───────────────────────────┐                                     │
   │                           │                               Is cache valid?
   │  Run `handleCacheUpdate`  │                                     │
   │    command or function    │◀────────────Not valid───────────────┴─────────────Valid─────┐
   │                           │                                                             │
   │                           │                                                             │
   └───────────────────────────┘                                                             │
                 │                                                                           ▼
                 │                                                    ┌────────────────────────────────────────────┐
                 ▼                                                    │                                            │
  ┌────────────────────────────┐                                      │   Cache is good and no files that would    │
  │                            │                                      │      trigger an update have changed.       │
  │   Copy contents to cache   │                                      │                                            │
  │   directory for next run   │                                      │ Copy cache contents to source destination  │
  │                            │                                      │                                            │
  │                            │                                      └────────────────────────────────────────────┘
  └────────────────────────────┘
```
