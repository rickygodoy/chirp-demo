// This script runs in a separate thread thanks to the AudioWorklet.

/**
 * Downsamples a Float32Array of audio data.
 * @param {Float32Array} buffer The audio data to downsample.
 * @param {number} inputSampleRate The sample rate of the incoming audio.
 * @param {number} outputSampleRate The desired sample rate.
 * @returns {Float32Array} The downsampled audio data.
 */
const downsampleBuffer = (buffer, inputSampleRate, outputSampleRate) => {
    if (outputSampleRate === inputSampleRate) {
        return buffer;
    }
    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
        const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
        let accum = 0;
        let count = 0;
        for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
            accum += buffer[i];
            count++;
        }
        result[offsetResult] = accum / count;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
    }
    return result;
};

class AudioProcessor extends AudioWorkletProcessor {
    process(inputs, outputs, parameters) {
        // The input is an array of channels, each with a Float32Array of audio samples.
        // We only care about the first channel of the first input.
        const audioData = inputs[0][0];

        // If there's no audio data, we don't need to do anything.
        if (!audioData) {
            return true; // Keep the processor alive.
        }

        // `sampleRate` is a global variable available in the AudioWorkletGlobalScope.
        const downsampled = downsampleBuffer(audioData, sampleRate, 16000);

        // Convert the Float32Array to a 16-bit PCM Int16Array, which is what the server expects.
        const pcmData = new Int16Array(downsampled.length);
        for (let i = 0; i < downsampled.length; i++) {
            // Clamp the value to the -1 to 1 range before converting.
            const s = Math.max(-1, Math.min(1, downsampled[i]));
            // Convert to 16-bit integer.
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Post the raw buffer back to the main thread.
        this.port.postMessage(pcmData.buffer);

        // Return true to indicate the processor should not be destroyed.
        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);
