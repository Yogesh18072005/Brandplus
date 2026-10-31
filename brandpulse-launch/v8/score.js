/* Original 120 BPM score, synthesized entirely with OfflineAudioContext. */
window.composeBrandPulseScore = async function () {
  const rate = 48000, seconds = 15;
  const ctx = new OfflineAudioContext(2, rate * seconds, rate);
  const master = ctx.createGain(); master.gain.value = .72;
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -15; compressor.knee.value = 12;
  compressor.ratio.value = 3; compressor.attack.value = .004; compressor.release.value = .12;
  master.connect(compressor); compressor.connect(ctx.destination);
  let seed = 41501;
  const noise = ctx.createBuffer(1, rate, rate);
  const nd = noise.getChannelData(0);
  for (let n = 0; n < nd.length; n++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; nd[n] = seed / 2147483648 - 1; }
  function tone(time, freq, length, volume, type = 'sine', endFreq = freq, pan = 0) {
    const osc = ctx.createOscillator(), amp = ctx.createGain(), stereo = ctx.createStereoPanner();
    osc.type = type; osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), time + length);
    amp.gain.setValueAtTime(.0001, time); amp.gain.exponentialRampToValueAtTime(volume, time + .003);
    amp.gain.exponentialRampToValueAtTime(.0001, Math.min(seconds, time + length));
    stereo.pan.value = pan; osc.connect(amp); amp.connect(stereo); stereo.connect(master);
    osc.start(time); osc.stop(Math.min(seconds, time + length + .01));
  }
  function hiss(time, length, volume, hp, pan = 0) {
    const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), amp = ctx.createGain(), stereo = ctx.createStereoPanner();
    src.buffer = noise; filter.type = 'highpass'; filter.frequency.value = hp;
    amp.gain.setValueAtTime(volume, time); amp.gain.exponentialRampToValueAtTime(.0001, Math.min(seconds, time + length));
    stereo.pan.value = pan; src.connect(filter); filter.connect(amp); amp.connect(stereo); stereo.connect(master);
    src.start(time, (time * .317) % .6); src.stop(Math.min(seconds, time + length));
  }
  const bass = [55, 55, 82.4069, 65.4064, 55, 73.4162, 65.4064, 82.4069];
  for (let beat = 0; beat < 30; beat++) {
    const t = beat * .5;
    tone(t, 150, .24, beat === 24 ? .92 : .72, 'sine', 43);
    tone(t, 880, .018, .055, 'triangle', 130);
    tone(t + .045, bass[Math.floor(beat / 2) % bass.length], .23, .15, 'triangle');
    if (beat % 2 === 1) { hiss(t, .12, .11, 1700, -.12); tone(t, 185, .065, .075, 'triangle', 105); }
    hiss(t + .25, .045, .045, 6800, beat % 2 ? .35 : -.35);
    if (beat > 7 && beat < 24) hiss(t + .375, .022, .022, 9000, .45);
    if (beat % 2 === 0) {
      const n = [440, 523.251, 659.255, 783.991][Math.floor(beat / 2) % 4];
      tone(t + .125, n, .12, .032, 'sine', n, -.25);
      tone(t + .25, n * 1.5, .09, .019, 'sine', n * 1.5, .25);
    }
  }
  for (const t of [0, 2, 4, 6, 8, 10, 12, 13]) {
    tone(t, t === 12 ? 110 : 220, .24, t === 12 ? .24 : .12, 'triangle', t === 12 ? 55 : 110);
    hiss(t, .13, t === 12 ? .14 : .075, 950);
    tone(t, 1320, .05, .045, 'sine', 660, .1);
  }
  // Real interface actions: restrained clicks and the quote-selection drag.
  for (const t of [.5, 3.5, 5, 7, 9, 11, 14.5]) {
    tone(t, 1600, .025, .065, 'triangle', 600);
    hiss(t, .022, .038, 3300);
  }
  tone(13, 220, 1.3, .07); tone(13, 329.628, 1.3, .045); tone(13, 440, 1.3, .025);
  const rendered = await ctx.startRendering();
  // Deterministic peak normalization, then a short end release to avoid a cut click.
  let peak = 0;
  for (let ch = 0; ch < 2; ch++) for (const v of rendered.getChannelData(ch)) peak = Math.max(peak, Math.abs(v));
  const scale = .88 / Math.max(.001, peak);
  const bytes = new ArrayBuffer(44 + rate * seconds * 4), view = new DataView(bytes);
  const str = (offset, s) => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); str(8, 'WAVE'); str(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 4, true); view.setUint16(32, 4, true); view.setUint16(34, 16, true);
  str(36, 'data'); view.setUint32(40, rate * seconds * 4, true);
  for (let i = 0; i < rate * seconds; i++) {
    const release = Math.min(1, (rate * seconds - i) / (rate * .075));
    for (let ch = 0; ch < 2; ch++) view.setInt16(44 + (i * 2 + ch) * 2, Math.round(Math.max(-1, Math.min(1, rendered.getChannelData(ch)[i] * scale * release)) * 32767), true);
  }
  const data = new Uint8Array(bytes); let binary = '';
  for (let i = 0; i < data.length; i += 32768) binary += String.fromCharCode(...data.subarray(i, i + 32768));
  return btoa(binary);
};
