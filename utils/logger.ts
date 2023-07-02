import {AppName} from "../app.config";
import {Config} from "./config";

export class Logger {
    info (msg: string | NonNullable<unknown>) {
        if (typeof msg !== 'string') {
            msg = JSON.stringify(msg)
        }
        console.log(`[${AppName}] - [info] - ${formatDateTime()} ${msg}`)
    }
    warn (msg: string | NonNullable<unknown>) {
        if (typeof msg !== 'string') {
            msg = JSON.stringify(msg)
        }
        console.warn(`[${AppName}] - [warn] - ${formatDateTime()} ${msg}`)
    }
    error (msg: string | NonNullable<unknown>, err?: Error) {
        if (typeof msg !== 'string') {
            msg = JSON.stringify(msg)
        }
        console.error(`[${AppName}] - [error] - ${formatDateTime()} ${msg}`)
        if (err) {
            console.error(err)
        } else {
            console.error(msg)
        }
    }
    
    debug (msg: string | NonNullable<unknown>) {
        if (Config.debug) {
            if (typeof msg !== 'string') {
                msg = JSON.stringify(msg)
            }
            console.info(`[${AppName}] - [error] - ${formatDateTime()} ${msg}`)
        }
    }
}
function formatDateTime (currentDate: Date = new Date()): string {
    return currentDate.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    })
}
const logger = new Logger()

export default logger