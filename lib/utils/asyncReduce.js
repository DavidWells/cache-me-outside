const getHash = require('./getHash')

async function asyncReduce(array, handler, startingValue) {
  let result = startingValue

  for (let value of array) {
    // `await` will transform result of the function to the promise,
    // even it is a synchronous call
    result = await handler(result, value)
  }

  return result
}

function checkForDiffs(diffKeys, filePath, cacheData) {
  return asyncReduce(diffKeys,
    async (resolvedLinks, current) => {
      if (current === filePath) {
        const hashPromise = await getHash(filePath)
        return resolvedLinks.concat(hashPromise)
      }
      const valuePromise = await Promise.resolve(cacheData.diffs[current])
      return resolvedLinks.concat(valuePromise)
    }, [])
}

module.exports = checkForDiffs
