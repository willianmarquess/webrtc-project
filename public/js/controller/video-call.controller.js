export class VideoCallController {

    #localStream = null;
    #localVideoElem = null;
    #peers = {};
    #socket = null;

    #callConfig = {
        audio: false,
        video: false,
    }

    #buttonControlAudio = null;
    #buttonControlVideo = null;

    constructor(socket) {
        this.#socket = socket;
        this.#localVideoElem = document.getElementById('local-video');
        this.#buttonControlAudio = document.getElementById('control-audio');
        this.#buttonControlVideo = document.getElementById('control-video');
    }

    async #updateCallConfig() {
        const { audio, video } = await this.#verifyDevices();
        this.#callConfig = {
            audio,
            video
        }
    }

    async config() {
        await this.#updateCallConfig();
        this.#buttonControlAudio.addEventListener('click', this.#muteUnmuteAudio.bind(this));
        this.#buttonControlVideo.addEventListener('click', this.#enableDisableVideo.bind(this));
        navigator.mediaDevices.ondevicechange = () => this.#onDeviceChange();
    }

    async #verifyDevices() {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audio = devices.some(d => d.kind === 'audioinput');
        const video = devices.some(d => d.kind === 'videoinput');
        return {
            audio,
            video
        }
    }

    async start() {
        try {
            await this.#updateCallConfig();
            const localStream = await navigator.mediaDevices.getUserMedia(this.#callConfig);
            this.#localVideoElem.srcObject = localStream;
            this.#localStream = localStream;
            this.#configEvents();
        } catch (error) {
            console.log(error);
        }
    }

    #configEvents() {
        this.#socket.emit('start-in-call');
        this.#socket.on('new-user', this.#onNewUser.bind(this));
        this.#socket.on('call-made', this.#onCallMade.bind(this));
        this.#socket.on('answer-made', this.#onAnswerMade.bind(this));
        this.#socket.on('add-ice-candidate', this.#onAddIceCandidate.bind(this));
    }

    async #onAddIceCandidate({ candidate, id }) {
        await this.#peers[id].addIceCandidate(candidate);
    }

    async #onAnswerMade({ answer, id }) {
        await this.#peers[id].setRemoteDescription(answer);
    }

    async #onCallMade({ offer, id }) {
        this.#createAndConfigPeer(id);

        await this.#peers[id].setRemoteDescription(offer);
        const answer = await this.#peers[id].createAnswer();
        await this.#peers[id].setLocalDescription(answer);

        this.#socket.emit('make-answer', {
            answer,
            to: id
        });
    }

    async #onNewUser(id) {
        try {
            this.#createAndConfigPeer(id);

            const offer = await this.#peers[id].createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });
            await this.#peers[id].setLocalDescription(offer);

            this.#socket.emit('call', {
                offer,
                to: id
            })
        } catch (error) {
            console.log(error);
        }
    }

    async #onIceCandidate(candidate, id) {
        if (!candidate) return;
        this.#socket.emit('ice-candidate', {
            candidate,
            to: id
        });
    }

    #onTrack(data, id) {
        const videoElem = this.#createVideoElement(id);
        const videoContainer = document.getElementById('video-container');
        videoContainer.appendChild(videoElem);
        videoElem.srcObject = data.streams[0];
    }

    #onIceConnectionStateChange(id) {
        switch (this.#peers[id].iceConnectionState) {
            case 'closed':
            case 'failed':
            case 'disconnected':
                console.log('removing', this.#peers[id].iceConnectionState);
                this.#removePeer(id);
                break;
            default:
                console.log('unknow state: ', this.#peers[id].iceConnectionState);
                break;
        }
    }

    #createAndConfigPeer(id) {
        this.#peers[id] = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:openrelay.metered.ca:80",
                },
                {
                    urls: "turn:openrelay.metered.ca:80",
                    username: "openrelayproject",
                    credential: "openrelayproject",
                },
                {
                    urls: "turn:openrelay.metered.ca:443",
                    username: "openrelayproject",
                    credential: "openrelayproject",
                },
                {
                    urls: "turn:openrelay.metered.ca:443?transport=tcp",
                    username: "openrelayproject",
                    credential: "openrelayproject",
                },
            ],
        });
        if (this.#localStream)
            this.#localStream.getTracks().forEach(track => this.#peers[id].addTrack(track, this.#localStream));
        this.#peers[id].onicecandidate = ({ candidate }) => this.#onIceCandidate(candidate, id);
        this.#peers[id].ontrack = (data) => this.#onTrack(data, id);
        this.#peers[id].oniceconnectionstatechange = () => this.#onIceConnectionStateChange(id);
    }


    #createVideoElement(id) {
        const elemExists = document.getElementById(id);
        if (elemExists) {
            return elemExists;
        }
        const videoElem = document.createElement('video');
        videoElem.setAttribute('id', id);
        videoElem.setAttribute('poster', './assets/basic-avatar.png');
        videoElem.autoplay = true;
        return videoElem;
    }

    #removePeer(id) {
        const videoElem = document.getElementById(id);
        const videoContainer = document.getElementById('video-container');
        if(videoElem) {
            videoContainer.removeChild(videoElem);
            delete this.#peers[id];
        }
    }

    #muteUnmuteAudio() {
        this.#localStream.getAudioTracks().forEach(track => {
            this.#buttonControlAudio.setAttribute('src', `./assets/video-controlls/${!track.enabled}-audio-icon.png`);
            track.enabled = !track.enabled
        });
    }

    #enableDisableVideo() {
        this.#localStream.getVideoTracks().forEach(track => {
            this.#buttonControlVideo.setAttribute('src', `./assets/video-controlls/${!track.enabled}-video-icon.png`);
            track.enabled = !track.enabled
        });
    }


    async #onDeviceChange() {
        try {
            if (this.#localStream) {
                this.#localStream.getTracks().forEach(track => {
                    track.stop();
                });
            }
            await this.#updateCallConfig();
            const localStream = await navigator.mediaDevices.getUserMedia(this.#callConfig);

            const [videoTrack] = localStream.getVideoTracks();
            const [audioTrack] = localStream.getAudioTracks();

            for (const id in this.#peers) {
                if (videoTrack) {
                    const videoSender = this.#peers[id].getSenders().find(sender => sender.track.kind === videoTrack.kind);
                    videoSender.replaceTrack(videoTrack);
                }
                if (audioTrack) {
                    const audioSender = this.#peers[id].getSenders().find(sender => sender.track.kind === audioTrack.kind);
                    audioSender.replaceTrack(audioTrack);
                }
            }

            this.#localVideoElem.srcObject = localStream;
            this.#localStream = localStream;
        } catch (error) {
            console.log(error);
        }
    }

    getCallConfig() {
        return this.#callConfig;
    }

}