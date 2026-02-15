const axios = require('axios');

const SRS_API_URL = process.env.SRS_HTTP_API_URL || 'http://srs:1985/api/v1';

class SRSApi {
  /**
   * Get SRS server version
   */
  static async getVersion() {
    try {
      const response = await axios.get(`${SRS_API_URL}/versions`);
      return response.data;
    } catch (error) {
      console.error('Error fetching SRS version:', error.message);
      throw error;
    }
  }

  /**
   * Get all streams
   */
  static async getStreams() {
    try {
      const response = await axios.get(`${SRS_API_URL}/streams/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching streams from SRS:', error.message);
      return { streams: [] };
    }
  }

  /**
   * Get specific stream by ID
   */
  static async getStream(streamId) {
    try {
      const response = await axios.get(`${SRS_API_URL}/streams/${streamId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching stream ${streamId} from SRS:`, error.message);
      return null;
    }
  }

  /**
   * Get clients (publishers and players)
   */
  static async getClients() {
    try {
      const response = await axios.get(`${SRS_API_URL}/clients/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching clients from SRS:', error.message);
      return { clients: [] };
    }
  }

  /**
   * Kick/disconnect a client
   */
  static async kickClient(clientId) {
    try {
      const response = await axios.delete(`${SRS_API_URL}/clients/${clientId}`);
      return response.data;
    } catch (error) {
      console.error(`Error kicking client ${clientId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get vhosts (virtual hosts)
   */
  static async getVhosts() {
    try {
      const response = await axios.get(`${SRS_API_URL}/vhosts/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching vhosts from SRS:', error.message);
      return { vhosts: [] };
    }
  }

  /**
   * Get active streams with details
   */
  static async getActiveStreamsWithDetails() {
    try {
      const streamsData = await this.getStreams();
      const streams = streamsData.streams || [];

      return streams.map(stream => ({
        id: stream.id,
        name: stream.name,
        vhost: stream.vhost,
        app: stream.app,
        live: stream.live,
        clients: stream.clients || 0,
        frames: stream.frames,
        send_bytes: stream.send_bytes,
        recv_bytes: stream.recv_bytes,
        kbps: {
          recv: stream.kbps ? stream.kbps.recv_30s : 0,
          send: stream.kbps ? stream.kbps.send_30s : 0
        },
        video: stream.video ? {
          codec: stream.video.codec,
          profile: stream.video.profile,
          level: stream.video.level,
          width: stream.video.width,
          height: stream.video.height,
          fps: stream.video.frame_rate || stream.video.fps || null
        } : null,
        audio: stream.audio ? {
          codec: stream.audio.codec,
          sample_rate: stream.audio.sample_rate,
          channels: stream.audio.channels
        } : null
      }));
    } catch (error) {
      console.error('Error fetching active streams:', error.message);
      return [];
    }
  }

  /**
   * Find stream by stream key
   */
  static async findStreamByKey(streamKey) {
    try {
      const streams = await this.getActiveStreamsWithDetails();
      return streams.find(stream => stream.name === streamKey);
    } catch (error) {
      console.error('Error finding stream by key:', error.message);
      return null;
    }
  }

  /**
   * Check if SRS is healthy
   */
  static async healthCheck() {
    try {
      const version = await this.getVersion();
      return {
        healthy: true,
        version: version.data
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Get server statistics
   */
  static async getServerStats() {
    try {
      const [streams, clients, vhosts] = await Promise.all([
        this.getStreams(),
        this.getClients(),
        this.getVhosts()
      ]);

      return {
        streams: streams.streams?.length || 0,
        clients: clients.clients?.length || 0,
        vhosts: vhosts.vhosts?.length || 0
      };
    } catch (error) {
      console.error('Error fetching server stats:', error.message);
      return {
        streams: 0,
        clients: 0,
        vhosts: 0
      };
    }
  }
}

module.exports = SRSApi;
