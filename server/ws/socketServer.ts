import type http from 'node:http';
import { WebSocketServer } from 'ws';
import { isSessionBanned } from '../services/consentService.ts';
import {
  closeRoom,
  findActiveRoomForSession,
  joinMatchQueue,
  leaveQueue,
} from '../services/matchingService.ts';
import {
  blockCurrentPartner,
  handleIncomingMessage,
  handleReadReceipt,
  handleTyping,
} from '../services/messagingService.ts';
import { verifyAdminToken } from '../services/moderationService.ts';
import {
  attachUserSocket,
  broadcastActiveCount,
  detachUserSocket,
  getActiveUserCount,
  sendToSession,
} from '../services/realtimeBus.ts';
import { store } from '../services/store.ts';

export function attachWebSocketServer(server: http.Server): void {
  const userWss = new WebSocketServer({ noServer: true });
  const adminWss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

    if (url.pathname === '/ws') {
      const sessionId = url.searchParams.get('sessionId') || '';
      const session = store.sessions.get(sessionId);

      if (!session || !session.consent) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      const ban = isSessionBanned(session);
      if (ban.banned) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }

      userWss.handleUpgrade(request, socket, head, (ws) => {
        userWss.emit('connection', ws, sessionId);
      });
      return;
    }

    if (url.pathname === '/ws/admin') {
      const token = url.searchParams.get('token') || '';
      const verified = verifyAdminToken(token);
      if (!verified) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      adminWss.handleUpgrade(request, socket, head, (ws) => {
        adminWss.emit('connection', ws, verified.label);
      });
      return;
    }

    // Do not destroy non-/ws upgrade requests (e.g., if Vite dev HMR asks)
  });

  userWss.on('connection', (ws, sessionId: string) => {
    attachUserSocket(sessionId, ws);
    const session = store.sessions.get(sessionId);
    if (session) {
      session.lastActiveAt = Date.now();
      sendToSession(sessionId, 'presence:count', {
        activeUsers: getActiveUserCount(),
      });

      // Deliver any pending report resolution notices
      if (session.pendingNotifications.length > 0) {
        for (const notif of session.pendingNotifications) {
          sendToSession(sessionId, 'report:resolved', notif);
        }
        session.pendingNotifications = [];
      }
    }

    broadcastActiveCount();

    ws.on('message', (rawData) => {
      let parsed: { event?: string; payload?: Record<string, unknown> };
      try {
        parsed = JSON.parse(rawData.toString('utf8'));
      } catch {
        return;
      }

      const event = parsed.event;
      const payload = parsed.payload || {};
      const currentSession = store.sessions.get(sessionId);
      if (!currentSession) return;
      currentSession.lastActiveAt = Date.now();

      switch (event) {
        case 'match:join': {
          const interests = Array.isArray(payload.interests)
            ? (payload.interests as string[])
            : [];
          const customNickname =
            typeof payload.customNickname === 'string'
              ? payload.customNickname
              : null;
          const result = joinMatchQueue(sessionId, interests, customNickname);
          if (!result.ok) {
            sendToSession(sessionId, 'match:error', {
              message: result.error || 'Eşleşme başlatılamadı.',
            });
          }
          break;
        }

        case 'match:cancel': {
          leaveQueue(sessionId);
          break;
        }

        case 'chat:message': {
          const roomId = typeof payload.roomId === 'string' ? payload.roomId : '';
          const hasAttachment = Boolean(payload.hasAttachment);
          handleIncomingMessage(sessionId, roomId, payload.text, hasAttachment);
          break;
        }

        case 'chat:typing': {
          const roomId = typeof payload.roomId === 'string' ? payload.roomId : '';
          handleTyping(sessionId, roomId, Boolean(payload.isTyping));
          break;
        }

        case 'chat:read': {
          const roomId = typeof payload.roomId === 'string' ? payload.roomId : '';
          const messageIds = Array.isArray(payload.messageIds)
            ? (payload.messageIds as string[])
            : [];
          handleReadReceipt(sessionId, roomId, messageIds);
          break;
        }

        case 'chat:leave': {
          const roomId = typeof payload.roomId === 'string' ? payload.roomId : '';
          const room =
            (roomId ? store.rooms.get(roomId) : undefined) ||
            findActiveRoomForSession(sessionId);
          if (room && room.participants.includes(sessionId)) {
            closeRoom(room.roomId, sessionId, 'ended');
          }
          break;
        }

        case 'user:block': {
          const roomId = typeof payload.roomId === 'string' ? payload.roomId : '';
          blockCurrentPartner(sessionId, roomId);
          break;
        }

        default:
          break;
      }
    });

    ws.on('close', () => {
      const noMoreSockets = detachUserSocket(sessionId, ws);
      if (noMoreSockets) {
        leaveQueue(sessionId);
        const activeRoom = findActiveRoomForSession(sessionId);
        if (activeRoom) {
          closeRoom(activeRoom.roomId, sessionId, 'disconnected');
        }
      }
      broadcastActiveCount();
    });
  });

  adminWss.on('connection', (ws) => {
    store.adminWsClients.add(ws);
    ws.on('close', () => {
      store.adminWsClients.delete(ws);
    });
  });
}
