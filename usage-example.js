const path = require('path')
const cacheMagic = require('./lib')

// const cacheDir = path.resolve('./opt/buildhome/cache')
const cacheDir = path.resolve('./cache')

// Do it
const options = {
  directory: path.join(__dirname),
  cacheDir: cacheDir,
}

cacheMagic(options).then(() => {
  console.log('Success! You are ready to rock')
})
