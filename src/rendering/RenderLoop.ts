export class RenderLoop {
  private running = false;
  private lastTime = 0;
  private callbacks: Array<(deltaTime: number) => void> = [];
  private animFrameId = 0;

  addCallback(callback: (deltaTime: number) => void): void {
    this.callbacks.push(callback);
  }

  removeCallback(callback: (deltaTime: number) => void): void {
    const idx = this.callbacks.indexOf(callback);
    if (idx >= 0) this.callbacks.splice(idx, 1);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }

  private loop = (): void => {
    if (!this.running) return;
    this.animFrameId = requestAnimationFrame(this.loop);

    const now = performance.now();
    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1); // Cap at 100ms
    this.lastTime = now;

    for (const cb of this.callbacks) {
      cb(deltaTime);
    }
  };
}
