function concatenate(chunks) {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const output = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

function writeString(view, offset, text) {
  for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
}

function encodeWav(left, right, sampleRate) {
  const length = Math.min(left.length, right.length);
  const buffer = new ArrayBuffer(44 + length * 4);
  const view = new DataView(buffer);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length * 4, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, length * 4, true);
  let offset = 44;
  for (let index = 0; index < length; index += 1) {
    for (const sample of [left[index], right[index]]) {
      const clamped = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

export class AudioRecorder {
  constructor(engine) {
    this.engine = engine;
    this.recording = false;
    this.mode = null;
    this.chunks = [[], []];
    this.processor = null;
    this.silent = null;
    this.destination = null;
    this.mediaRecorder = null;
  }

  async start() {
    await this.engine.ensure();
    const ctx = this.engine.ctx;
    if (typeof ctx.createScriptProcessor === 'function') {
      this.mode = 'pcm';
      this.chunks = [[], []];
      this.processor = ctx.createScriptProcessor(4096, 2, 2);
      this.processor.onaudioprocess = (event) => {
        const input = event.inputBuffer;
        const left = input.getChannelData(0);
        const right = input.numberOfChannels > 1 ? input.getChannelData(1) : left;
        this.chunks[0].push(new Float32Array(left));
        this.chunks[1].push(new Float32Array(right));
      };
      this.silent = ctx.createGain();
      this.silent.gain.value = 0;
      this.engine.outputGain.connect(this.processor);
      this.processor.connect(this.silent);
      this.silent.connect(ctx.destination);
    } else {
      this.mode = 'media';
      this.chunks = [];
      this.destination = ctx.createMediaStreamDestination();
      this.engine.outputGain.connect(this.destination);
      this.mediaRecorder = new MediaRecorder(this.destination.stream);
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.chunks.push(event.data);
      };
      this.mediaRecorder.start();
    }
    this.recording = true;
  }

  async stop() {
    if (!this.recording) return null;
    this.recording = false;
    if (this.mode === 'pcm') {
      this.engine.outputGain.disconnect(this.processor);
      this.processor.disconnect();
      this.silent.disconnect();
      this.processor.onaudioprocess = null;
      const blob = encodeWav(concatenate(this.chunks[0]), concatenate(this.chunks[1]), this.engine.ctx.sampleRate);
      this.chunks = [[], []];
      return { blob, extension: 'wav' };
    }
    return new Promise((resolve) => {
      this.mediaRecorder.onstop = () => {
        this.engine.outputGain.disconnect(this.destination);
        const type = this.mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(this.chunks, { type });
        this.chunks = [];
        resolve({ blob, extension: type.includes('ogg') ? 'ogg' : 'webm' });
      };
      this.mediaRecorder.stop();
    });
  }
}
