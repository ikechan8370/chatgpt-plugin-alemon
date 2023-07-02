import {plugin, Messagetype, segment} from "alemon";
import logger from "../utils/logger";
import {ALRedis} from 'alemon-redis'
import {Config, defaultOpenAIAPI} from "../utils/config";
import * as types from "../client/openai/types";
import {getMaxModelTokens} from "../utils/tokens";
import {ChatGPTAPI} from "../client/openai/chatgpt-api";
import {ConversationRecord} from "../types/conversation";
import {getMessageById, upsertMessage} from "../utils/conversation";
import {newFetch} from "../utils/fetch";
import delay from "delay";

const defaultPropmtPrefix = ', a large language model trained by OpenAI. You answer as concisely as possible for each response (e.g. don’t be verbose). It is very important that you answer as concisely as possible, so please remember this. If you are generating a list, do not have too many items. Keep the number of items short.'


export class api extends plugin {


    constructor() {
        super({
            rule: [
                {
                    reg: /^\/chat/,
                    fnc: "chat",
                },
            ],
        });
    }

    async chat(e: Messagetype): Promise<boolean> {
        const prompt = e.msg.content.replace(/^\/chat/, '')
        logger.info('chat api mode, prompt: ' + prompt)
        try {
            const completionParams: Partial<Omit<
                types.openai.CreateChatCompletionRequest,
                'messages' | 'n'
            >> = {}
            if (Config.model) {
                completionParams.model = Config.model
            }
            const currentDate = new Date().toISOString().split('T')[0]
            const promptPrefix = `You are ${Config.assistantLabel} ${Config.promptPrefixOverride || defaultPropmtPrefix}
        Current date: ${currentDate}`
            const maxModelTokens = getMaxModelTokens(completionParams.model)
            const system = promptPrefix
            const opts: types.ChatGPTAPIOptions = {
                apiBaseUrl: Config.openAiBaseUrl,
                apiKey: Config.apiKey,
                debug: false,
                upsertMessage,
                getMessageById,
                systemMessage: system,
                completionParams,
                assistantLabel: Config.assistantLabel,
                // @ts-ignore
                fetch: newFetch,
                maxModelTokens
            }

            const chatGPTApi = new ChatGPTAPI(opts)
            let option: types.SendMessageOptions = {
                timeoutMs: 120000
                // systemMessage: promptPrefix
            }
            const key = `CHATGPT:CONVERSATIONS:${e.msg.author.id}`
            const ctime = new Date()
            const previousConversation: string = (key ? await ALRedis.get(key) : null) || JSON.stringify({
                sender: e.msg.user,
                ctime,
                utime: ctime,
                num: 0,
                conversation: {}
            })
            const previousConversationObj: ConversationRecord = JSON.parse(previousConversation)
            const conversation = {
                conversationId: previousConversationObj.conversation?.conversationId,
                parentMessageId: previousConversationObj.parentMessageId,
                clientId: previousConversationObj.clientId,
                invocationId: previousConversationObj.invocationId,
                conversationSignature: previousConversationObj.conversationSignature,
                bingToken: previousConversationObj.bingToken
            }
            if (conversation) {
                option = Object.assign(option, conversation)
            }
            option.systemMessage = system

            const sendMsgRes = await chatGPTApi.sendMessage(prompt, option)
            logger.debug(sendMsgRes)
            previousConversationObj.parentMessageId = sendMsgRes.id
            previousConversationObj.num = previousConversationObj.num + 1
            previousConversationObj.utime = new Date()
            await ALRedis.set(key, JSON.stringify(previousConversationObj))
            const obj = segment.reply(e.msg.id);
            await e.reply(sendMsgRes.text, obj);
        } catch (err) {
            logger.error('error happened when chatting with api mode', err)
            const obj = segment.reply(e.msg.id);
            await e.reply(err.message, obj);
        }
        return false
    }

}