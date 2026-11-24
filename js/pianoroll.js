export class PianoRoll {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.getEvents = options.getEvents || (() => []);
    this.getProgress = options.getProgress || (() => null);
    this.resize();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.draw();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(8, 12, 28, 0.9)';
    ctx.fillRect(0, 0, w, h);

    const events = this.getEvents();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i += 1) {
      const y = (h / 6) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (!events.length) {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Grave ou importe uma sequência', w / 2, h / 2 + 4);
      requestAnimationFrame(() => this.draw());
      return;
    }

    const minNote = Math.min(...events.map((event) => event.note)) - 1;
    const maxNote = Math.max(...events.map((event) => event.note)) + 1;
    const duration = Math.max(1, ...events.map((event) => event.time + (event.duration || 0.2)));
    const noteSpan = Math.max(1, maxNote - minNote);
    const pad = 8;
    const usableW = w - pad * 2;
    const usableH = h - pad * 2;
    const noteHeight = Math.max(3, usableH / noteSpan);
    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, '#38bdf8');
    gradient.addColorStop(0.5, '#a78bfa');
    gradient.addColorStop(1, '#f472b6');
    ctx.fillStyle = gradient;

    for (const event of events) {
      const x = pad + (event.time / duration) * usableW;
      const noteWidth = Math.max(3, ((event.duration || 0.2) / duration) * usableW);
      const y = h - pad - ((event.note - minNote) / noteSpan) * usableH - noteHeight;
      ctx.globalAlpha = 0.55 + (event.velocity || 0.8) * 0.45;
      ctx.fillRect(x, y, noteWidth, noteHeight);
    }
    ctx.globalAlpha = 1;

    const progress = this.getProgress();
    if (progress !== null && progress !== undefined) {
      const x = pad + Math.min(1, Math.max(0, progress / duration)) * usableW;
      ctx.strokeStyle = 'rgba(125, 249, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    requestAnimationFrame(() => this.draw());
  }
}
