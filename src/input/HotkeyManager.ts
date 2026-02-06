import { EventBus } from '@/core/EventBus';

interface HotkeyBinding {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export class HotkeyManager {
  private bindings: HotkeyBinding[] = [];
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.register({
      key: 'Enter',
      action: () => this.eventBus.emit('turn:end', {}),
      description: 'End Turn',
    });
    this.register({
      key: 'Escape',
      action: () => {
        this.eventBus.emit('view:settings', {});
      },
      description: 'Settings / Pause',
    });
    this.register({
      key: 'F5',
      action: () => this.eventBus.emit('view:research', {}),
      description: 'Research Screen',
    });
    this.register({
      key: 'F2',
      action: () => this.eventBus.emit('view:galaxy', {}),
      description: 'Galaxy Map',
    });
  }

  register(binding: HotkeyBinding): void {
    this.bindings.push(binding);
  }

  private onKeyDown(e: KeyboardEvent): void {
    // Don't trigger if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    for (const binding of this.bindings) {
      if (
        e.key === binding.key &&
        !!e.ctrlKey === !!binding.ctrl &&
        !!e.shiftKey === !!binding.shift &&
        !!e.altKey === !!binding.alt
      ) {
        e.preventDefault();
        binding.action();
        return;
      }
    }
  }

  getBindings(): Array<{ key: string; description: string; modifiers?: string }> {
    return this.bindings.map(b => ({
      key: b.key,
      description: b.description,
      modifiers: [
        b.ctrl ? 'Ctrl' : '',
        b.shift ? 'Shift' : '',
        b.alt ? 'Alt' : '',
      ].filter(Boolean).join('+') || undefined,
    }));
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
  }
}
