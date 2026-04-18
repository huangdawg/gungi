import React from 'react'
import type { ChatMessage as ChatMsg } from '../../store/gameStore'

interface ChatMessageProps {
  message: ChatMsg
  isOwnMessage: boolean
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isOwnMessage }) => {
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`flex flex-col gap-0.5 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-1.5">
        <span
          className={`text-[10px] font-medium ${
            message.color === 'black' ? 'text-red-400' : 'text-stone-400'
          }`}
        >
          {message.from}
        </span>
        <span className="text-[10px] text-amber-200/30">{time}</span>
      </div>
      <div
        className={`px-2.5 py-1.5 rounded-lg text-sm max-w-[200px] break-words
          ${isOwnMessage
            ? 'bg-amber-700/40 text-amber-100'
            : 'bg-stone-700/40 text-stone-200'
          }`}
      >
        {message.text}
      </div>
    </div>
  )
}
