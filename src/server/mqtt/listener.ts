/**
 * MQTT Listener - Connects to MQTT broker and streams messages
 */

import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { EventEmitter } from 'events';
import type { MQTTConfig, ExtractedMessage } from '../shared/types.js';

export interface MQTTListenerEvents {
  message: (message: ExtractedMessage) => void;
  connected: () => void;
  disconnected: () => void;
  error: (error: Error) => void;
  subscribed: (topic: string) => void;
}

/**
 * MQTT Listener class
 */
export class MQTTListener extends EventEmitter {
  private client: MqttClient | null = null;
  private config: MQTTConfig;
  private subscribedTopics: Set<string> = new Set();
  private messageBuffer: ExtractedMessage[] = [];
  private maxBufferSize: number = 1000;

  constructor(config: MQTTConfig) {
    super();
    this.config = config;
  }

  /**
   * Connect to the MQTT broker
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `mqtt://${this.config.host}:${this.config.port}`;
      
      const options: IClientOptions = {
        clientId: this.config.clientId || `asyncapi-gen-${Date.now()}`,
        clean: true,
        connectTimeout: 10000,
        reconnectPeriod: 5000,
      };

      if (this.config.username) {
        options.username = this.config.username;
        options.password = this.config.password;
      }

      this.client = mqtt.connect(url, options);

      this.client.on('connect', () => {
        this.emit('connected');
        resolve();
      });

      this.client.on('error', (error) => {
        this.emit('error', error);
        reject(error);
      });

      this.client.on('close', () => {
        this.emit('disconnected');
      });

      this.client.on('message', (topic: string, payload: Buffer) => {
        this.handleMessage(topic, payload);
      });
    });
  }

  /**
   * Disconnect from the broker
   */
  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.client) {
        this.client.end(true, {}, () => {
          this.client = null;
          this.subscribedTopics.clear();
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Subscribe to a topic pattern
   * Supports MQTT wildcards: + (single level), # (multi level)
   */
  async subscribe(topicPattern: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('Not connected'));
        return;
      }

      this.client.subscribe(topicPattern, { qos: 0 }, (error) => {
        if (error) {
          reject(error);
        } else {
          this.subscribedTopics.add(topicPattern);
          this.emit('subscribed', topicPattern);
          resolve();
        }
      });
    });
  }

  /**
   * Unsubscribe from a topic pattern
   */
  async unsubscribe(topicPattern: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('Not connected'));
        return;
      }

      this.client.unsubscribe(topicPattern, (error) => {
        if (error) {
          reject(error);
        } else {
          this.subscribedTopics.delete(topicPattern);
          resolve();
        }
      });
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(topic: string, payload: Buffer): void {
    try {
      // Try to parse as JSON
      const payloadStr = payload.toString('utf-8');
      let parsedPayload: unknown;
      
      try {
        parsedPayload = JSON.parse(payloadStr);
      } catch {
        // If not JSON, wrap as string
        parsedPayload = { _rawPayload: payloadStr };
      }

      const message: ExtractedMessage = {
        topic,
        payload: parsedPayload as Record<string, unknown>,
        timestamp: new Date(),
      };

      // Try to extract model name from payload
      if (typeof parsedPayload === 'object' && parsedPayload !== null) {
        const obj = parsedPayload as Record<string, unknown>;
        if ('_model' in obj && typeof obj._model === 'string') {
          message.modelName = obj._model;
        }
      }

      // Add to buffer
      this.messageBuffer.push(message);
      if (this.messageBuffer.length > this.maxBufferSize) {
        this.messageBuffer.shift();
      }

      // Emit message event
      this.emit('message', message);
    } catch (error) {
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get all buffered messages
   */
  getMessages(): ExtractedMessage[] {
    return [...this.messageBuffer];
  }

  /**
   * Clear the message buffer
   */
  clearBuffer(): void {
    this.messageBuffer = [];
  }

  /**
   * Get subscribed topics
   */
  getSubscribedTopics(): string[] {
    return Array.from(this.subscribedTopics);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  /**
   * Get connection status
   */
  getStatus(): {
    connected: boolean;
    subscribedTopics: string[];
    messageCount: number;
  } {
    return {
      connected: this.isConnected(),
      subscribedTopics: this.getSubscribedTopics(),
      messageCount: this.messageBuffer.length,
    };
  }
}

/**
 * Create an MQTT listener instance
 */
export function createMQTTListener(config: MQTTConfig): MQTTListener {
  return new MQTTListener(config);
}
