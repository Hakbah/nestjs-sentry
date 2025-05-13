import { Inject, Injectable, ConsoleLogger } from '@nestjs/common';
import { OnApplicationShutdown } from '@nestjs/common';
import { ClientOptions, Client } from '@sentry/core';
import * as Sentry from '@sentry/node';
import { Breadcrumb } from '@sentry/node';
import { SENTRY_MODULE_OPTIONS } from './sentry.constants';
import { SentryModuleOptions } from './sentry.interfaces';

@Injectable()
export class SentryService extends ConsoleLogger implements OnApplicationShutdown {
  private static serviceInstance: SentryService;
  constructor(
    @Inject(SENTRY_MODULE_OPTIONS)
    readonly opts?: SentryModuleOptions,
  ) {
    super();

    if (!(opts && opts.dsn)) {
      return;
    }

    const { debug, integrations = [], ...sentryOptions } = opts;

    Sentry.init({
      ...sentryOptions,
      integrations: [
        Sentry.onUncaughtExceptionIntegration({
          onFatalError: async (err: Error) => {
            if (err.name === 'SentryError') {
              console.log(err);
            } else {
              (
                Sentry.getClient<
                  Client<ClientOptions>
                >() as Client<ClientOptions>
              ).captureException(err);
              process.exit(1);
            }
          },
        }),
        Sentry.onUnhandledRejectionIntegration({ mode: 'warn' }),
        ...integrations,
      ],
    });
  }

  public static SentryServiceInstance(): SentryService {
    if (!SentryService.serviceInstance) {
      SentryService.serviceInstance = new SentryService();
    }
    return SentryService.serviceInstance;
  }

  log(message: string, context?: string, asBreadcrumb = true): void {
    try {
      super.log(message, context);
      asBreadcrumb
        ? Sentry.addBreadcrumb({
            category: context,
            level: 'log',
            message,
          })
        : Sentry.captureMessage(message, 'log');
    } catch (err) {}
  }

  error(message: string, trace?: string, context?: string): void {
    try {
      super.error(message, trace, context);
      Sentry.captureMessage(message, 'error');
    } catch (err) {}
  }

  warn(message: string, context?: string, asBreadcrumb = true): void {
    try {
      super.warn(message, context);
      asBreadcrumb
        ? Sentry.addBreadcrumb({
            category: context,
            level: 'warning',
            message,
          })
        : Sentry.captureMessage(message, 'warning');
    } catch (err) {}
  }

  debug(message: string, context?: string, asBreadcrumb = true): void {
    try {
      super.debug(message, context);
      asBreadcrumb
        ? Sentry.addBreadcrumb({
            category: context,
            level: 'debug',
            message,
          })
        : Sentry.captureMessage(message, 'debug');
    } catch (err) {}
  }

  verbose(message: string, context?: string, asBreadcrumb = true): void {
    try {
      super.verbose(message, context);
      asBreadcrumb
        ? Sentry.addBreadcrumb({
            category: context,
            level: 'info',
            message,
          })
        : Sentry.captureMessage(message, 'info');
    } catch (err) {}
  }

  instance() {
    return Sentry;
  }

  setSentryContext(name: string, context: Record<string, any>): void {
    Sentry.setContext(name, context);
  }

  setTag(name: string, value: string): void {
    Sentry.setTag(name, value);
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    Sentry.addBreadcrumb(breadcrumb);
  }

  withScope(callback: (scope: Sentry.Scope) => void): void {
    Sentry.withScope(callback);
  }

  async onApplicationShutdown(signal?: string) {
    if (this.opts?.close?.enabled === true) {
      await Sentry.close(this.opts?.close.timeout);
    }
  }
}
