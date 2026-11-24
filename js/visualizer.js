export class Visualizer {
  constructor(canvas, analyserGetter) {
    this.canvas = canvas;
    this.getAnalyser = analyserGetter;
    this.ctx2d = canvas.getContext('2d');
    this.mode = 'both';
    this.running = false;
    this.timeData = null;
    this.freqData = null;
    this.resize();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setMode(mode) {
    this.mode = mode;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.draw();
  }

  stop() {
    this.running = false;
  }

  draw() {
    if (!this.running) return;
    const ctx = this.ctx2d;
    const w = this.width;
    const h = this.height;
    ctx.clearRect(0, 0, w, h);

    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, 'rgba(12, 16, 38, 0.95)');
    bg.addColorStop(1, 'rgba(24, 12, 44, 0.95)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.09)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += w / 12) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += h / 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const analyser = this.getAnalyser();
    if (analyser) {
      if (!this.timeData || this.timeData.length !== analyser.fftSize) {
        this.timeData = new Uint8Array(analyser.fftSize);
        this.freqData = new Uint8Array(analyser.frequencyBinCount);
      }
      analyser.getByteTimeDomainData(this.timeData);
      analyser.getByteFrequencyData(this.freqData);
      if (this.mode !== 'wave') this.drawSpectrum(ctx, w, h);
      if (this.mode !== 'spectrum') this.drawWave(ctx, w, h);
    } else {
      this.drawIdle(ctx, w, h);
    }
    requestAnimationFrame(() => this.draw());
  }

  drawSpectrum(ctx, w, h) {
    const bars = 64;
    const gap = 2;
    const barWidth = w / bars - gap;
    const heightFactor = this.mode === 'spectrum' ? 0.9 : 0.5;
    const gradient = ctx.createLinearGradient(0, h, 0, 0);
    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.85)');
    gradient.addColorStop(0.55, 'rgba(139, 92, 246, 0.85)');
    gradient.addColorStop(1, 'rgba(244, 114, 182, 0.85)');
    ctx.fillStyle = gradient;
    for (let i = 0; i < bars; i += 1) {
      const value = this.freqData[i] / 255;
      const barHeight = Math.max(2, value * h * heightFactor);
      ctx.fillRect(i * (barWidth + gap) + gap / 2, h - barHeight, barWidth, barHeight);
    }
  }

  drawWave(ctx, w, h) {
    const data = this.timeData;
    const amplitude = this.mode === 'wave' ? h * 0.38 : h * 0.22;
    const middle = h / 2;
    ctx.beginPath();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = 'rgba(125, 249, 255, 0.95)';
    ctx.shadowBlur = 14;
    ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
    for (let i = 0; i < data.length; i += 1) {
      const x = (i / (data.length - 1)) * w;
      const y = middle + ((data[i] - 128) / 128) * amplitude;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  drawIdle(ctx, w, h) {
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(125, 249, 255, 0.35)';
    for (let x = 0; x <= w; x += 2) {
      const y = h / 2 + Math.sin(x / 42) * 5;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
