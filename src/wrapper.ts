// AI SDK Wrapper with OpenTelemetry Instrumentation
import { AgentBillTracer } from './tracer';
import { AgentBillConfig } from './types';

export class AgentBillWrapper {
  private tracer: AgentBillTracer;
  private config: AgentBillConfig;

  constructor(config: AgentBillConfig) {
    this.config = config;
    this.tracer = new AgentBillTracer(config);
  }

  /**
   * Wrap an OpenAI client instance
   */
  wrapOpenAI<T extends object>(client: T): T {
    const self = this;

    return new Proxy(client, {
      get(target: any, prop: string | symbol) {
        const original = target[prop];

        // Intercept chat.completions.create
        if (prop === 'chat') {
          return new Proxy(original, {
            get(chatTarget: any, chatProp: string | symbol) {
              if (chatProp === 'completions') {
                return new Proxy(chatTarget[chatProp], {
                  get(completionsTarget: any, completionsProp: string | symbol) {
                    if (completionsProp === 'create') {
                      return async function(params: any) {
                        return self.instrumentOpenAICall(
                          completionsTarget[completionsProp].bind(completionsTarget),
                          params
                        );
                      };
                    }
                    return completionsTarget[completionsProp];
                  }
                });
              }
              return chatTarget[chatProp];
            }
          });
        }

        // Intercept embeddings.create
        if (prop === 'embeddings') {
          return new Proxy(original, {
            get(embeddingsTarget: any, embeddingsProp: string | symbol) {
              if (embeddingsProp === 'create') {
                return async function(params: any) {
                  return self.instrumentOpenAIEmbeddings(
                    embeddingsTarget[embeddingsProp].bind(embeddingsTarget),
                    params
                  );
                };
              }
              return embeddingsTarget[embeddingsProp];
            }
          });
        }

        // Intercept images.generate
        if (prop === 'images') {
          return new Proxy(original, {
            get(imagesTarget: any, imagesProp: string | symbol) {
              if (imagesProp === 'generate') {
                return async function(params: any) {
                  return self.instrumentOpenAIImages(
                    imagesTarget[imagesProp].bind(imagesTarget),
                    params
                  );
                };
              }
              return imagesTarget[imagesProp];
            }
          });
        }

        // Intercept audio.transcriptions.create and audio.speech.create
        if (prop === 'audio') {
          return new Proxy(original, {
            get(audioTarget: any, audioProp: string | symbol) {
              if (audioProp === 'transcriptions') {
                return new Proxy(audioTarget[audioProp], {
                  get(transcriptionsTarget: any, transcriptionsProp: string | symbol) {
                    if (transcriptionsProp === 'create') {
                      return async function(params: any) {
                        return self.instrumentOpenAIAudioTranscription(
                          transcriptionsTarget[transcriptionsProp].bind(transcriptionsTarget),
                          params
                        );
                      };
                    }
                    return transcriptionsTarget[transcriptionsProp];
                  }
                });
              }
              if (audioProp === 'speech') {
                return new Proxy(audioTarget[audioProp], {
                  get(speechTarget: any, speechProp: string | symbol) {
                    if (speechProp === 'create') {
                      return async function(params: any) {
                        return self.instrumentOpenAIAudioSpeech(
                          speechTarget[speechProp].bind(speechTarget),
                          params
                        );
                      };
                    }
                    return speechTarget[speechProp];
                  }
                });
              }
              return audioTarget[audioProp];
            }
          });
        }

        // Intercept moderations.create
        if (prop === 'moderations') {
          return new Proxy(original, {
            get(moderationsTarget: any, moderationsProp: string | symbol) {
              if (moderationsProp === 'create') {
                return async function(params: any) {
                  return self.instrumentOpenAIModerations(
                    moderationsTarget[moderationsProp].bind(moderationsTarget),
                    params
                  );
                };
              }
              return moderationsTarget[moderationsProp];
            }
          });
        }

        return original;
      }
    });
  }

