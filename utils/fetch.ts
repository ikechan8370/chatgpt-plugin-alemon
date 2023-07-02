import {Config} from "./config";
import logger from "./logger";
import fetch, {RequestInit} from "node-fetch";
let proxy
if (Config.proxy) {
    try {
        proxy = (await import('https-proxy-agent')).default
    } catch (e) {
        logger.warn('未安装https-proxy-agent，请在插件目录下执行pnpm add https-proxy-agent')
    }
}

export const newFetch = (url, options?: RequestInit) => {
    const defaultOptions = Config.proxy
        ? {
            agent: proxy(Config.proxy)
        }
        : {}
    if (!options) {
        options = {}
    }
    const mergedOptions = {
        ...defaultOptions,
        ...options
    }

    return fetch(url, mergedOptions)
}