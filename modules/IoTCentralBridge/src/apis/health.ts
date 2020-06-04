import { inject, RoutePlugin, route } from 'spryly';
import { Request, ResponseToolkit } from '@hapi/hapi';
import { HealthService } from '../services/health';
import {
    badRequest as boom_badRequest
} from '@hapi/boom';
import * as _get from 'lodash.get';

export class HealthRoutes extends RoutePlugin {
    @inject('health')
    private health: HealthService;

    @route({
        method: 'GET',
        path: '/health',
        options: {
            tags: ['health'],
            description: 'Health status',
            auth: false
        }
    })
    // @ts-ignore (request)
    public async getHealth(request: Request, h: ResponseToolkit) {
        try {
            const healthState = await this.health.checkHealthState();

            return h.response(`HealthState: ${healthState}`).code(200);
        }
        catch (ex) {
            throw boom_badRequest(ex.message);
        }
    }
}
