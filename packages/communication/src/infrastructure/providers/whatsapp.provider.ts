import { logger } from '@coaching-os/observability';

export interface WhatsAppMessage {
  recipientPhone: string;
  templateName: string;
  templateVariables?: Record<string, unknown> | null;
}

export interface DeliveryResult {
  success: boolean;
  providerMessageId?: string | null;
  error?: string | null;
  isRetryable: boolean;
}

export interface WhatsAppProvider {
  send(message: WhatsAppMessage): Promise<DeliveryResult>;
  isConfigured(): boolean;
}

// ============================================================================
// Error Taxonomy for WhatsApp Delivery
// ============================================================================

export class WhatsAppProviderError extends Error {
  constructor(
    message: string,
    public readonly isRetryable: boolean = true,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'WhatsAppProviderError';
  }
}

// ============================================================================
// 1. Mock / Development WhatsApp Provider
// ============================================================================

export class MockWhatsAppProvider implements WhatsAppProvider {
  private shouldFailNext = false;
  private failIsRetryable = true;
  public sentMessages: WhatsAppMessage[] = [];

  constructor(private readonly configured = true) {}

  public isConfigured(): boolean {
    return this.configured;
  }

  public setNextFailure(fail: boolean, isRetryable = true): void {
    this.shouldFailNext = fail;
    this.failIsRetryable = isRetryable;
  }

  public async send(message: WhatsAppMessage): Promise<DeliveryResult> {
    if (!this.configured) {
      return {
        success: false,
        error: 'WhatsApp provider is not configured in server environment',
        isRetryable: false,
      };
    }

    if (this.shouldFailNext) {
      this.shouldFailNext = false;
      return {
        success: false,
        error: 'Simulated WhatsApp provider delivery failure',
        isRetryable: this.failIsRetryable,
      };
    }

    this.sentMessages.push(message);
    return {
      success: true,
      providerMessageId: `wamid.mock.${Date.now()}.${Math.floor(Math.random() * 100000)}`,
      isRetryable: false,
    };
  }
}

// ============================================================================
// 2. Meta WhatsApp Cloud API HTTP Adapter
// ============================================================================

export class MetaWhatsAppProvider implements WhatsAppProvider {
  constructor(
    private readonly apiToken?: string,
    private readonly phoneNumberId?: string,
  ) {}

  public isConfigured(): boolean {
    return (
      Boolean(this.apiToken) &&
      Boolean(this.phoneNumberId) &&
      this.apiToken!.trim() !== '' &&
      this.phoneNumberId!.trim() !== ''
    );
  }

  public async send(message: WhatsAppMessage): Promise<DeliveryResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Meta WhatsApp credentials missing or unconfigured',
        isRetryable: false,
      };
    }

    const cleanPhone = message.recipientPhone.replace(/[^\d+]/g, '');
    const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;

    const components = message.templateVariables
      ? [
          {
            type: 'body',
            parameters: Object.entries(message.templateVariables).map(([_, val]) => ({
              type: 'text',
              text: String(val),
            })),
          },
        ]
      : [];

    const body = {
      messaging_product: 'whatsapp',
      to: cleanPhone,
      type: 'template',
      template: {
        name: message.templateName,
        language: { code: 'en_US' },
        components,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data: any = await response.json();
        const msgId = data?.messages?.[0]?.id || `wamid.${Date.now()}`;
        return {
          success: true,
          providerMessageId: msgId,
          isRetryable: false,
        };
      }

      const errData: any = await response.json().catch(() => null);
      const statusCode = response.status;

      const isRetryable = statusCode === 429 || statusCode >= 500;
      const errorMsg = errData?.error?.message || `HTTP ${statusCode} ${response.statusText}`;

      return {
        success: false,
        error: errorMsg,
        isRetryable,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isTimeout = err?.name === 'AbortError';
      return {
        success: false,
        error: isTimeout ? 'Meta API request timed out (5000ms)' : err?.message || 'Network request failed',
        isRetryable: true,
      };
    }
  }
}
