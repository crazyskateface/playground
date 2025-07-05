import { MP4Parser } from './MP4Parser.js';

class BestPlayer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // core rendering
        this.canvas = null;
        this.ctx = null;

        // webcodecs api components
        this.videoDecoder = null;
        this.audioDecoder = null;
        this.demuxer = null;

        // mp4 parsing
        this.mp4Parser = new MP4Parser();
        this.videoTrack = null;
        this.audioTrack = null;
        this.samples = [];

        // playback state
        this.isPlaying = false;
        this.pausedAt = undefined;
        this.currentTime = 0;
        this.duration = 0;
        this.frameQueue = [];
        this.audioQueue = [];
        this.currentSampleIndex = 0;

        // timing
        this.startTime = 0;
        this.lastFrameTime = 0;
        this.animationId = null;
    }

    static get observedAttributes() {
        return ['src'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'src' && newValue && newValue !== oldValue) {
            // Only load if the component is already connected and initialized
            if (this.isConnected && this.canvas) {
                this.loadVideoFromUrl(newValue);
            } else {
                // Store the URL to load after initialization
                this._pendingSrc = newValue;
            }
        }
    }

    get src() {
        return this.getAttribute('src');
    }

    set src(value) {
        if (value) {
            this.setAttribute('src', value);
        } else {
            this.removeAttribute('src');
        }
    }

    connectedCallback() {
        this.render();
        this.initialize();

        // Load pending src if it was set before initialization
        if (this._pendingSrc) {
            this.loadVideoFromUrl(this._pendingSrc);
            this._pendingSrc = null;
        }
    }

    disconnectedCallback() {
        this.cleanup();
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host {
                display: block;
                width: 100%;
                max-width: 800px;
                position: relative;
            }

            canvas {
                width: 100%;
                height: auto;
                background: #000;
                display: block;
            }

            .debug-info {
                position: absolute;
                top: 10px;
                left: 10px;
                background: rgba(0,0,0,0.7);
                color: white;
                padding: 5px;
                font-family: monospace;
                font-size: 12px;
            }

            .controls {
                margin-top: 10px;
                display: flex;
                gap: 10px;
                align-items: center;
            }

            .input-row {
                display: flex;
                gap: 10px;
                align-items: center;
            }

            .playback-row {
                display: flex;
                gap: 10px;
                align-items: center;
            }

            .progress-container {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-top: 5px;
            }

            .progress-bar {
                flex: 1;
                height: 8px;
                background: #333;
                border-radius: 4px;
                position: relative;
                cursor: pointer;
                overflow: hidden;
            }

            .progress-bar::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                width: var(--progress, 0%);
                background: linear-gradient(90deg, #007acc, #00a8ff);
                border-radius: 4px;
                transition: width 0.1s ease;
            }

            .progress-bar:hover {
                height: 12px;
            }

            .time-display {
                font-family: monospace;
                font-size: 14px;
                color: #333;
                min-width: 100px;
                text-align: center;
            }

            button {
                padding: 8px 16px;
                background: #007acc;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }

            button:hover {
                background: #005a99;
            }

            button:disabled {
                background: #666;
                /*cursor: not-allowed;*/
            }

            input[type="file"], input[type="url"] {
                flex: 1;
                padding: 8px;
                border: 1px solid #ccc;
                border-radius: 4px;
            }

            .preset-urls {
                margin-top: 5px;
                font-size: 12px;
            }

            .preset-urls button {
                padding: 4px 8px;
                font-size: 11px;
                margin-right: 5px;
            }
        </style>

        <canvas width="800" height="450"></canvas>

        <div class="debug-info" id="debugInfo">
            Ready to load video...
            WebCodecs supported: ${!!window.VideoDecoder}
        </div>

        <div class="controls">
            <div class="input-row">
                <input type="url" id="urlInput" placeholder="Enter video URL (MP4)" value="">
                <button id="loadUrlBtn">Load URL</button>
            </div>

            <div class="preset-urls">
                <strong>Test URLs:</strong>
                <button id="preset1">Big Buck Bunny (MP4)</button>
                <button id="preset2">Sample Video</button>
            </div>

            <div class="input-row">
                <input type="file" id="fileInput" accept="video/*">
                <button id="loadFileBtn">Load file</button>
            </div>

            <div class="playback-row">
                <button id="playBtn" disabled>▶</button>
                <button id="pauseBtn" disabled>⏸</button>
                <button id="stopBtn" disabled>⏹</button>
            </div>

            <div class="progress-container">
                <div class="progress-bar" id="progressBar"></div>
                <div class="time-display" id="timeDisplay">0:00 / 0:00</div>
            </div>
            
        </div>
        `;
    }

    initialize() {
        this.canvas = this.shadowRoot.querySelector('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.debugInfo = this.shadowRoot.querySelector('#debugInfo');

        this.setupEventListeners();
        this.initializeWebCodecs();

        // check for src attribute on initialization
        const src = this.getAttribute('src');
        if (src) {
            this.loadVideoFromUrl(src);
        }
    }

    setupEventListeners() {
        const urlInput = this.shadowRoot.querySelector('#urlInput');
        const loadUrlBtn = this.shadowRoot.querySelector('#loadUrlBtn');
        const fileInput = this.shadowRoot.querySelector('#fileInput');
        const loadFileBtn = this.shadowRoot.querySelector('#loadFileBtn');
        const playBtn = this.shadowRoot.querySelector('#playBtn');
        const pauseBtn = this.shadowRoot.querySelector('#pauseBtn');
        const stopBtn = this.shadowRoot.querySelector('#stopBtn');
        const progressBar = this.shadowRoot.querySelector('#progressBar');
        const preset1 = this.shadowRoot.querySelector('#preset1');
        const preset2 = this.shadowRoot.querySelector('#preset2');

        loadUrlBtn.addEventListener('click', () => {
            const url = urlInput.value.trim();
            if (url) {
                this.src = url;
            }
        });

        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loadUrlBtn.click();
            }
        });

        loadFileBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.loadVideo(e.target.files[0]);
            }
        });

        // Preset URLs
        preset1.addEventListener('click', () => {
            urlInput.value = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
            urlInput.value = url;
            this.src = url;
        });
        
        preset2.addEventListener('click', () => {
            urlInput.value = 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4';
            urlInput.value = url;
            this.src = url; 
        });

        playBtn.addEventListener('click', () => {
            if (this.isPlaying) {
                this.pause();
            } else {
                this.play();
            }
        });
        pauseBtn.addEventListener('click', () => this.pause());
        stopBtn.addEventListener('click', () => this.stop());

        progressBar.addEventListener('click', (e) => {
            if (this.duration) {
                const rect = progressBar.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const progress = clickX / rect.width;
                const seekTime = progress * this.duration;

                this.seek(seekTime);
            }
        });
    }

    initializeWebCodecs() {
        // check if webcodecs is supported
        if (!window.VideoDecoder) {
            this.updateDebugInfo('WebCodecs not supported in this browser wah wah.');
            return;
        }

        // initialize video decoder
        this.videoDecoder = new VideoDecoder({
            output: (frame) => this.handleVideoFrame(frame),
            error: (error) => this.handleDecoderError('Video', error)
        });

        // initialize audio decoder (optional)
        // if (window.AudioDecoder) {
        //     this.audioDecoder = new AudioDecoder({
        //         output: (audioData) => this.handleAudioData(audioData),
        //         error: (error) => this.handleDecoderError('Audio', error)
        //     });
        // }

        this.updateDebugInfo('WebCodecs initialized');
    }

    async loadVideoFromUrl(url) {
        try {
            this.updateDebugInfo(`🔄 Fetching: ${url}`);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            await this.processVideoData(arrayBuffer, url);
            
        } catch (error) {
            this.updateDebugInfo(`❌ Error loading URL: ${error.message}`);
            console.error('URL load error:', error);
        }
    }

    async loadVideoFromFile(file) {
        try {
            this.updateDebugInfo(`🔄 Loading file: ${file.name}`);

            const arrayBuffer = await file.arrayBuffer();
            await this.processVideoData(arrayBuffer, file.name);

            // TODO: Parse video file (MP4/WebM) and extract codec info
            // For now, we'll assume H.264 video
            // await this.configureDecoders(arrayBuffer);

            // TODO: Extract encoded chunks and queue them
            // await this.demuxVideo(arrayBuffer);

            // this.enableControls(true);
            // this.updateDebugInfo('Video loaded and ready');
        } catch (error) {
            this.updateDebugInfo(`Error loading video: ${error.message}`);
            console.error(`Load error: `, error);
        }
    }

    async processVideoData(arrayBuffer, source) {
        try {
            this.updateDebugInfo(`🔄 Parsing MP4: ${source}\nSize: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`)

            // parse mp4 structure
            const mp4Info = await this.mp4Parser.parse(arrayBuffer);

            this.updateDebugInfo(` MP4 parsed successfully
Duration: ${mp4Info.duration}s
Video: ${mp4Info.videoTrack ? mp4Info.videoTrack.codec : 'none'}
Audio: ${mp4Info.audioTrack ? mp4Info.audioTrack.codec : 'none'}
Samples: ${mp4Info.videoSamples?.length || 0}`);

            // store track info
            this.videoTrack = mp4Info.videoTrack;
            this.audioTrack = mp4Info.audioTrack;
            this.samples = mp4Info.videoSamples || [];
            this.duration = mp4Info.duration;

            // configure decoder
            if (this.videoTrack) {
                await this.configureVideoDecoder();
            }

            this.enableControls(true);
        } catch (error) {
            this.updateDebugInfo(`❌ MP4 parsing failed: ${error.message}`);
            console.error(`MP4 parsing error: `, error);
        }
    }

    async configureVideoDecoder() {
        if (!this.videoTrack) return;

        
        //build proper codec string
        let codecString = this.videoTrack.codec;

        // handle generic codec names
        if (codecString === 'avc1' || !codecString.includes('.')) {
            // default to H.264 Baseline Profile if no specific info
            codecString = 'avc1.42E01E';
            console.warn(`Using fallback codec string:`, codecString);
        }

        const videoConfig = {
            codec: codecString,  // H.264 Baseline Profile
            codedWidth: this.videoTrack.width,
            codedHeight: this.videoTrack.height,
        };

        // add codec specific data if available
        if (this.videoTrack.codecPrivate) {
            videoConfig.description = this.videoTrack.codecPrivate;
        }

        try {
            // test if the codec is supported first
            const isSupported = await VideoDecoder.isConfigSupported(videoConfig);
            if (!isSupported.supported) {
                throw new Error(`Codec not supported: ${codecString}`);
            }

            this.videoDecoder.configure(videoConfig);
            this.updateDebugInfo(`✅ Video decoder configured
Codec: ${videoConfig.codec}
Resolution: ${videoConfig.codedWidth}x${videoConfig.codedHeight}
Supported: ${isSupported.supported}`);

            // Decode first few frames
            await this.preloadFrames();
        } catch (error) {
            // try common fallback codecs
            const fallbacks = [
                'avc1.42E01E', // H.264 Baseline
                'avc1.4D401E', // H.264 Main
                'avc1.64001E'  // H.264 High
            ];

            for (const fallback of fallbacks) {
                try {
                    const fallbackConfig = { ...videoConfig, codec: fallback };
                    const isSupported = await VideoDecoder.isConfigSupported(fallbackConfig);

                    if (isSupported.supported) {
                        this.videoDecoder.configure(fallbackConfig);
                        this.updateDebugInfo(`Video decoder configured (fallback)
Codec: ${fallbackConfig.codec}
Resolution: ${fallbackConfig.codedWidth}x${fallbackConfig.codedHeight}`);

                        await this.preloadFrames();
                        return;
                    }
                } catch (fallbackError) {
                    console.warn('Fallback failed', fallback, fallbackError);
                }
            }
            this.updateDebugInfo(`❌ Decoder config failed: ${error.message}`);
            throw error;
        }
    }

    async preloadFrames() {
        const framesToPreload = Math.min(10, this.samples.length);

        for (let i = 0; i < framesToPreload; i++) {
            const sample = this.samples[i];
            if (sample) {
                this.decodeSample(sample, i);
            }
        }

        this.updateDebugInfo(`🔄 Preloading ${framesToPreload} frames...`)
    }

    decodeSample(sample, index) {
        const chunk = new EncodedVideoChunk({
            type: sample.isKeyFrame ? 'key' : 'delta',
            timestamp: sample.timestamp,
            duration: sample.duration,
            data: sample.data
        });

        try {
            this.videoDecoder.decode(chunk);
        } catch (error) {
            console.error(`Error decoding sample ${index}:`, error);
        }
    }

    handleVideoFrame(videoFrame) {
        console.log(`🎞️ Frame received: timestamp=${videoFrame.timestamp}, seconds=${(videoFrame.timestamp/1000000).toFixed(3)}`);

        // Add frame to queue with timestamp
        this.frameQueue.push({
            frame: videoFrame,
            timestamp: videoFrame.timestamp
        });

        // sort the queue by timestamp to ensure proper order
        this.frameQueue.sort((a, b) => a.timestamp - b.timestamp);

        // TODO: take out this debug as it will be printed each frame which is kind of a lot.
        this.updateDebugInfo(`📺 Frames decoded: ${this.frameQueue.length}
Resolution: ${videoFrame.codedWidth}x${videoFrame.codedHeight}
Timestamp: ${(videoFrame.timestamp / 1000000).toFixed(3)}s
Queue range: ${(this.frameQueue[0]?.timestamp / 1000000).toFixed(3)}s - ${(this.frameQueue[this.frameQueue.length-1]?.timestamp / 1000000).toFixed(3)}s`);

        // if not playing, just draw the first frame
        if (!this.isPlaying && this.frameQueue.length === 1) {
            this.drawFrame(videoFrame);
        }
    }

    handleDecoderError(type, error) {
        console.error(`${type} decoder error:`, error);
        this.updateDebugInfo(`${type} decoder error: ${error.message}`);
    }

    play() {
        if (!this.isPlaying) {
            this.isPlaying = true;

            // resume from where we paused, or start from begin
            if (this.pausedAt !== undefined) {
                this.startTime = performance.now() - this.pausedAt;
                console.log(`resuming from: ${(this.pausedAt / 1000).toFixed(3)}}s`)
            } else {
                this.startTime = performance.now();
                this.pausedAt = 0;
            }
            
            this.animate();

            this.continueDecoding();

            this.updateDebugInfo('Playing');
        }
        
    }

    pause() {
        if (this.isPlaying) {
            this.isPlaying = false;
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }

            // store the current playback position
            this.pausedAt = performance.now() - this.startTime;

            this.updateDebugInfo('Paused');
            console.log(`Paused at: ${(this.pausedAt / 1000).toFixed(3)}s`);
        }
        
    }

    stop() {
        this.pause();
        this.currentTime = 0;
        this.lastFrameTime = 0;
        this.currentSampleIndex = 0;

        // Draw first frame
        if (this.frameQueue.length > 0) {
            this.drawFrame(this.frameQueue[0].frame);
        }

        this.updateDebugInfo('Stopped');
    }

    seek(timeInSeconds) {
        const wasPlaying = this.isPlaying;

        // pause playback
        if (this.isPlaying) {
            this.pause();
        }

        // clear current frame queue
        this.frameQueue.forEach(frameData => frameData.frame.close());
        this.frameQueue = [];

        // reset decoder to avoid stale frames
        if (this.videoDecoder && this.videoDecoder.state === 'configured') {
            this.videoDecoder.reset();
            this.configureVideoDecoder();
        }

        // set new playback position
        this.pausedAt = timeInSeconds * 1000; // convert to milliseconds
        this.currentSampleIndex = Math.floor((timeInSeconds * this.videoTrack.timescale) /
                                            this.samples[0]?.duration || 1000);

        // ensure we don't go past the end
        this.currentSampleIndex = Math.min(this.currentSampleIndex, this.samples.length - 1);
        
        console.log(`Seeking to: ${timeInSeconds.toFixed(3)}s (sample ${this.currentSampleIndex})`);

        // preload frames from new position
        this.preloadFrames();

        //resume if was playing
        if (wasPlaying) {
            this.play();
        }
    }

    continueDecoding() {
        // Decode more samples as needed
        const targetBuffer = 30; // keep 30 frames buffered

        while (this.frameQueue.length < targetBuffer &&
                this.currentSampleIndex < this.samples.length) {
            const sample = this.samples[this.currentSampleIndex];
            this.decodeSample(sample, this.currentSampleIndex);
            this.currentSampleIndex++;
        }
    }

    animate() {
        if (!this.isPlaying) return;

        const elapsed = performance.now() - this.startTime;
        const targetTimestamp = elapsed * 1000; // Convert to microseconds

        console.log(`🎬 Animation tick: elapsed=${elapsed.toFixed(3)}s, target=${targetTimestamp}, queue=${this.frameQueue.length}`);

        // process all frames that should be displayed by now
        let framesDisplayed = 0;
        while (this.frameQueue.length > 0 && 
                this.frameQueue[0].timestamp <= targetTimestamp) {
            const frameData = this.frameQueue.shift();
            this.drawFrame(frameData.frame);
            this.lastFrameTime = frameData.timestamp;
            framesDisplayed++;

            console.log(`📺 Displaying frame: timestamp=${frameData.timestamp}, seconds=${(frameData.timestamp/1000000).toFixed(3)}`);

            //clean up the frame
            frameData.frame.close();

            // don't display too many frames in one animation loop
            if (framesDisplayed >= 3) break;
        }
        
        // update time display
        this.updateTimeDisplay(elapsed / 1000);

        // continue decoding if buffer is low
        if (this.frameQueue.length < 10) {
            this.continueDecoding();
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    findFrameAtTime(time) {
        // TODO: implement proper frame timing
        // For now just play frames in sequence
        const frameIndex = Math.floor(time / 33); // ~30fps
        return this.frameQueue[frameIndex] || null;
    }

    drawFrame(videoFrame) {
        if (!videoFrame || !this.ctx) return;
        
        // resize cnavas to match video
        if (this.canvas.width !== videoFrame.codedWidth ||
            this.canvas.height !== videoFrame.codedHeight) {
                this.canvas.width = videoFrame.codedWidth;
                this.canvas.height = videoFrame.codedHeight;
        }

        // Draw the video frame
        this.ctx.drawImage(videoFrame, 0, 0);
        
    }

    updateTimeDisplay(currentTime) {
        const timeDisplay = this.shadowRoot.querySelector('#timeDisplay');
        const progressBar = this.shadowRoot.querySelector('#progressBar');

        if (this.duration) {
            const progress = Math.min(currentTime / this.duration, 1);
            progressBar.style.setProperty('--progress', `${progress * 100}%`);

            const minutes = Math.floor(currentTime / 60);
            const seconds = Math.floor(currentTime % 60);
            const totalMinutes = Math.floor(this.duration / 60);
            const totalSeconds = Math.floor(this.duration % 60);
            timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')} / ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;
        }
        
        
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    enableControls(enabled) {
        const playBtn = this.shadowRoot.querySelector('#playBtn');
        const pauseBtn = this.shadowRoot.querySelector('#pauseBtn');
        const stopBtn = this.shadowRoot.querySelector('#stopBtn');

        playBtn.disabled = !enabled;
        pauseBtn.disabled = !enabled;
        stopBtn.disabled = !enabled;
    }

    updateDebugInfo(message) {
        if (this.debugInfo) {
            this.debugInfo.textContent = message;
        }
        console.log('BestPlayer:', message);
    }

    cleanup() {
        // clean up resources
        if (this.videoDecoder && this.videoDecoder.state !== 'closed') {
            this.videoDecoder.close();
        }

        // clean up video frames
        this.frameQueue.forEach(item => item.frame.close());
        this.frameQueue = [];

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}

// Register the custom element
customElements.define('best-player', BestPlayer);