  private async instrumentOpenAICall(originalFn: Function, params: any) {
    const traceContext = this.tracer.startSpan('openai.chat.completions.create');
    const startTime = Date.now();

    try {
      // Set span attributes
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.system', 'openai');
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.request.model', params.model || 'unknown');
      this.tracer.setSpanAttribute(traceContext.spanId, 'ai.provider', 'openai');
      this.tracer.setSpanAttribute(traceContext.spanId, 'ai.model', params.model || 'unknown');

      if (params.temperature !== undefined) {
        this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.request.temperature', params.temperature);
      }
      if (params.max_tokens !== undefined) {
        this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.request.max_tokens', params.max_tokens);
      }

      // Execute the original API call
      const response = await originalFn(params);

      // Calculate latency
      const latencyMs = Date.now() - startTime;
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.response.latency_ms', latencyMs);

      // Extract token usage from response
      if (response.usage) {
        this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.usage.prompt_tokens', response.usage.prompt_tokens || 0);
        this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.usage.completion_tokens', response.usage.completion_tokens || 0);
        this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.usage.total_tokens', response.usage.total_tokens || 0);
        this.tracer.setSpanAttribute(traceContext.spanId, 'ai.prompt_tokens', response.usage.prompt_tokens || 0);
        this.tracer.setSpanAttribute(traceContext.spanId, 'ai.completion_tokens', response.usage.completion_tokens || 0);
        this.tracer.setSpanAttribute(traceContext.spanId, 'ai.total_tokens', response.usage.total_tokens || 0);
      }

      // Set success status
      this.tracer.setSpanStatus(traceContext.spanId, 0); // 0 = OK
      this.tracer.endSpan(traceContext.spanId);

      return response;
    } catch (error) {
      // Set error status
      this.tracer.setSpanStatus(traceContext.spanId, 2, error instanceof Error ? error.message : 'Unknown error');
      this.tracer.setSpanAttribute(traceContext.spanId, 'error', true);
      this.tracer.setSpanAttribute(traceContext.spanId, 'error.message', error instanceof Error ? error.message : String(error));
      this.tracer.endSpan(traceContext.spanId);
      throw error;
    }
  }

  private async instrumentOpenAIEmbeddings(originalFn: Function, params: any) {
    const traceContext = this.tracer.startSpan('openai.embeddings.create');
    const startTime = Date.now();

    try {
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.system', 'openai');
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.request.model', params.model || 'unknown');
      this.tracer.setSpanAttribute(traceContext.spanId, 'ai.provider', 'openai');
      this.tracer.setSpanAttribute(traceContext.spanId, 'ai.model', params.model || 'unknown');

      const response = await originalFn(params);
      const latencyMs = Date.now() - startTime;
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.response.latency_ms', latencyMs);

      if (response.usage) {
        this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.usage.prompt_tokens', response.usage.prompt_tokens || 0);
        this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.usage.total_tokens', response.usage.total_tokens || 0);
        this.tracer.setSpanAttribute(traceContext.spanId, 'ai.prompt_tokens', response.usage.prompt_tokens || 0);
        this.tracer.setSpanAttribute(traceContext.spanId, 'ai.total_tokens', response.usage.total_tokens || 0);
      }

      this.tracer.setSpanStatus(traceContext.spanId, 0);
      this.tracer.endSpan(traceContext.spanId);
      return response;
    } catch (error) {
      this.tracer.setSpanStatus(traceContext.spanId, 2, error instanceof Error ? error.message : 'Unknown error');
      this.tracer.setSpanAttribute(traceContext.spanId, 'error', true);
      this.tracer.setSpanAttribute(traceContext.spanId, 'error.message', error instanceof Error ? error.message : String(error));
      this.tracer.endSpan(traceContext.spanId);
      throw error;
    }
  }

