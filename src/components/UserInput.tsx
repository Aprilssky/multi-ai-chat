import { useState, useRef, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface Props {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  prefill?: string;
  onPrefillUsed?: () => void;
}

export default function UserInput({ onSend, disabled, placeholder, prefill, onPrefillUsed }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevPrefill = useRef('');

  // Apply prefill from map click
  if (prefill && prefill !== prevPrefill.current) {
    prevPrefill.current = prefill;
    // Append to current value or set if empty
    setValue((prev) => {
      const next = prev.trim() ? prev + ' ' + prefill : prefill;
      return next;
    });
    onPrefillUsed?.();
    // Focus textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(
        textareaRef.current.scrollHeight,
        120
      ) + 'px';
    }
  };

  return (
    <div className="user-input-area">
      <div className="user-input-row">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || '输入消息... (Enter 发送, Shift+Enter 换行)'}
          disabled={disabled}
          rows={1}
        />
        <button
          className="btn btn-primary"
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          style={{ opacity: value.trim() ? 1 : 0.5, height: 44 }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
