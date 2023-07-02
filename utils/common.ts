import { exec } from 'child_process'
import lodash from 'lodash'
import fs from 'node:fs'
import path from 'node:path'
import buffer from 'buffer'
import yaml from 'yaml'
import { Config } from './config.js'
import logger from "./logger";


const localIP = ''


export function randomString (length = 5) {
  let str = ''
  for (let i = 0; i < length; i++) {
    str += lodash.random(36).toString(36)
  }
  return str.substr(0, length)
}

export async function tryTimes (promiseFn, maxTries = 10) {
  try {
    return await promiseFn()
  } catch (e) {
    if (maxTries > 0) {
      logger.warn('Failed, retry ' + maxTries)
      return tryTimes(promiseFn, maxTries - 1)
    }
    throw e
  }
}



// @see https://github.com/sindresorhus/p-timeout
export async function pTimeout (
  promise,
  options
) {
  const {
    milliseconds,
    fallback,
    message,
    customTimers = { setTimeout, clearTimeout }
  } = options

  let timer

  const cancelablePromise = new Promise((resolve, reject) => {
    if (typeof milliseconds !== 'number' || Math.sign(milliseconds) !== 1) {
      throw new TypeError(
          `Expected \`milliseconds\` to be a positive number, got \`${milliseconds}\``
      )
    }

    if (milliseconds === Number.POSITIVE_INFINITY) {
      resolve(promise)
      return
    }

    if (options.signal) {
      const { signal } = options
      if (signal.aborted) {
        reject(getAbortedReason(signal))
      }

      signal.addEventListener('abort', () => {
        reject(getAbortedReason(signal))
      })
    }

    timer = customTimers.setTimeout.call(
      undefined,
      () => {
        if (fallback) {
          try {
            resolve(fallback())
          } catch (error) {
            reject(error)
          }

          return
        }

        const errorMessage =
              typeof message === 'string'
                ? message
                : `Promise timed out after ${milliseconds} milliseconds`
        const timeoutError =
              message instanceof Error ? message : new Error(errorMessage)

        if (typeof promise.cancel === 'function') {
          promise.cancel()
        }

        reject(timeoutError)
      },
      milliseconds
    )
    ;(async () => {
      try {
        resolve(await promise)
      } catch (error) {
        reject(error)
      } finally {
        customTimers.clearTimeout.call(undefined, timer)
      }
    })()
  })

  // @ts-ignore
  cancelablePromise.clear = () => {
    customTimers.clearTimeout.call(undefined, timer)
    timer = undefined
  }

  return cancelablePromise
}
/**
 TODO: Remove below function and just 'reject(signal.reason)' when targeting Node 18.
 */
function getAbortedReason (signal) {
  const reason =
      signal.reason === undefined
        ? getDOMException('This operation was aborted.')
        : signal.reason

  return reason instanceof Error ? reason : getDOMException(reason)
}
/**
 TODO: Remove AbortError and just throw DOMException when targeting Node 18.
 */
function getDOMException (errorMessage) {
  return globalThis.DOMException === undefined
    ? new Error(errorMessage)
    : new DOMException(errorMessage)
}


export function mkdirs (dirname) {
  if (fs.existsSync(dirname)) {
    return true
  } else {
    if (mkdirs(path.dirname(dirname))) {
      fs.mkdirSync(dirname)
      return true
    }
  }
}

export function formatDate (date) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // Note that getMonth() returns a zero-based index
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()

  const formattedDate = `${year}年${month}月${day}日 ${hour}:${minute}`
  return formattedDate
}


export function getDefaultReplySetting () {
  return {
    usePicture: Config.defaultUsePicture,
    useTTS: Config.defaultUseTTS,
    ttsRole: Config.defaultTTSRole,
    ttsRoleAzure: Config.azureTTSSpeaker,
    ttsRoleVoiceVox: Config.voicevoxTTSSpeaker
  }
}

export function parseDuration (duration) {
  const timeMap = {
    秒: 1,
    分: 60,
    小时: 60 * 60
  }

  // 去掉多余的空格并将单位转化为小写字母
  duration = duration.trim().toLowerCase()

  // 去掉末尾的 "钟" 字符
  if (duration.endsWith('钟')) {
    duration = duration.slice(0, -1)
  }

  // 提取数字和单位
  const match = duration.match(/^(\d+)\s*([\u4e00-\u9fa5]+)$/)

  if (!match) {
    throw new Error('Invalid duration string: ' + duration)
  }

  const num = parseInt(match[1], 10)
  const unit = match[2]

  if (!(unit in timeMap)) {
    throw new Error('Unknown time unit: ' + unit)
  }

  return num * timeMap[unit]
}

export function formatDuration (duration) {
  const timeMap = {
    小时: 60 * 60,
    分钟: 60,
    秒钟: 1
  }

  const units = Object.keys(timeMap)
  let result = ''

  for (let i = 0; i < units.length; i++) {
    const unit = units[i]
    const value = Math.floor(duration / timeMap[unit])

    if (value > 0) {
      result += value + unit
      duration -= value * timeMap[unit]
    }
  }

  return result || '0秒钟'
}


export function limitString (str, maxLength, addDots = true) {
  if (str.length <= maxLength) {
    return str
  } else {
    if (addDots) {
      return str.slice(0, maxLength) + '...'
    } else {
      return str.slice(0, maxLength)
    }
  }
}


export function maskQQ (qq) {
  if (!qq) {
    return '未知'
  }
  const len = qq.length // QQ号长度
  const newqq = qq.slice(0, 3) + '*'.repeat(len - 7) + qq.slice(len - 3) // 替换中间3位为*
  return newqq
}
