import { 
  db, 
  doc, 
  addDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  onSnapshot, 
  serverTimestamp 
} from './firebase';
import { sounds } from './soundEffects';

export interface CallSession {
  id: string;
  callerId: string;
  callerName: string;
  callerPhoto: string;
  receiverId: string;
  status: 'ringing' | 'connecting' | 'connected' | 'ended' | 'declined';
  isVideoCall?: boolean;
}

export type CallState = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'connected';

class WebRTCManager {
  public peerConnection: RTCPeerConnection | null = null;
  public localStream: MediaStream | null = null;
  public remoteStream: MediaStream | null = null;
  public screenStream: MediaStream | null = null;

  public currentCallId: string | null = null;
  public callState: CallState = 'idle';
  public isCameraOn: boolean = false;
  public isMicMuted: boolean = false;
  public isScreenSharing: boolean = false;
  public facingMode: 'user' | 'environment' = 'user';
  public callDuration: number = 0;

  private callDocUnsub: (() => void) | null = null;
  private timerInterval: any = null;
  private queuedCandidates: RTCIceCandidateInit[] = [];
  private processedCandidates = new Set<string>();
  private onStateChangeCb: ((state: CallState, details?: any) => void) | null = null;
  private onRemoteStreamCb: ((stream: MediaStream) => void) | null = null;

  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun.services.mozilla.com' },
      { urls: 'stun:global.stun.twilio.com:3478' },
      { urls: 'stun:stun.cloudflare.com:3478' }
    ],
    iceCandidatePoolSize: 10
  };

  public setCallbacks(
    onStateChange: (state: CallState, details?: any) => void,
    onRemoteStream: (stream: MediaStream) => void
  ) {
    this.onStateChangeCb = onStateChange;
    this.onRemoteStreamCb = onRemoteStream;
  }

  private notifyState(state: CallState, details?: any) {
    this.callState = state;
    this.onStateChangeCb?.(state, details);
  }

  // START OUTGOING CALL (Can be audio-only or video call)
  public async startCall(params: {
    callerId: string;
    callerName: string;
    callerPhoto: string;
    receiverId: string;
    partnerName: string;
    partnerPhoto: string;
    isVideo?: boolean;
  }) {
    if (this.callState !== 'idle') return;

    this.notifyState('outgoing', {
      name: params.partnerName,
      photo: params.partnerPhoto,
      isVideo: params.isVideo
    });
    sounds.startOutgoingBeep();

    try {
      // 1. Get media stream with phone/PC fallback tolerance
      this.localStream = await this.acquireUserMedia(params.isVideo ?? false);
      this.isCameraOn = params.isVideo ?? false;

      // 2. Create peer connection
      this.setupPeerConnection(true);

      // 3. Add tracks
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });

      // 4. Create call record in Firestore
      const callRef = await addDoc(collection(db, 'calls'), {
        callerId: params.callerId,
        callerName: params.callerName,
        callerPhoto: params.callerPhoto,
        receiverId: params.receiverId,
        status: 'ringing',
        isVideoCall: params.isVideo ?? false,
        createdAt: serverTimestamp(),
        callerCandidates: [],
        calleeCandidates: []
      });
      this.currentCallId = callRef.id;

      // 5. Create WebRTC offer
      const offer = await this.peerConnection!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await this.peerConnection!.setLocalDescription(offer);

      await updateDoc(callRef, {
        offer: { type: offer.type, sdp: offer.sdp },
        status: 'connecting'
      });

      // 6. Listen for Callee's answer and Callee's ICE candidates
      this.subscribeToCallDocument(callRef.id, true);

    } catch (err: any) {
      console.error('startCall failed:', err);
      sounds.stopRingtone();
      sounds.playCallEnd();
      this.notifyState('idle', { error: 'Не удалось начать звонок: ' + (err.message || 'Ошибка доступа') });
      this.cleanup();
    }
  }

  // ANSWER INCOMING CALL (Fixed phone-to-computer ICE candidate flow)
  public async answerCall(callId: string, isVideoRequested?: boolean) {
    if (!callId) return;
    this.currentCallId = callId;
    sounds.stopRingtone();
    this.notifyState('connecting');

    try {
      // 1. Acquire media (phone and PC tolerant)
      this.localStream = await this.acquireUserMedia(isVideoRequested ?? false);
      this.isCameraOn = isVideoRequested ?? false;

      // 2. Setup PeerConnection
      this.setupPeerConnection(false);

      // 3. Add tracks
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });

      // 4. Read offer from call document
      const callRef = doc(db, 'calls', callId);
      const callSnap = await getDoc(callRef);
      if (!callSnap.exists()) {
        throw new Error('Звонок уже завершен');
      }

      const callData = callSnap.data();
      if (!callData.offer) {
        throw new Error('Данные соединения не найдены');
      }

      // 5. Set Remote Description
      const remoteDesc = new RTCSessionDescription(callData.offer);
      await this.peerConnection!.setRemoteDescription(remoteDesc);

      // 6. Flush any queued candidates that arrived before remoteDescription
      await this.flushQueuedCandidates();

      // 7. Create Answer
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);

      // 8. Update Firestore with Answer
      await updateDoc(callRef, {
        answer: { type: answer.type, sdp: answer.sdp },
        status: 'connected'
      });

      // 9. Subscribe to call updates & Caller ICE candidates! (CRITICAL FIX FOR PHONE-TO-PC)
      this.subscribeToCallDocument(callId, false);

      this.startTimer();
      this.notifyState('connected');

    } catch (err: any) {
      console.error('answerCall failed:', err);
      sounds.stopRingtone();
      sounds.playCallEnd();
      this.notifyState('idle', { error: 'Ошибка соединения: ' + (err.message || 'Не удалось ответить') });
      this.cleanup();
    }
  }

  // Set up PeerConnection with robust candidate handling
  private setupPeerConnection(isCaller: boolean) {
    this.cleanupPeer();
    this.peerConnection = new RTCPeerConnection(this.rtcConfig);
    this.remoteStream = new MediaStream();
    this.processedCandidates.clear();
    this.queuedCandidates = [];

    // When a local ICE candidate is gathered, push it to Firestore
    this.peerConnection.onicecandidate = async (event) => {
      if (event.candidate && this.currentCallId) {
        try {
          const callRef = doc(db, 'calls', this.currentCallId);
          const field = isCaller ? 'callerCandidates' : 'calleeCandidates';
          const callSnap = await getDoc(callRef);
          if (callSnap.exists()) {
            const data = callSnap.data();
            const existing = data[field] || [];
            await updateDoc(callRef, {
              [field]: [...existing, event.candidate.toJSON()]
            });
          }
        } catch (e) {
          console.warn('Failed to send ICE candidate', e);
        }
      }
    };

    // When remote track arrives
    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
      } else {
        event.track.onunmute = () => {
          this.remoteStream?.addTrack(event.track);
        };
      }
      if (this.remoteStream) {
        this.onRemoteStreamCb?.(this.remoteStream);
      }
    };

    // Connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      if (state === 'connected') {
        sounds.stopRingtone();
        this.startTimer();
        this.notifyState('connected');
      } else if (state === 'disconnected' || state === 'failed') {
        console.warn('WebRTC connection state:', state);
        this.notifyState('idle', { error: 'Соединение прервано' });
        this.hangUp();
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      if (state === 'connected' || state === 'completed') {
        sounds.stopRingtone();
      }
    };
  }

  // Subscribe to call changes and sync candidates
  private subscribeToCallDocument(callId: string, isCaller: boolean) {
    if (this.callDocUnsub) {
      this.callDocUnsub();
      this.callDocUnsub = null;
    }

    const callRef = doc(db, 'calls', callId);
    this.callDocUnsub = onSnapshot(callRef, async (docSnap) => {
      if (!docSnap.exists()) {
        this.hangUp();
        return;
      }

      const data = docSnap.data();
      if (data.status === 'ended' || data.status === 'declined') {
        this.hangUp();
        return;
      }

      // If Caller, watch for Callee's Answer
      if (isCaller && data.answer && this.peerConnection?.signalingState === 'have-local-offer') {
        const remoteDesc = new RTCSessionDescription(data.answer);
        await this.peerConnection.setRemoteDescription(remoteDesc);
        await this.flushQueuedCandidates();
        sounds.stopRingtone();
        this.startTimer();
        this.notifyState('connected');
      }

      // Candidate field to watch:
      // If we are Caller -> watch 'calleeCandidates'
      // If we are Callee -> watch 'callerCandidates' (THE PREVIOUSLY MISSING CRITICAL PIECE!)
      const remoteField = isCaller ? 'calleeCandidates' : 'callerCandidates';
      const remoteCandidates = data[remoteField] as RTCIceCandidateInit[] | undefined;

      if (remoteCandidates && Array.isArray(remoteCandidates)) {
        for (const candidateData of remoteCandidates) {
          const key = JSON.stringify(candidateData);
          if (this.processedCandidates.has(key)) continue;
          this.processedCandidates.add(key);

          if (this.peerConnection && this.peerConnection.remoteDescription) {
            try {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateData));
            } catch (err) {
              console.warn('Error adding candidate:', err);
            }
          } else {
            this.queuedCandidates.push(candidateData);
          }
        }
      }
    });
  }

  // Flush queued candidates once remoteDescription is set
  private async flushQueuedCandidates() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    while (this.queuedCandidates.length > 0) {
      const cand = this.queuedCandidates.shift();
      if (cand) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.warn('Flushing candidate error:', e);
        }
      }
    }
  }

  // Tolerant getUserMedia for phone & computer
  private async acquireUserMedia(needVideo: boolean): Promise<MediaStream> {
    const audioConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    };

    if (needVideo) {
      try {
        return await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: {
            facingMode: this.facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      } catch (videoErr) {
        console.warn('Failed video + audio, falling back to audio only', videoErr);
      }
    }

    // Audio-only attempt
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false
      });
    } catch (audioErr) {
      // Extremely low fallback
      return await navigator.mediaDevices.getUserMedia({
        audio: true
      });
    }
  }

  // Toggle Microphone
  public toggleMute(): boolean {
    if (!this.localStream) return false;
    this.isMicMuted = !this.isMicMuted;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !this.isMicMuted;
    });
    return this.isMicMuted;
  }

  // Toggle Camera
  public async toggleCamera(): Promise<boolean> {
    if (!this.localStream) return false;
    this.isCameraOn = !this.isCameraOn;

    const existingVideo = this.localStream.getVideoTracks();
    if (existingVideo.length > 0) {
      existingVideo.forEach((track) => {
        track.enabled = this.isCameraOn;
      });
    } else if (this.isCameraOn) {
      // Add video track if not present
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: this.facingMode }
        });
        const newTrack = videoStream.getVideoTracks()[0];
        this.localStream.addTrack(newTrack);

        if (this.peerConnection) {
          this.peerConnection.addTrack(newTrack, this.localStream);
        }
      } catch (e) {
        console.warn('Cannot enable camera:', e);
        this.isCameraOn = false;
      }
    }

    return this.isCameraOn;
  }

  // Switch Camera (Front / Back on Mobile Phones)
  public async switchCamera(): Promise<void> {
    if (!this.localStream || !this.isCameraOn) return;
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';

    try {
      const oldTracks = this.localStream.getVideoTracks();
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.facingMode }
      });
      const newTrack = newStream.getVideoTracks()[0];

      oldTracks.forEach((t) => {
        t.stop();
        this.localStream?.removeTrack(t);
      });
      this.localStream.addTrack(newTrack);

      if (this.peerConnection) {
        const sender = this.peerConnection.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newTrack);
        }
      }
    } catch (e) {
      console.warn('Switch camera error:', e);
    }
  }

  // Screen Sharing (for Computer / Desktop / Android)
  public async toggleScreenShare(): Promise<boolean> {
    if (this.isScreenSharing) {
      // Stop sharing
      this.screenStream?.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
      this.isScreenSharing = false;

      // Revert to camera if on
      const cameraTrack = this.localStream?.getVideoTracks()[0] || null;
      const sender = this.peerConnection?.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(cameraTrack);
      }
      return false;
    } else {
      try {
        if (!navigator.mediaDevices.getDisplayMedia) {
          alert('Демонстрация экрана не поддерживается на данном устройстве.');
          return false;
        }
        this.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = this.screenStream.getVideoTracks()[0];
        this.isScreenSharing = true;

        screenTrack.onended = () => {
          this.toggleScreenShare();
        };

        const sender = this.peerConnection?.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(screenTrack);
        } else if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(screenTrack, this.localStream);
        }
        return true;
      } catch (e) {
        console.warn('Screen share cancelled/failed', e);
        return false;
      }
    }
  }

  // Hang up call
  public async hangUp() {
    sounds.stopRingtone();
    sounds.playCallEnd();

    if (this.currentCallId) {
      try {
        const callRef = doc(db, 'calls', this.currentCallId);
        const snap = await getDoc(callRef);
        if (snap.exists() && snap.data().status !== 'ended') {
          await updateDoc(callRef, { status: 'ended' });
        }
      } catch (e) {
        console.warn(e);
      }
    }

    this.cleanup();
    this.notifyState('idle');
  }

  private cleanupPeer() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.processedCandidates.clear();
    this.queuedCandidates = [];
  }

  private cleanup() {
    this.cleanupPeer();
    if (this.callDocUnsub) {
      this.callDocUnsub();
      this.callDocUnsub = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this.remoteStream = null;
    this.currentCallId = null;
    this.isCameraOn = false;
    this.isMicMuted = false;
    this.isScreenSharing = false;
    this.callDuration = 0;
  }

  private startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.callDuration = 0;
    this.timerInterval = setInterval(() => {
      this.callDuration++;
      this.notifyState('connected', { duration: this.callDuration });
    }, 1000);
  }
}

export const webrtc = new WebRTCManager();
