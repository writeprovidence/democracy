'use strict'
const assert      = require('chai').assert
const { List, Map }
                  = require('immutable')
const http        = require('http')
const url         = require('url')
const { Logger }  = require('./logger')
const LOGGER      = new Logger('db')
const { isBrowser, ensureDir, DB_DIR, buildFromDirs } = require('./utils')

/**
 * Take the callback action for every level in a hierarchical key space
 */
const getFileKeySpace = (key, cb) => {
  const keySpaces = List(key.split('/')) // in both localstorage and fs, we use UNIX sep
  const dirSpaces = keySpaces.slice(0,-1)
  dirSpaces.map((dir,i) => { cb(keySpaces.slice(0,i+1)) })
  const keyBase = keySpaces.get(-1)
  const dbDir = store.path.join(`${DB_DIR}`, ...dirSpaces.toJS())

  // Return the base filename and don't add .json extension
  // b/c the latter is only correct behavior for setImmutableKey
  // and this method is also used by getImmutableKey
  return store.path.join(dbDir, `${keyBase}`)
}

const store = {}

store.setStoreFS = (_fs) => {
  store.fs = _fs
}

store.setStorePath = (_path) => {
  store.path = _path
}

/**
 * set an immutable key, possibly moving aside previous immutable values
 * @param {fullKey} the full path to the key, separated by `/`
 * @param {value} the value to associate, either an Immutable {List}, {Map}, or null
 * @param {overwrite} true if are allowed to move aside previous immutable keys
 */
store.setImmutableKey = (fullKey, value, overwrite) => {
  assert(typeof(fullKey) === 'string')
  assert(Map.isMap(value) || List.isList(value) || !value)
 
  // TODO we need the same delete key logic below for browser 
  /*
  if (isBrowser()) {
    const valString = (value) ? JSON.stringify(value.toJS()) : value
    localStorage.setItem(fullKey, valString)
  } else {
 */
    ensureDir(DB_DIR)
    const dbFile = getFileKeySpace(fullKey, (keyPrefixes) => {
      ensureDir(store.path.join(DB_DIR, ...keyPrefixes)) })
    const now = Date.now()
    LOGGER.info(`overwrite ${overwrite}`)

    if (store.fs.existsSync(`${dbFile}.json`)) {
      if (!value || overwrite) {
        // We never delete, only move to the side
        store.fs.renameSync(`${dbFile}.json`, `${dbFile}.json.${now}`) 
        if (overwrite) {
          LOGGER.debug(`Overwriting key ${fullKey} with ${value}`)
          // don't return here b/c we need to write the new key file below
        } else {
          LOGGER.debug(`Marking key ${fullKey} deleted at time ${now}`)
          return true
        }
      } else {
        LOGGER.error(`Key ${dbFile}.json exists and is read-only.`)
        throw new Error(`Key ${dbFile}.json exists and is read-only.`)
      }
    } else if (store.fs.existsSync(dbFile)) {
      if (!value) {
        LOGGER.debug(`Deleting sub-key ${dbFile}`)
        store.fs.renameSync(`${dbFile}`, `${dbFile}.${now}`) 
        return true
      } else { 
        throw new Error(`Key ${dbFile} exists and is not a JSON file.`)
      }
    } else if (!value) {
      LOGGER.debug(`Unnecessary deletion of non-existent key ${fullKey}`)
      return true
    }
    const valJS = (Map.isMap(value) || List.isList(value)) ? value.toJS() : value
    LOGGER.debug(`Setting key ${fullKey} value ${JSON.stringify(valJS)}`)
    store.fs.writeFileSync(`${dbFile}.json`, JSON.stringify(valJS))
    return true
    /*
  }
*/
}

store.getImmutableKey = (fullKey, defaultValue) => {
  assert(typeof(fullKey) === 'string')
/*
  if (isBrowser()) {
    const value = fromJS(JSON.parse(localStorage.getItem(fullKey)))
    if (!value) {
      if (defaultValue) return defaultValue
      else { throw new Error(`Key ${fullKey} does not exist.`) }
    }
    return value
  } else {
 */
    const dbFile = getFileKeySpace(fullKey, () => {})
    if (store.fs.existsSync(`${dbFile}.json`)) {
      return buildFromDirs(`${dbFile}.json`, () => {return false})
    } else if (store.fs.existsSync(dbFile)) {
      return buildFromDirs(dbFile,
        // Return undeleted keys like a.json but not deleted keys a.json.1
        (fnParts) => { return ((fnParts.length > 1) && (fnParts[1] !== 'json')) ||
                              fnParts.length > 2 })
    } else {
      if (defaultValue) return defaultValue
      else { throw new Error(`Key ${dbFile} does not exist.`) }
    }
    /*
  }
 */
}  

module.exports = store