  private async instrumentOpenAIImages(originalFn: Function, params: any) {
    const traceContext = this.tracer.startSpan('openai.images.generate');
    const startTime = Date.now();

    try {
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.system', 'openai');
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.request.model', params.model || 'dall-e-3');
      this.tracer.setSpanAttribute(traceContext.spanId, 'ai.provider', 'openai');
      this.tracer.setSpanAttribute(traceContext.spanId, 'ai.model', params.model || 'dall-e-3');
      
      if (params.size) {
        this.tracer.setSpanAttribute(traceContext.spanId, 'image.size', params.size);
      }
      if (params.quality) {
        this.tracer.setSpanAttribute(traceContext.spanId, 'image.quality', params.quality);
      }

      const response = await originalFn(params);
      const latencyMs = Date.now() - startTime;
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.response.latency_ms', latencyMs);

      this.tracer.setSpanStatus(traceContext.spanId, 0);
      this.tracer.endSpan(traceContext.spanId);
      return response;
    } catch (error) {
      this.tracer.setSpanStatus(traceContext.spanId, 2, error instanceof Error ? error.message : 'Unknown error');
      this.tracer.setSpanAttribute(traceContext.spanId, 'error', true);
      this.tracer.setSpanAttribute(traceContext.spanId, 'error.message', error instanceof Error ? error.message : String(error));
      this.tracer.endSpan(traceContext.spanId);
      throw error;
    }
  }

  private async instrumentOpenAIAudioTranscription(originalFn: Function, params: any) {
    const traceContext = this.tracer.startSpan('openai.audio.transcriptions.create');
    const startTime = Date.now();

    try {
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.system', 'openai');
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.request.model', params.model || 'whisper-1');
      this.tracer.setSpanAttribute(traceContext.spanId, 'ai.provider', 'openai');
      this.tracer.setSpanAttribute(traceContext.spanId, 'ai.model', params.model || 'whisper-1');

      const response = await originalFn(params);
      const latencyMs = Date.now() - startTime;
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.response.latency_ms', latencyMs);

      this.tracer.setSpanStatus(traceContext.spanId, 0);
      this.tracer.endSpan(traceContext.spanId);
      return response;
    } catch (error) {
      this.tracer.setSpanStatus(traceContext.spanId, 2, error instanceof Error ? error.message : 'Unknown error');
      this.tracer.setSpanAttribute(traceContext.spanId, 'error', true);
      this.tracer.setSpanAttribute(traceContext.spanId, 'error.message', error instanceof Error ? error.message : String(error));
      this.tracer.endSpan(traceContext.spanId);
      throw error;
    }
  }

  private async instrumentOpenAIAudioSpeech(originalFn: Function, params: any) {
    const traceContext = this.tracer.startSpan('openai.audio.speech.create');
    const startTime = Date.now();

    try {
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.system', 'openai');
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.request.model', params.model || 'tts-1');
      this.tracer.setSpanAttribute(traceContext.spanId, 'ai.provider', 'openai');
      this.tracer.setSpanAttribute(traceContext.spanId, 'ai.model', params.model || 'tts-1');
      
      if (params.voice) {
        this.tracer.setSpanAttribute(traceContext.spanId, 'audio.voice', params.voice);
      }

      const response = await originalFn(params);
      const latencyMs = Date.now() - startTime;
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.response.latency_ms', latencyMs);

      this.tracer.setSpanStatus(traceContext.spanId, 0);
      this.tracer.endSpan(traceContext.spanId);
      return response;
    } catch (error) {
      this.tracer.setSpanStatus(traceContext.spanId, 2, error instanceof Error ? error.message : 'Unknown error');
      this.tracer.setSpanAttribute(traceContext.spanId, 'error', true);
      this.tracer.setSpanAttribute(traceContext.spanId, 'error.message', error instanceof Error ? error.message : String(error));
      this.tracer.endSpan(traceContext.spanId);
      throw error;
    }
  }

