import React, { useState, useRef, useEffect } from 'react'
import type { ChatMessage as ChatMsg } from '../../store/gameStore'
import { ChatMessage } from './ChatMessage'
import type { Player } from '@gungi/engine'
import { emitChatMessage } from '../../socket/client'

interface ChatPanelProps {
  messages: ChatMsg[]
  playerColor: Player
  collapsed?: boolean
  onToggle?: () => void
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  playerColor,
  collapsed = false,
  onToggle,
}) => {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text) return
    emitChatMessage(text)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className="flex flex-col rounded-lg border border-amber-700/30 overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #1A0E00 0%, #120A00 100%)' }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex items-center justify-between px-3 py-2 text-xs font-semibold
          uppercase tracking-wide text-amber-300/70 hover:text-amber-300 transition-colors"
      >
        <span>Chat</span>
        <span className="text-amber-400/50">{collapsed ? '▲' : '▼'}</span>
      </button>

      {!collapsed && (
        <>
          {/* Messages */}
          <div className="flex flex-col gap-2 px-3 py-2 overflow-y-auto" style={{ minHeight: 120, maxHeight: 200 }}>
            {messages.length === 0 && (
              <p className="text-xs text-amber-200/30 text-center mt-4">No messages yet</p>
            )}
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isOwnMessage={msg.color === playerColor}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 pb-2 pt-1 border-t border-amber-700/20">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              maxLength={500}
              className="flex-1 bg-stone-800/60 border border-amber-700/30 rounded px-2 py-1
                text-sm text-amber-100 placeholder-amber-200/30 outline-none
                focus:border-amber-500/60 transition-colors"
            />
            <button
              onClick={handleSend}
              className="px-3 py-1 rounded bg-amber-700/50 hover:bg-amber-600/50
                text-xs text-amber-200 transition-colors"
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  )
}
