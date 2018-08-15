# Cache me outside

<img align="right" width="335" height="188" src="https://user-images.githubusercontent.com/532272/44130059-87483502-a000-11e8-9987-2a62f88e4385.jpg">

Caching tool for quicker builds in CI systems

<!-- AUTO-GENERATED-CONTENT:START (TOC) -->
- [Usage](#usage)
  * [1. Configure the files you want to cache](#1-configure-the-files-you-want-to-cache)
  * [2. Add to your build step](#2-add-to-your-build-step)
- [API](#api)
- [How it works](#how-it-works)
<!-- AUTO-GENERATED-CONTENT:END -->

## Usage


### 1. Configure the files you want to cache

<!-- AUTO-GENERATED-CONTENT:START (CODE:src=./install-from-cache-example.js&header=/* code from ./install-from-cache-example.js */) -->
<!-- The below code snippet is automatically added from ./install-from-cache-example.js -->
```js
/* code from ./install-from-cache-example.js */
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
```
<!-- AUTO-GENERATED-CONTENT:END -->

### 2. Add to your build step

Now that we have configured what we want to cache, we need to add this to our build step.

Inside `package.json`, or whatever build tool you are using, run the `catch-me-outside` script before your build step.

```json
{
  "scripts": {
    "prebuild": "node ./install-from-cache-example.js",
    "build": "react-scripts build"
  }
}
```

Inside of CI system: `npm run build` will run through the diagram below.

1. Check for the cached files
2. If no cache, run the `handleCacheUpdate` commands or function (ie `npm install`)
3. Then save the contents to the cache directory for the next run.

If any of `shouldCacheUpdate` return true, the cached files are invalidated and `handleCacheUpdate` is ran again.

If you omit `shouldCacheUpdate`, the hash of the folder contents will be used, so if any file changes within the contents you are caching, the `handleCacheUpdate` will run.


## API

<!-- AUTO-GENERATED-CONTENT:START (CODE:src=./install-from-cache-larger-example.js&header=/* code from install-from-cache-larger-example.js */) -->
<!-- The below code snippet is automatically added from ./install-from-cache-larger-example.js -->
```js
/* code from install-from-cache-larger-example.js */
const path = require('path')
const cacheMeOutside = require('./lib') // require('cache-me-outside')

/* Netlify cache folder */
let cacheFolder = path.join('/opt/build/cache', 'my-cache-folder')

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
                       │     "node ./cache-me-script.js"       │
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