  private async instrumentOpenAIModerations(originalFn: Function, params: any) {
    const traceContext = this.tracer.startSpan('openai.moderations.create');
    const startTime = Date.now();

    try {
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.system', 'openai');
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.request.model', params.model || 'text-moderation-latest');
      this.tracer.setSpanAttribute(traceContext.spanId, 'ai.provider', 'openai');
      this.tracer.setSpanAttribute(traceContext.spanId, 'ai.model', params.model || 'text-moderation-latest');

      const response = await originalFn(params);
      const latencyMs = Date.now() - startTime;
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.response.latency_ms', latencyMs);

      this.tracer.setSpanStatus(traceContext.spanId, 0);
      this.tracer.endSpan(traceContext.spanId);
      return response;
    } catch (error) {
      this.tracer.setSpanStatus(traceContext.spanId, 2, error instanceof Error ? error.message : 'Unknown error');
      this.tracer.setSpanAttribute(traceContext.spanId, 'error', true);
      this.tracer.setSpanAttribute(traceContext.spanId, 'error.message', error instanceof Error ? error.message : String(error));
      this.tracer.endSpan(traceContext.spanId);
      throw error;
    }
  }

  /**
   * Wrap an Anthropic client instance
   */
  wrapAnthropic<T extends object>(client: T): T {
    const self = this;

    return new Proxy(client, {
      get(target: any, prop: string | symbol) {
        const original = target[prop];

        // Intercept messages.create
        if (prop === 'messages') {
          return new Proxy(original, {
            get(messagesTarget: any, messagesProp: string | symbol) {
              if (messagesProp === 'create') {
                return async function(params: any) {
                  return self.instrumentAnthropicCall(
                    messagesTarget[messagesProp].bind(messagesTarget),
                    params
                  );
                };
              }
              return messagesTarget[messagesProp];
            }
          });
        }

        return original;
      }
    });
  }

  private async instrumentAnthropicCall(originalFn: Function, params: any) {
    const traceContext = this.tracer.startSpan('anthropic.messages.create');
    const startTime = Date.now();

    try {
      // Set span attributes
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.system', 'anthropic');
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.request.model', params.model || 'unknown');
      this.tracer.setSpanAttribute(traceContext.spanId, 'ai.provider', 'anthropic');
      this.tracer.setSpanAttribute(traceContext.spanId, 'ai.model', params.model || 'unknown');

      if (params.temperature !== undefined) {
        this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.request.temperature', params.temperature);
      }
      if (params.max_tokens !== undefined) {
        this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.request.max_tokens', params.max_tokens);
      }

      // Execute the original API call
      const response = await originalFn(params);

      // Calculate latency
      const latencyMs = Date.now() - startTime;
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.response.latency_ms', latencyMs);

      // Extract token usage from response
      if (response.usage) {
        this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.usage.prompt_tokens', response.usage.input_tokens || 0);
        this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.usage.completion_tokens', response.usage.output_tokens || 0);
        this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.usage.total_tokens', (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0));
        this.tracer.setSpanAttribute(traceContext.spanId, 'ai.prompt_tokens', response.usage.input_tokens || 0);
        this.tracer.setSpanAttribute(traceContext.spanId, 'ai.completion_tokens', response.usage.output_tokens || 0);
        this.tracer.setSpanAttribute(traceContext.spanId, 'ai.total_tokens', (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0));
      }

      // Set success status
      this.tracer.setSpanStatus(traceContext.spanId, 0);
      this.tracer.endSpan(traceContext.spanId);

      return response;
    } catch (error) {
      // Set error status
      this.tracer.setSpanStatus(traceContext.spanId, 2, error instanceof Error ? error.message : 'Unknown error');
      this.tracer.setSpanAttribute(traceContext.spanId, 'error', true);
      this.tracer.setSpanAttribute(traceContext.spanId, 'error.message', error instanceof Error ? error.message : String(error));
      this.tracer.endSpan(traceContext.spanId);
      throw error;
    }
  }

  /**
   * Wrap an AWS Bedrock client instance
   */
  wrapBedrock<T extends object>(client: T): T {
    const self = this;

    return new Proxy(client, {
      get(target: any, prop: string | symbol) {
        const original = target[prop];

        // Intercept invokeModel calls
        if (prop === 'invokeModel' || prop === 'send') {
          return async function(command: any) {
            return self.instrumentBedrockCall(
              original.bind(target),
              command
            );
          };
        }

        return original;
      }
    });
  }

