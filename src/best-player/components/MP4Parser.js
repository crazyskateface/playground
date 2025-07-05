export class MP4Parser {
    constructor() {
        this.buffer = null;
        this.offset = 0;
        this.boxes = new Map();
        this.tracks = [];
        this.mdatOffset = 0;
        this.mdatSize = 0;
    }

    async parse(arrayBuffer) {
        this.buffer = new DataView(arrayBuffer);
        this.offset = 0;

        const result = {
            duration: 0,
            timescale: 1000,
            videoTrack: null,
            audioTrack: null,
            videoSamples: []
        };

        console.log('🔍 Starting MP4 parsing...');

        // parse MP4 boxes
        while (this.offset < this.buffer.byteLength - 8) {
            const box = this.readBox();
            console.log(`📦 Found box: ${box.type} (${box.size} bytes)`);

            switch (box.type) {
                case 'ftyp':
                    this.parseFileTypeBox(box, result);
                    break;
                case 'moov':
                    // movie box - contains metadata
                    this.parseMovieBox(box, result);
                    break;
                case 'mdat':
                    // media data - contains actual video/audio data
                    this.mdatOffset = box.dataStart;
                    this.mdatSize = box.size -8;
                    console.log(`💾 Media data at offset ${this.mdatOffset}, size ${this.mdatSize}`);
                    break;
            }

            this.offset = box.end;
        }

        // extract video samples if we have track info
        if (result.videoTrack && this.mdatOffset > 0){
            // use track timescale if available, fallback to movie timescale
            const trackTimescale = result.videoTrack.timescale || result.timescale;
            result.videoSamples = this.extractVideoSamples(result.videoTrack, trackTimescale);
        }

        console.log('✅ MP4 parsing complete', result);
        return result;
    }

    readBox() {
        if (this.offset + 8 > this.buffer.byteLength) {
            throw new Error('Incomplete box header');
        }

        let size = this.buffer.getUint32(this.offset);
        const type = this.getStringAt(this.offset + 4, 4);
        let headerSize = 8;

        // handle 64-bit size
        if (size === 1) {
            size = this.buffer.getBigUint64(this.offset + 8);
            headerSize = 16;
        }

        return {
            type: type,
            size: Number(size),
            dataStart: this.offset + headerSize,
            end: this.offset + Number(size),
            headerSize: headerSize
        };
    }

    parseFileTypeBox(box, result) {
        const oldOffset = this.offset;
        this.offset = box.dataStart;

        const majorBrand = this.getStringAt(this.offset, 4);
        const minorVersion = this.buffer.getUint32(this.offset + 4);

        console.log(`📄 File type: ${majorBrand}, version: ${minorVersion}`);

        this.offset = oldOffset;
    }

    parseMovieBox(box, result) {
        
        const oldOffset = this.offset;
        this.offset = box.dataStart;
        const endOffset = box.end;

        console.log(`🎬 Parsing movie box...`);

        // parse child boxes within moov
        while (this.offset < endOffset -8) {
            const childBox = this.readBox();
            console.log(`  📦 Movie child: ${childBox.type}`);

            switch (childBox.type) {
                case 'mvhd':
                    this.parseMovieHeaderBox(childBox, result);
                    break;
                case 'trak':
                    this.parseTrackBox(childBox, result);
                    break;
            }

            this.offset = childBox.end;
        }

        this.offset = oldOffset;
    }

    parseMovieHeaderBox(box, result) {
        const oldOffset = this.offset;
        this.offset = box.dataStart;

        const version = this.buffer.getUint8(this.offset);
        this.offset += 4; // skip version + flags

        if (version === 1) {
            // 64-bit version
            this.offset += 16; // skip creation/modification time
            result.timescale = this.buffer.getUint32(this.offset);
            const duration = this.buffer.getBigUint64(this.offset + 4);
            result.duration = Number(duration) / result.timescale;
        } else {
            // 32-bit version
            this.offset += 8;
            result.timescale = this.buffer.getUint32(this.offset);
            const duration = this.buffer.getUint32(this.offset + 4);
            result.duration = duration / result.timescale;
        }

        console.log(`⏱️ Duration: ${result.duration}s, Timescale: ${result.timescale}`);

        this.offset = oldOffset;
    }

    parseTrackBox(box, result) {
        const oldOffset = this.offset;
        this.offset = box.dataStart;
        const endOffset = box.end;

        const track = {
            id: 0,
            type: null,
            codec: null,
            width: 0,
            height: 0,
            codecPrivate: null,
            sampleTable: null
        };

        console.log('🎯 Parsing track...');

        // parse track child boxes
        while (this.offset < endOffset -8) {
            const childBox = this.readBox();

            switch (childBox.type) {
                case 'tkhd':
                    this.parseTrackHeaderBox(childBox, track);
                    break;
                case 'mdia':
                    this.parseMediaBox(childBox, track);
                    break;
            }

            this.offset = childBox.end;
        }

        // determine if this is video or audio track
        if (track.type === 'video' && !result.videoTrack) {
            result.videoTrack = track;
            console.log('video track: ', track);
        } else if (track.type === 'audio' && !result.audioTrack) {
            result.audioTrack = track;
            console.log('audio track: ', track);
        }

        this.offset = oldOffset;
    }

    parseTrackHeaderBox(box, track) {
        const oldOffset = this.offset;
        this.offset = box.dataStart;

        const version = this.buffer.getUint8(this.offset);
        this.offset += 4; // skip version + flags

        if (version === 1) {
            this.offset += 20; // skip times
            track.id = this.buffer.getUint32(this.offset);
            this.offset += 8; // skip reserved + duration
        } else {
            this.offset += 12; // skip times
            track.id = this.buffer.getUint32(this.offset);
            this.offset += 8; // skip reserved + duration
        }

        // skip to width/height ( at end of box )
        this.offset = box.dataStart + box.size - 16;
        track.width = this.buffer.getUint32(this.offset) >> 16; // fixed point
        track.height = this.buffer.getUint32(this.offset + 4) >> 16;

        console.log(` Track ${track.id}: ${track.width}x${track.height}`);

        this.offset = oldOffset;
    }

    parseMediaBox(box, track) {
        const oldOffset = this.offset;
        this.offset = box.dataStart;
        const endOffset = box.end;

        // parse media child boxes
        while (this.offset < endOffset -8) {
            const childBox = this.readBox();

            switch (childBox.type) {
                case 'mdhd': 
                    this.parseMediaHeaderBox(childBox, track);
                    break;
                case 'hdlr': 
                    this.parseHandlerBox(childBox, track);
                    break;
                case 'minf':
                    this.parseMediaInfoBox(childBox, track);
                    break;
            }

            this.offset = childBox.end;
        }

        this.offset = oldOffset;
    }

    parseMediaHeaderBox(box, track) {
        const oldOffset = this.offset;
        this.offset = box.dataStart;

        const version = this.buffer.getUint8(this.offset);
        this.offset += 4; 

        if (version === 1) {
            // 64-bit version
            this.offset += 16; // skip creation/mod time
            track.timescale = this.buffer.getUint32(this.offset);
            const duration = this.buffer.getBigUint64(this.offset + 4);
            track.duration = Number(duration);
        } else {
            // 32-bit version
            this.offset += 8; // skip creation/mod time
            track.timescale = this.buffer.getUint32(this.offset);
            track.duration = this.buffer.getUint32(this.offset + 4);
        }

        console.log(`📅 Media Header - Timescale: ${track.timescale}, Duration: ${track.duration} (${(track.duration / track.timescale).toFixed(2)}s)`);

        this.offset = oldOffset;
    }

    parseHandlerBox(box, track) {
        const oldOffset = this.offset;
        this.offset = box.dataStart + 8; // skip version /flags/ pre_defined

        const handlerType = this.getStringAt(this.offset, 4);

        if (handlerType === 'vide') {
            track.type = 'video';
        } else if (handlerType === 'soun') {
            track.type = 'audio';
        }

        console.log(`Handler type: ${handlerType} -> ${track.type}`);

        this.offset = oldOffset;
    }

    parseMediaInfoBox(box, track) {
        const oldOffset = this.offset;
        this.offset = box.dataStart;
        const endOffset = box.end;

        // look for sample table (stbl)
        while (this.offset < endOffset -8) {
            const childBox = this.readBox();

            if (childBox.type === 'stbl') {
                this.parseSampleTableBox(childBox, track);
            }

            this.offset = childBox.end;
        }

        this.offset = oldOffset;
    }

    parseSampleTableBox(box, track) {
        const oldOffset = this.offset;
        this.offset = box.dataStart;
        const endOffset = box.end;

        track.sampleTable = {
            sampleDescriptions: [],
            sampleSizes: [],
            chunkOffsets: [],
            samplesPerChunk: [],
            timeToSample: []
        };

        // parse sample table child boxes
        while (this.offset < endOffset - 8) {
            const childBox = this.readBox();

            switch (childBox.type) {
                case 'stsd':
                    this.parseSampleDescriptionBox(childBox, track);
                    break;
                case 'stsz':
                    this.parseSampleSizeBox(childBox, track);
                    break;
                case 'stco':
                case 'co64':
                    this.parseChunkOffsetBox(childBox, track);
                    break;
                case 'stsc':
                    this.parseSampleToChunkBox(childBox, track);
                    break;
                case 'stts':
                    this.parseTimeToSampleBox(childBox, track);
                    break;
            }

            this.offset = childBox.end;
        }

        console.log(` Sample table parsed for track ${track.id}`);

        this.offset = oldOffset;
    }

    parseSampleDescriptionBox(box, track) {
        const oldOffset = this.offset;
        this.offset = box.dataStart + 8;

        if (this.offset < box.end - 8) {
            const descBox = this.readBox();

            // For video tracks, get additional info
            if (track.type === 'video' && descBox.type.startsWith('avc')) {
                // H.264 codec info
                this.offset = descBox.dataStart + 78; // skip to avcC box

                while (this.offset < descBox.end - 8) {
                    const avcCBox = this.readBox();
                    if (avcCBox.type === 'avcC') {
                        // extract codec private data (SPS/PPS)
                        const avcConfig = this.parseAVCConfig(avcCBox);
                        track.codec = avcConfig.codecString;
                        track.codecPrivate = avcConfig.configData;
                        break;
                    }
                    this.offset = avcCBox.end;
                }

                // fallback if no avcC found
                if (!track.codec.includes('.')) {
                    track.codec = 'avc1.42E01E'; // H.264 Baseline Profile fallback
                }
            } else {
                track.codec = descBox.type;
            }
        }

        console.log(`Codec: ${track.codec}`);
        this.offset = oldOffset;
    }

    parseAVCConfig(box) {
        const oldOffset = this.offset;
        this.offset = box.dataStart;

        // read AVC configuration record
        const configurationVersion = this.buffer.getUint8(this.offset);
        const avcProfileIndication = this.buffer.getUint8(this.offset + 1);
        const profileCompatibility = this.buffer.getUint8(this.offset + 2);
        const avcLevelIndication = this.buffer.getUint8(this.offset + 3);

        // build codec string: avc1.PPCCLL where PP=profile, CC=compatibility, LL=level
        const profile = avcProfileIndication.toString(16).padStart(2, '0').toUpperCase();
        const compat = profileCompatibility.toString(16).padStart(2, '0').toUpperCase();
        const level = avcLevelIndication.toString(16).padStart(2, '0').toUpperCase();
        const codecString = `avc1.${profile}${compat}${level}`;

        // extract the full configuration data for decoder
        const configData = new Uint8Array(
            this.buffer.buffer,
            box.dataStart,
            box.size -8
        );

        console.log(`AVC Config: Profile=${profile}, level=${level}, Codec=${codecString}`);

        this.offset = oldOffset;

        return {
            codecString,
            configData,
            profile: avcProfileIndication,
            level: avcLevelIndication
        };
    }

    parseSampleSizeBox(box, track) {
        const oldOffset = this.offset;
        this.offset = box.dataStart + 4;

        const sampleSize = this.buffer.getUint32(this.offset);
        const sampleCount = this.buffer.getUint32(this.offset + 4);

        if (sampleSize === 0) {
            // variable sample sizes
            this.offset += 8;
            for (let i = 0; i < sampleCount; i++) {
                track.sampleTable.sampleSizes.push(this.buffer.getUint32(this.offset));
                this.offset += 4;
            }
        } else {
            // fixed sample size
            for (let i = 0; i < sampleCount; i++) {
                track.sampleTable.sampleSizes.push(sampleSize);
            }
        }

        console.log(`Sample sizes: ${track.sampleTable.sampleSizes.length} samples`);

        this.offset = oldOffset;
    }

    parseChunkOffsetBox(box, track) {
        const oldOffset = this.offset;
        this.offset = box.dataStart + 4;

        const entryCount = this.buffer.getUint32(this.offset);
        this.offset += 4;

        for (let i = 0; i < entryCount; i++) {
            if (box.type === 'co64') {
                // 64 bit offsets
                const offset = this.buffer.getBigUint64(this.offset);
                track.sampleTable.chunkOffsets.push(Number(offset));
                this.offset += 8;
            } else {
                // 32 bit offsets
                track.sampleTable.chunkOffsets.push(this.buffer.getUint32(this.offset));
                this.offset += 4;
            }
        }

        console.log(`Chunk offsets: ${track.sampleTable.chunkOffsets.length} chunks`);

        this.offset = oldOffset;
    }

    parseSampleToChunkBox(box, track) {
        const oldOffset = this.offset;
        this.offset = box.dataStart + 4;

        const entryCount = this.buffer.getUint32(this.offset);
        this.offset += 4;

        for (let i = 0; i < entryCount; i++) {
            track.sampleTable.samplesPerChunk.push({
                firstChunk: this.buffer.getUint32(this.offset),
                samplesPerChunk: this.buffer.getUint32(this.offset + 4),
                sampleDescriptionIndex: this.buffer.getUint32(this.offset + 8)
            });
            this.offset += 12;
        }

        console.log(`Sample to chunk: ${track.sampleTable.samplesPerChunk.length} entries`);

        this.offset = oldOffset;
    }

    parseTimeToSampleBox(box, track) {
        const oldOffset = this.offset;
        this.offset = box.dataStart + 4;

        const entryCount = this.buffer.getUint32(this.offset);
        this.offset += 4;

        for (let i = 0; i < entryCount; i++) {
            const timeEntry = {
                sampleCount: this.buffer.getUint32(this.offset),
                sampleDelta: this.buffer.getUint32(this.offset + 4)
            };
            track.sampleTable.timeToSample.push(timeEntry);
            this.offset += 8;

            console.log(`⏰ Time entry ${i}: ${timeEntry.sampleCount} samples, delta=${timeEntry.sampleDelta}`);
        }

        console.log(`Time to sample: ${track.sampleTable.timeToSample.length} entries`);

        this.offset = oldOffset;
    }

    extractVideoSamples(videoTrack, timescale = 600) {
        if (!videoTrack.sampleTable || !this.mdatOffset) {
            console.log('Cannot extract samples - missing data');
            return [];
        }

        const samples = [];
        const { sampleSizes, chunkOffsets, samplesPerChunk, timeToSample } = videoTrack.sampleTable;

        console.log('Extracting video samples...');

        let sampleIndex = 0;
        let currentTime = 0;
        let timeEntryIndex = 0;
        let samplesInCurrentTimeEntry = 0;

        // iterate through chunks
        for (let chunkIndex = 0; chunkIndex < chunkOffsets.length; chunkIndex++) {
            const chunkOffset = chunkOffsets[chunkIndex];

            // find samples per chunk for this chunk
            let samplesInChunk = 1; // default
            for (let i = samplesPerChunk.length - 1; i >= 0; i--) {
                if (chunkIndex + 1 >= samplesPerChunk[i].firstChunk) {
                    samplesInChunk = samplesPerChunk[i].samplesPerChunk;
                    break;
                }
            }

            let sampleOffsetInChunk = chunkOffset;

            // extract samples from this chunk
            for (let i = 0; i < samplesInChunk && sampleIndex < sampleSizes.length; i++) {
                const sampleSize = sampleSizes[sampleIndex];

                // Get actual sample duration from timeToSample table
                let sampleDuration = 1000; // default fallback
                if (timeEntryIndex < timeToSample.length) {
                    sampleDuration = timeToSample[timeEntryIndex].sampleDelta;
                }

                // extract sample data from mdat
                const sampleData = new Uint8Array(
                    this.buffer.buffer,
                    this.mdatOffset + (sampleOffsetInChunk - this.mdatOffset),
                    sampleSize
                );

                samples.push({
                    timestamp: Math.floor((currentTime / timescale) * 1000000), // convert to microseconds
                    duration: Math.floor((sampleDuration / timescale) * 1000000),
                    data: sampleData,
                    isKeyFrame: this.isKeyFrame(sampleData),
                    size: sampleSize
                });

                sampleIndex++;
                sampleOffsetInChunk += sampleSize;
                currentTime += sampleDuration;

                // update time entry tracking
                samplesInCurrentTimeEntry++;
                if (timeEntryIndex < timeToSample.length &&
                    samplesInCurrentTimeEntry >= timeToSample[timeEntryIndex].sampleCount) {
                    timeEntryIndex++;
                    samplesInCurrentTimeEntry = 0;
                }

                // limit samples for performance
                // if (samples.length >= 300) break;
                
            }

            // if (samples.length >= 300) break;
        }

        console.log(`✅ Extracted ${samples.length} video samples`);
        console.log(`First few timestamps (seconds):`, samples.slice(0, 10).map(s => (s.timestamp / 1000000).toFixed(3)));
        console.log(`Sample durations (microseconds):`, samples.slice(0, 10).map(s => s.duration));
        console.log(`Timescale used: ${timescale}`);
        return samples;
    }

    isKeyFrame(sampleData) {
        // for H.264, check NAL unit type
        if (sampleData.length > 4) {
            // skip length prefix and check NAL unit type
            const nalType = sampleData[4] & 0x1F;
            return nalType === 5; // IDR frame
        }
        return false;
    }

    getStringAt(offset, length) {
        let str = '';
        for (let i = 0; i < length; i++) {
            str += String.fromCharCode(this.buffer.getUint8(offset + i));
        }
        return str;
    }

    updateDebugInfo(message) {
        console.log('MP4Parser:', message);
    }
}