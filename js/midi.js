export class MidiInput {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.access = null;
    this.selectedId = null;
    this.devices = [];
  }

  get supported() {
    return typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function';
  }

  async init() {
    if (!this.supported) {
      this.callbacks.onUnsupported?.();
      return false;
    }
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
      this.access.onstatechange = () => this.refresh();
      this.refresh();
      return true;
    } catch (error) {
      this.callbacks.onError?.(error);
      return false;
    }
  }

  refresh() {
    if (!this.access) return;
    this.devices = [...this.access.inputs.values()].map((input) => ({
      id: input.id,
      name: input.name || 'Dispositivo MIDI',
      state: input.state
    }));
    if (!this.devices.some((device) => device.id === this.selectedId)) {
      this.selectedId = this.devices[0]?.id ?? null;
    }
    for (const input of this.access.inputs.values()) {
      input.onmidimessage = input.id === this.selectedId
        ? (event) => this.handleMessage(event)
        : null;
    }
    this.callbacks.onDevicesChange?.(this.devices, this.selectedId);
  }

  select(id) {
    this.selectedId = id;
    this.refresh();
  }

  handleMessage(event) {
    const [status, data1, data2] = event.data;
    if (status === undefined) return;
    const type = status & 0xf0;
    const channel = status & 0x0f;
    if (type === 0x90 && data2 > 0) {
      this.callbacks.onNoteOn?.(data1, { source: 'midi', channel, velocity: data2 / 127 });
    } else if (type === 0x80 || (type === 0x90 && data2 === 0)) {
      this.callbacks.onNoteOff?.(data1, { source: 'midi', channel });
    } else if (type === 0xb0 && data1 === 64) {
      this.callbacks.onSustain?.(data2 >= 64);
    } else if (type === 0xe0) {
      const value = ((data2 << 7) | data1) - 8192;
      this.callbacks.onPitchBend?.(value / 8192);
    }
  }
}
