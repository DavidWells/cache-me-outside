const path = require('path')
const cacheMagic = require('./lib')

// const cacheDir = path.resolve('./opt/buildhome/cache')
const cacheFolder = path.resolve('./cache')

// Do it
const options = {
  // directorys or files to cache
  // contents: path.join(__dirname, 'two'),
  contents: [
    {
      path: path.join(__dirname, 'two/node_modules'),
      // TODO finish Cache Invalidator
      invalidateOn: path.join(__dirname, 'two/package.json'),
      command: 'npm install'
    },
    {
      path: path.join(__dirname, 'other/node_modules'),
      invalidateOn: path.join(__dirname, 'other/package.json'),
      command: 'npm install'
    },
    {
      path: path.join(__dirname, 'serverless-test/.serverless'),
      invalidateOn: 'serverless.yml',
      command: 'echo "hi"'
    }
  ],
  // cache folder destination
  cacheFolder: cacheFolder,

  ignoreIfFolderExists: false,
  // TODO finish Cache Invalidator
  invalidateOn: () => {
    return ''
  }
}

cacheMagic(options).then(() => {
  console.log('Success! You are ready to rock')
})
