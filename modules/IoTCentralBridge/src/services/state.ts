import { service, inject } from 'spryly';
import { LoggingService } from './logging';
import { ConfigService } from './config';
import { StorageService } from './storage';
import * as _get from 'lodash.get';
import { v4 as uuidV4 } from 'uuid';

@service('state')
export class StateService {
    @inject('logger')
    private logger: LoggingService;

    @inject('config')
    private config: ConfigService;

    @inject('storage')
    private storage: StorageService;

    private stateInternal: any;
    private stateFile;

    public get system(): any {
        return this.stateInternal.system || {};
    }

    public get iotCentral(): any {
        return this.stateInternal.iotCentral || {};
    }

    public async init() {
        this.logger.log(['StateService', 'info'], 'initialize');

        this.stateFile = this.config.get('systemName') ? `${this.config.get('systemName')}-state` : 'state';

        await this.loadState();

        if (!this.stateInternal.system.systemName) {
            this.stateInternal.system.systemName = uuidV4();
        }

        if (!this.stateInternal.system.systemId) {
            this.stateInternal.system.systemId = uuidV4();
        }

        await this.flushState();
    }

    public async setIotCentralProperty(property: string, value: any) {
        this.stateInternal.iotCentral[property] = value;

        await this.flushState();
    }

    private async loadState() {
        try {
            this.stateInternal = await this.storage.get(this.stateFile);
            if (!this.stateInternal) {
                this.stateInternal = {
                    system: {
                        systemName: '',
                        systemId: ''
                    }
                };
            }

            await this.flushState();
        }
        catch (ex) {
            this.logger.log(['flushState', 'error'], ex.message);

            // eat exeptions
        }
    }

    private async flushState() {
        try {
            await this.storage.flush(this.stateFile, this.stateInternal as any);
        }
        catch (ex) {
            this.logger.log(['flushState', 'error'], ex.message);

            // eat exeptions
        }
    }
}
