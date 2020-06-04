import { inject, RoutePlugin, route } from 'spryly';
import { Request, ResponseToolkit } from '@hapi/hapi';
import { ModuleService } from '../services/module';
import {
    badRequest as boom_badRequest
} from '@hapi/boom';
import * as _get from 'lodash.get';

export class ModuleRoutes extends RoutePlugin {
    @inject('module')
    private module: ModuleService;

    // Sample route capability provided by this RESTful service
    // Documentation:
    // https://hapi.dev/api/?v=18.4.0

    @route({
        method: 'POST',
        path: '/api/v1/module/sample1',
        options: {
            tags: ['module'],
            description: 'route1 example'
        }
    })
    // @ts-ignore (request)
    public async postSample1(request: Request, h: ResponseToolkit) {
        try {
            const testparam = _get(request, 'payload.testparam');

            const result = await this.module.sample1(testparam);

            return h.response(result).code(201);
        }
        catch (ex) {
            throw boom_badRequest(ex.message);
        }
    }
}
