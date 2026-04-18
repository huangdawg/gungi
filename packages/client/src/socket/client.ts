import { io, Socket } from 'socket.io-client'
import type { GameState, Move } from '@gungi/engine'
import type { Player } from '@gungi/engine'
import { useGameStore } from '../store/gameStore'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoomJoinedPayload {
  gameState: GameState
  color: Player
  roomCode: string
  isReconnect: boolean
}

interface GameStatePayload {
  gameState: GameState
}

interface GameOverPayload {
  winner: Player | null
  reason: 'checkmate' | 'resigned' | 'draw' | 'forfeit'
}

interface ChatMessagePayload {
  from: string
  color: Player
  text: string
  timestamp: number
}

interface DrawOfferedPayload {
  offeredBy: Player
}

// ─── Singleton socket instance ────────────────────────────────────────────────

let socket: Socket | null = null
let gameOverCallback: ((payload: GameOverPayload) => void) | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      withCredentials: true,
      autoConnect: false,
    })
    attachHandlers(socket)
  }
  return socket
}

export function setGameOverCallback(cb: (payload: GameOverPayload) => void): void {
  gameOverCallback = cb
}

// ─── Event handlers ───────────────────────────────────────────────────────────

function attachHandlers(sock: Socket): void {
  const store = useGameStore.getState

  sock.on('connect', () => {
    console.log('Socket connected:', sock.id)
  })

  sock.on('disconnect', (reason: string) => {
    console.log('Socket disconnected:', reason)
  })

  sock.on('room:joined', (payload: RoomJoinedPayload) => {
    const s = store()
    s.setGameState(payload.gameState)
    s.setPlayerColor(payload.color)
    s.setRoomCode(payload.roomCode)
    s.setWaitingForOpponent(payload.gameState.players.black === null || payload.gameState.players.white === null)
  })

  sock.on('room:opponent-joined', (payload: { displayName: string }) => {
    store().setOpponentName(payload.displayName)
    store().setWaitingForOpponent(false)
  })

  sock.on('room:opponent-reconnected', (payload: { displayName: string }) => {
    store().setOpponentName(payload.displayName)
  })

  sock.on('room:opponent-disconnected', () => {
    // Could show a toast — handled in component via store
  })

  sock.on('game:state', (payload: GameStatePayload) => {
    store().setGameState(payload.gameState)
  })

  sock.on('game:over', (payload: GameOverPayload) => {
    const s = store()
    s.setGameState({ ...s.gameState!, gameStatus: payload.reason === 'draw' ? 'draw' : payload.winner ? (payload.reason === 'checkmate' ? 'checkmate' : 'resigned') : 'draw', winner: payload.winner })
    if (gameOverCallback) gameOverCallback(payload)
  })

  sock.on('game:draw-offered', (_payload: DrawOfferedPayload) => {
    store().setDrawOffered(true)
  })

  sock.on('game:draw-declined', () => {
    store().setDrawPending(false)
    store().setDrawOffered(false)
  })

  sock.on('chat:message', (payload: ChatMessagePayload) => {
    store().addMessage({
      from: payload.from,
      color: payload.color,
      text: payload.text,
      timestamp: payload.timestamp,
    })
  })

  sock.on('error', (payload: { message: string }) => {
    console.error('Socket error:', payload.message)
  })
}

// ─── Emitters ─────────────────────────────────────────────────────────────────

export function emitJoinRoom(roomCode: string, sessionToken: string, displayName?: string): void {
  const sock = getSocket()
  if (!sock.connected) sock.connect()
  sock.emit('room:join', { roomCode, sessionToken, displayName })
}

export function emitMove(move: Move): void {
  const sock = getSocket()
  sock.emit('game:move', { moveJson: move })
}

export function emitResign(): void {
  const sock = getSocket()
  sock.emit('game:resign')
}

export function emitDrawOffer(): void {
  const sock = getSocket()
  sock.emit('game:draw-offer')
}

export function emitDrawAccept(): void {
  const sock = getSocket()
  sock.emit('game:draw-accept')
}

export function emitDrawDecline(): void {
  const sock = getSocket()
  sock.emit('game:draw-decline')
}

export function emitChatMessage(text: string): void {
  const sock = getSocket()
  sock.emit('chat:message', { text })
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
    gameOverCallback = null
  }
}