  private async instrumentBedrockCall(originalFn: Function, command: any) {
    const traceContext = this.tracer.startSpan('bedrock.invokeModel');
    const startTime = Date.now();

    try {
      // Extract model from command
      const modelId = command.modelId || command.input?.modelId || 'unknown';
      
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.system', 'bedrock');
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.request.model', modelId);
      this.tracer.setSpanAttribute(traceContext.spanId, 'ai.provider', 'bedrock');
      this.tracer.setSpanAttribute(traceContext.spanId, 'ai.model', modelId);

      const response = await originalFn(command);
      const latencyMs = Date.now() - startTime;
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.response.latency_ms', latencyMs);

      // Parse response body for token usage
      if (response.body) {
        const bodyText = await response.body.transformToString();
        const bodyJson = JSON.parse(bodyText);
        
        // Different Bedrock models have different response formats
        if (bodyJson.usage) {
          this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.usage.prompt_tokens', bodyJson.usage.input_tokens || 0);
          this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.usage.completion_tokens', bodyJson.usage.output_tokens || 0);
          this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.usage.total_tokens', (bodyJson.usage.input_tokens || 0) + (bodyJson.usage.output_tokens || 0));
          this.tracer.setSpanAttribute(traceContext.spanId, 'ai.prompt_tokens', bodyJson.usage.input_tokens || 0);
          this.tracer.setSpanAttribute(traceContext.spanId, 'ai.completion_tokens', bodyJson.usage.output_tokens || 0);
          this.tracer.setSpanAttribute(traceContext.spanId, 'ai.total_tokens', (bodyJson.usage.input_tokens || 0) + (bodyJson.usage.output_tokens || 0));
        }
      }

      this.tracer.setSpanStatus(traceContext.spanId, 0);
      this.tracer.endSpan(traceContext.spanId);

      return response;
    } catch (error) {
      this.tracer.setSpanStatus(traceContext.spanId, 2, error instanceof Error ? error.message : 'Unknown error');
      this.tracer.setSpanAttribute(traceContext.spanId, 'error', true);
      this.tracer.setSpanAttribute(traceContext.spanId, 'error.message', error instanceof Error ? error.message : String(error));
      this.tracer.endSpan(traceContext.spanId);
      throw error;
    }
  }

  /**
   * Wrap an Azure OpenAI client instance
   */
  wrapAzureOpenAI<T extends object>(client: T): T {
    const self = this;

    return new Proxy(client, {
      get(target: any, prop: string | symbol) {
        const original = target[prop];

        // Azure OpenAI uses the same structure as OpenAI
        if (prop === 'chat') {
          return new Proxy(original, {
            get(chatTarget: any, chatProp: string | symbol) {
              if (chatProp === 'completions') {
                return new Proxy(chatTarget[chatProp], {
                  get(completionsTarget: any, completionsProp: string | symbol) {
                    if (completionsProp === 'create') {
                      return async function(params: any) {
                        return self.instrumentAzureOpenAICall(
                          completionsTarget[completionsProp].bind(completionsTarget),
                          params
                        );
                      };
                    }
                    return completionsTarget[completionsProp];
                  }
                });
              }
              return chatTarget[chatProp];
            }
          });
        }

        return original;
      }
    });
  }

