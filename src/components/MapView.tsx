import { useState, useEffect, useRef, useCallback } from 'react';
import { useChatroomStore } from '../stores/chatroomStore';
import { useRoleStore } from '../stores/roleStore';
import { Map } from 'lucide-react';

interface CharState {
  id: string;
  roleId: string;
  name: string;
  avatar: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
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
const SPEED = 0.3;

// Generate random positions avoiding overlap
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

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export default function MapView({ chatroomId, onMention }: Props) {
  const chatrooms = useChatroomStore((s) => s.chatrooms);
  const roles = useRoleStore((s) => s.roles);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 600, h: 400 });
  const [chars, setChars] = useState<CharState[]>([]);
  const animRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(0);

  const chatroom = chatrooms.find((c) => c.id === chatroomId);
  const memberRoles = chatroom?.memberRoleIds
    .map((rid) => roles.find((r) => r.id === rid))
    .filter(Boolean) ?? [];

  // Get latest message for each role
  const lastMessages = useRef<Map<string, string>>(new Map());
  const speakingRoles = useRef<Set<string>>(new Set());

  if (chatroom) {
    for (const msg of chatroom.messageHistory) {
      if (msg.roleId !== 'user' && msg.roleId !== 'system') {
        if (!msg.isStreaming && msg.content) {
          lastMessages.current.set(msg.roleId, msg.content);
        }
        // Show streaming messages too
        if (msg.isStreaming && msg.content) {
          speakingRoles.current.add(msg.roleId);
          lastMessages.current.set(msg.roleId, msg.content);
        } else {
          speakingRoles.current.delete(msg.roleId);
        }
      }
    }
  }

  // Init characters on mount or when members change
  useEffect(() => {
    const occupied: { x: number; y: number }[] = [];
    const initChars: CharState[] = memberRoles.map((role) => {
      const pos = randomPos(occupied, CHAR_SIZE * 2);
      occupied.push(pos);
      return {
        id: role!.id,
        roleId: role!.id,
        name: role!.name,
        avatar: role!.avatar || '🤖',
        x: pos.x,
        y: pos.y,
        vx: 0,
        vy: 0,
        targetX: pos.x,
        targetY: pos.y,
        isMoving: false,
      };
    });
    // If no roles, add a placeholder
    if (initChars.length === 0) {
      initChars.push({
        id: 'placeholder',
        roleId: '',
        name: '空',
        avatar: '👻',
        x: MAP_W / 2,
        y: MAP_H / 2,
        vx: 0,
        vy: 0,
        targetX: MAP_W / 2,
        targetY: MAP_H / 2,
        isMoving: false,
      });
    }
    setChars(initChars);
  }, [chatroomId, memberRoles.length]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setContainerSize({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Animation loop - update positions
  useEffect(() => {
    let running = true;
    const tick = (time: number) => {
      if (!running) return;
      const dt = Math.min((time - lastUpdateRef.current) / 16, 3);
      lastUpdateRef.current = time;

      setChars((prev) =>
        prev.map((c) => {
          if (c.id === 'placeholder') return c;
          // If we reached target, pick a new one
          const dist = distance(c.x, c.y, c.targetX, c.targetY);
          let newTargetX = c.targetX;
          let newTargetY = c.targetY;

          if (dist < 2) {
            // Pick new random target
            const t = randomTarget();
            newTargetX = t.x;
            newTargetY = t.y;
          }

          // Move toward target
          const dx = newTargetX - c.x;
          const dy = newTargetY - c.y;
          const d = distance(0, 0, dx, dy);
          if (d > 1) {
            const step = SPEED * dt;
            const nx = c.x + (dx / d) * step;
            const ny = c.y + (dy / d) * step;
            return { ...c, x: Math.max(CHAR_SIZE, Math.min(MAP_W - CHAR_SIZE, nx)), y: Math.max(CHAR_SIZE, Math.min(MAP_H - CHAR_SIZE, ny)), targetX: newTargetX, targetY: newTargetY, isMoving: true };
          }
          return { ...c, isMoving: false };
        })
      );
      animRef.current = requestAnimationFrame(tick);
    };
    lastUpdateRef.current = performance.now();
    animRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [chatroomId, memberRoles.length]);

  // Pause animation when not visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animRef.current);
      } else {
        lastUpdateRef.current = performance.now();
        animRef.current = requestAnimationFrame((t) => {
          lastUpdateRef.current = t;
          // Re-trigger via tick
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const scaleX = containerSize.w / MAP_W;
  const scaleY = containerSize.h / MAP_H;

  if (memberRoles.length === 0) {
    return (
      <div className="map-empty">
        <Map size={48} />
        <p>群聊中没有成员，请先添加角色</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="map-container">
      {/* Background grid pattern */}
      <svg className="map-bg" width={containerSize.w} height={containerSize.h}>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(100,255,218,0.06)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Characters */}
      {chars.map((ch) => {
        const role = roles.find((r) => r.id === ch.roleId);
        if (!role && ch.id !== 'placeholder') return null;

        const px = ch.x * scaleX;
        const py = ch.y * scaleY;
        const size = CHAR_SIZE * scaleX;
        const isSpeaking = ch.roleId !== '' && speakingRoles.current.has(ch.roleId);
        const latestMsg = lastMessages.current.get(ch.roleId);

        return (
          <div
            key={ch.id}
            className={`map-char ${ch.isMoving ? 'moving' : ''} ${isSpeaking ? 'speaking' : ''}`}
            style={{
              left: px - size / 2,
              top: py - size / 2,
              width: size,
              height: size,
              fontSize: size * 0.6,
            }}
            onClick={() => {
              if (ch.roleId) onMention(ch.name);
            }}
            title={ch.name}
          >
            <span className="map-char-avatar">{ch.avatar}</span>
            <div className="map-char-name">{ch.name}</div>

            {/* Speech bubble */}
            {isSpeaking && latestMsg && (
              <div className="map-speech-bubble">
                {latestMsg.length > 30 ? latestMsg.slice(0, 30) + '…' : latestMsg}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
