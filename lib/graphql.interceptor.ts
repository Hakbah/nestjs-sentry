import { ExecutionContext, Injectable } from "@nestjs/common";
import type { GqlContextType } from '@nestjs/graphql';

// Sentry imports
import { Scope } from '@sentry/node';
import { httpRequestToRequestData } from '@sentry/core';
import { SentryInterceptor } from ".";

let GqlExecutionContext: any;
try {
  ({ GqlExecutionContext } = require('@nestjs/graphql'));
} catch (e) {}


@Injectable()
export class GraphqlInterceptor extends SentryInterceptor {

    protected captureException(context: ExecutionContext, scope: Scope, exception: any) {
        if (context.getType<GqlContextType>() === 'graphql') {
            this.captureGraphqlException(scope, GqlExecutionContext.create(context), exception);
        } else {
            super.captureException(context, scope, exception);
        }
    }

    private captureGraphqlException(scope: Scope, gqlContext: typeof GqlExecutionContext, exception: any): void {
        const info = gqlContext.getInfo()
        const context = gqlContext.getContext()

        scope.setExtra('type', info.parentType.name)

        if (context.req) {
            // req within graphql context needs modification in
            const data = httpRequestToRequestData(context.req);

            scope.setExtra('req', data);
        }

        this.client.instance().captureException(exception);
    }
}