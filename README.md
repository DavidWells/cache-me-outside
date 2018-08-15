# Cache me outside

<img align="right" width="335" height="188" src="https://user-images.githubusercontent.com/532272/44130059-87483502-a000-11e8-9987-2a62f88e4385.jpg">

Caching tool for quicker builds in CI systems

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
    handleCacheUpdate: 'npm install && echo "this runs when cache is invalid"',
    /* shouldCacheUpdate? Returns true or false
      'cacheManifest' contains useful info for custom invalidation
      'utils' contains helpful functions for diffing  */
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

When the cache is saved it generates a `cache.json` manifest file. This is passed into `shouldCacheUpdate` if you want to use it to invalidate your cache.

```json
{
  "createdOn": 1534296638475,
  "createdOnDate": "Wed, 15 Aug 2018 01:30:38 GMT",
  "modifiedOn": 1534300695541,
  "cacheDir": "/Users/davidwells/Netlify/cache-magic/cache/Netlify/cache-magic/serverless-test",
  "cacheDirContents": "/Users/davidwells/Netlify/cache-magic/cache/Netlify/cache-magic/serverless-test/.serverless",
  "contents": {
    "src": "/Users/davidwells/Netlify/cache-magic/serverless-test/.serverless",
    "hash": "0496d16c0a8b1d43ca2d3c77ca48a8e237fdb625",
    "files": {
      "stuff.txt": "11b80f260a5eea9e867a23ab7f96aff77080ff90"
    }
  }
}
```


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
