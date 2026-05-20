import { useState, useEffect, useRef } from 'react';
import { useChatroomStore } from '../stores/chatroomStore';
import { useRoleStore } from '../stores/roleStore';

interface CharState {
  id: string;
  roleId: string;
  name: string;
  avatar: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  isMoving: boolean;
}

interface Props {
  chatroomId: string;
  onMention: (roleName: string) => void;
}

const MAP_W = 100;
const MAP_H = 100;
const CHAR_SIZE = 12;
const SPEED = 0.25;

function randomPos(existing: { x: number; y: number }[], margin: number): { x: number; y: number } {
  for (let attempt = 0; attempt < 50; attempt++) {
    const x = margin + Math.random() * (MAP_W - 2 * margin);
    const y = margin + Math.random() * (MAP_H - 2 * margin);
    const tooClose = existing.some(
      (p) => Math.abs(p.x - x) < CHAR_SIZE * 2 && Math.abs(p.y - y) < CHAR_SIZE * 2
    );
    if (!tooClose) return { x, y };
  }
  return { x: margin, y: margin };
}

function randomTarget(): { x: number; y: number } {
  return {
    x: CHAR_SIZE + Math.random() * (MAP_W - 2 * CHAR_SIZE),
    y: CHAR_SIZE + Math.random() * (MAP_H - 2 * CHAR_SIZE),
  };
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export default function MapView({ chatroomId, onMention }: Props) {
  const chatrooms = useChatroomStore((s) => s.chatrooms);
  const roles = useRoleStore((s) => s.roles);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(600);
  const [containerH, setContainerH] = useState(400);
  const [chars, setChars] = useState<CharState[]>([]);
  const animRef = useRef(0);

  const chatroom = chatrooms.find((c) => c.id === chatroomId);
  const memberRoles = (chatroom?.memberRoleIds || [])
    .map((rid) => roles.find((r) => r.id === rid))
    .filter(Boolean) as NonNullable<typeof roles[0]>[];

  // Get latest message for each role
  const lastMessages = useRef<Record<string, string>>({});
  const speakingRoles = useRef<Set<string>>(new Set());

  if (chatroom) {
    for (const msg of chatroom.messageHistory) {
      if (msg.roleId !== 'user' && msg.roleId !== 'system') {
        if (msg.isStreaming && msg.content) {
          speakingRoles.current.add(msg.roleId);
          lastMessages.current[msg.roleId] = msg.content;
        } else {
          speakingRoles.current.delete(msg.roleId);
          if (msg.content) {
            lastMessages.current[msg.roleId] = msg.content;
          }
        }
      }
    }
  }

  // Init characters
  useEffect(() => {
    const occupied: { x: number; y: number }[] = [];
    const initChars: CharState[] = memberRoles.map((role) => {
      const pos = randomPos(occupied, CHAR_SIZE * 2);
      occupied.push(pos);
      return {
        id: role.id,
        roleId: role.id,
        name: role.name,
        avatar: role.avatar || '🤖',
        x: pos.x,
        y: pos.y,
        targetX: pos.x,
        targetY: pos.y,
        isMoving: false,
      };
    });
    if (initChars.length === 0) {
      initChars.push({
        id: 'placeholder',
        roleId: '',
        name: '空',
        avatar: '👻',
        x: MAP_W / 2,
        y: MAP_H / 2,
        targetX: MAP_W / 2,
        targetY: MAP_H / 2,
        isMoving: false,
      });
    }
    setChars(initChars);
  }, [chatroomId]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setContainerW(e.contentRect.width);
        setContainerH(e.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Animation loop
  useEffect(() => {
    let running = true;
    let lastTime = performance.now();

    const tick = (time: number) => {
      if (!running) return;
      const dt = Math.min((time - lastTime) / 16, 3);
      lastTime = time;

      setChars((prev) =>
        prev.map((c) => {
          if (c.id === 'placeholder') return c;
          const d = dist(c.x, c.y, c.targetX, c.targetY);
          let tx = c.targetX;
          let ty = c.targetY;

          if (d < 2) {
            const t = randomTarget();
            tx = t.x;
            ty = t.y;
          }

          const dx = tx - c.x;
          const dy = ty - c.y;
          const dd = dist(0, 0, dx, dy);
          if (dd > 1) {
            const step = SPEED * dt;
            const nx = Math.max(CHAR_SIZE, Math.min(MAP_W - CHAR_SIZE, c.x + (dx / dd) * step));
            const ny = Math.max(CHAR_SIZE, Math.min(MAP_H - CHAR_SIZE, c.y + (dy / dd) * step));
            return { ...c, x: nx, y: ny, targetX: tx, targetY: ty, isMoving: d > 1 };
          }
          return { ...c, isMoving: false };
        })
      );
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [chatroomId]);

  const sx = containerW / MAP_W;
  const sy = containerH / MAP_H;

  if (memberRoles.length === 0) {
    return (
      <div className="map-empty">
        <MapEmptyIcon />
        <p>群聊中没有成员，请先添加角色</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="map-container">
      <svg className="map-bg" width={containerW} height={containerH}>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(100,255,218,0.06)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={containerW} height={containerH} fill="url(#grid)" />
      </svg>

      {chars.map((ch) => {
        if (ch.id === 'placeholder') return null;
        const role = roles.find((r) => r.id === ch.roleId);
        if (!role) return null;

        const px = ch.x * sx;
        const py = ch.y * sy;
        const csize = CHAR_SIZE * Math.min(sx, sy);
        const isSpeaking = speakingRoles.current.has(ch.roleId);
        const latestMsg = lastMessages.current[ch.roleId];

        return (
          <div
            key={ch.id}
            className={"map-char" + (ch.isMoving ? " moving" : "") + (isSpeaking ? " speaking" : "")}
            style={{
              left: px - csize / 2,
              top: py - csize / 2,
              width: csize,
              height: csize,
              fontSize: csize * 0.55,
            }}
            onClick={() => { if (ch.roleId) onMention(ch.name); }}
            title={ch.name}
          >
            <span className="map-char-avatar">{ch.avatar}</span>
            <div className="map-char-name">{ch.name}</div>
            {isSpeaking && latestMsg && (
              <div className="map-speech-bubble">
                {latestMsg.length > 30 ? latestMsg.slice(0, 30) + '...' : latestMsg}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MapEmptyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.5 }}>
      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      <circle cx="12" cy="13" r="2" />
      <path d="M12 11v-2" />
    </svg>
  );
}
