import {
    MsgType
} from "alemon/types/types";

export interface SydneySendMessageOption {
    conversationSignature: string,
    conversationId: string,
    clientId: string,
    invocationId: number,
    parentMessageId: number,
    context?: string,
    abortController?: AbortController,
    timeout?: number,
    firstMessageTimeout?: number,
    groupId: string, nickname: string, qq: string, groupName: string, chats: MsgType[], botName: string, masterName: string,
    messageType: 'SearchQuery' | 'Chat'

    toneStyle: ToneStyle
}

export type ToneStyle = 'precise' | 'balanced' | 'h3imaginative' | 'sydney' | 'custom'