  private async instrumentAzureOpenAICall(originalFn: Function, params: any) {
    const traceContext = this.tracer.startSpan('azure_openai.chat.completions.create');
    const startTime = Date.now();

    try {
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.system', 'azure_openai');
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.request.model', params.model || 'unknown');
      this.tracer.setSpanAttribute(traceContext.spanId, 'ai.provider', 'azure_openai');
      this.tracer.setSpanAttribute(traceContext.spanId, 'ai.model', params.model || 'unknown');

      if (params.temperature !== undefined) {
        this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.request.temperature', params.temperature);
      }
      if (params.max_tokens !== undefined) {
        this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.request.max_tokens', params.max_tokens);
      }

      const response = await originalFn(params);
      const latencyMs = Date.now() - startTime;
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.response.latency_ms', latencyMs);

      if (response.usage) {
        this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.usage.prompt_tokens', response.usage.prompt_tokens || 0);
        this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.usage.completion_tokens', response.usage.completion_tokens || 0);
        this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.usage.total_tokens', response.usage.total_tokens || 0);
        this.tracer.setSpanAttribute(traceContext.spanId, 'ai.prompt_tokens', response.usage.prompt_tokens || 0);
        this.tracer.setSpanAttribute(traceContext.spanId, 'ai.completion_tokens', response.usage.completion_tokens || 0);
        this.tracer.setSpanAttribute(traceContext.spanId, 'ai.total_tokens', response.usage.total_tokens || 0);
      }

      this.tracer.setSpanStatus(traceContext.spanId, 0);
      this.tracer.endSpan(traceContext.spanId);

      return response;
    } catch (error) {
      this.tracer.setSpanStatus(traceContext.spanId, 2, error instanceof Error ? error.message : 'Unknown error');
      this.tracer.setSpanAttribute(traceContext.spanId, 'error', true);
      this.tracer.setSpanAttribute(traceContext.spanId, 'error.message', error instanceof Error ? error.message : String(error));
      this.tracer.endSpan(traceContext.spanId);
      throw error;
    }
  }

  /**
   * Wrap a Mistral client instance
   */
  wrapMistral<T extends object>(client: T): T {
    const self = this;

    return new Proxy(client, {
      get(target: any, prop: string | symbol) {
        const original = target[prop];

        // Intercept chat.complete or chat.stream
        if (prop === 'chat') {
          return new Proxy(original, {
            get(chatTarget: any, chatProp: string | symbol) {
              if (chatProp === 'complete' || chatProp === 'stream') {
                return async function(params: any) {
                  return self.instrumentMistralCall(
                    chatTarget[chatProp].bind(chatTarget),
                    params
                  );
                };
              }
              return chatTarget[chatProp];
            }
          });
        }

        return original;
      }
    });
  }

  private async instrumentMistralCall(originalFn: Function, params: any) {
    const traceContext = this.tracer.startSpan('mistral.chat.complete');
    const startTime = Date.now();

    try {
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.system', 'mistral');
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.request.model', params.model || 'unknown');
      this.tracer.setSpanAttribute(traceContext.spanId, 'ai.provider', 'mistral');
      this.tracer.setSpanAttribute(traceContext.spanId, 'ai.model', params.model || 'unknown');

      if (params.temperature !== undefined) {
        this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.request.temperature', params.temperature);
      }
      if (params.max_tokens !== undefined) {
        this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.request.max_tokens', params.max_tokens);
      }

      const response = await originalFn(params);
      const latencyMs = Date.now() - startTime;
      this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.response.latency_ms', latencyMs);

      // Mistral uses usage object similar to OpenAI
      if (response.usage) {
        this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.usage.prompt_tokens', response.usage.prompt_tokens || 0);
        this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.usage.completion_tokens', response.usage.completion_tokens || 0);
        this.tracer.setSpanAttribute(traceContext.spanId, 'gen_ai.usage.total_tokens', response.usage.total_tokens || 0);
        this.tracer.setSpanAttribute(traceContext.spanId, 'ai.prompt_tokens', response.usage.prompt_tokens || 0);
        this.tracer.setSpanAttribute(traceContext.spanId, 'ai.completion_tokens', response.usage.completion_tokens || 0);
        this.tracer.setSpanAttribute(traceContext.spanId, 'ai.total_tokens', response.usage.total_tokens || 0);
      }

      this.tracer.setSpanStatus(traceContext.spanId, 0);
      this.tracer.endSpan(traceContext.spanId);

      return response;
    } catch (error) {
      this.tracer.setSpanStatus(traceContext.spanId, 2, error instanceof Error ? error.message : 'Unknown error');
      this.tracer.setSpanAttribute(traceContext.spanId, 'error', true);
      this.tracer.setSpanAttribute(traceContext.spanId, 'error.message', error instanceof Error ? error.message : String(error));
      this.tracer.endSpan(traceContext.spanId);
      throw error;
    }
  }

  async flush() {
    await this.tracer.flush();
  }
}
