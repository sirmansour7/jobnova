import { io, Socket } from "socket.io-client"
import { getCookie } from "./cookies"

export const SOCKET_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://jobnova-production-e410.up.railway.app"

let socket: Socket | null = null

/**
 * Returns a singleton Socket.io connection authenticated with the current JWT.
 * Pass `forceNew: true` to reconnect after logout/login.
 */
export function getSocket(forceNew = false): Socket {
  if (socket && socket.connected && !forceNew) return socket

  if (socket) {
    socket.disconnect()
    socket = null
  }

  const token = getCookie("jobnova_token") ?? ""

  socket = io(`${SOCKET_URL}/chat`, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    autoConnect: true,
  })

  return socket
}

/** Disconnect and clear the singleton (call on logout). */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
