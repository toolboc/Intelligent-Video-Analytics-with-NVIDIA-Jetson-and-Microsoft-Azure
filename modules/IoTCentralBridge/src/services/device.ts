import { inject, service } from 'spryly';
import { Server } from '@hapi/hapi';
import { ConfigService } from './config';
import { LoggingService } from './logging';
import {
    IoTCentralService,
    ModuleInfoFieldIds,
    ModuleState,
    PipelineState
} from './iotCentral';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as request from 'request';
import * as _get from 'lodash.get';
import { bind } from '../utils';

const defaultDockerApiVersion: string = '1.37';
const defaultDockerSocket: string = '/var/run/docker.sock';
const defaultDeepStreamModuleName: string = 'deepstream';

@service('device')
export class DeviceService {
    @inject('$server')
    private server: Server;

    @inject('config')
    private config: ConfigService;

    @inject('logger')
    private logger: LoggingService;

    @inject('iotCentral')
    private iotCentral: IoTCentralService;

    private dockerApiVersion: string = defaultDockerApiVersion;
    private dockerSocket: string = defaultDockerSocket;
    private deepStreamModuleName: string = defaultDeepStreamModuleName;

    public async init(): Promise<void> {
        this.logger.log(['DeviceService', 'info'], 'initialize');

        this.server.method({ name: 'device.restartDeepStream', method: this.restartDeepStream });
        this.server.method({ name: 'device.restartDevice', method: this.restartDevice });
        this.server.method({ name: 'device.restartDockerImage', method: this.restartDockerImage });

        this.dockerApiVersion = this.config.get('dockerApiVersion') || defaultDockerApiVersion;
        this.dockerSocket = this.config.get('dockerSocket') || defaultDockerSocket;
        this.deepStreamModuleName = this.config.get('deepStreamModuleName') || defaultDeepStreamModuleName;
    }

    @bind
    public async restartDeepStream(): Promise<void> {
        await this.iotCentral.sendMeasurement({
            [ModuleInfoFieldIds.Event.VideoStreamProcessingStopped]: 'NVIDIA DeepStream',
            [ModuleInfoFieldIds.State.ModuleState]: ModuleState.Inactive
        });

        await this.iotCentral.setPipelineState(PipelineState.Inactive);

        return this.restartDockerImage();
    }

    @bind
    public async restartDevice(timeout: number, reason: string): Promise<void> {
        this.logger.log(['DeviceService', 'info'], `Module restart requested...`);
        if (_get(process.env, 'LOCAL_DEBUG') === '1') {
            return;
        }

        try {
            await this.iotCentral.sendMeasurement({
                [ModuleInfoFieldIds.Event.DeviceRestart]: reason,
                [ModuleInfoFieldIds.Event.VideoStreamProcessingStopped]: 'NVIDIA DeepStream',
                [ModuleInfoFieldIds.State.ModuleState]: ModuleState.Inactive
            });

            await this.iotCentral.setPipelineState(PipelineState.Inactive);

            if (timeout > 0) {
                await new Promise((resolve) => {
                    setTimeout(() => {
                        return resolve();
                    }, 1000 * timeout);
                });
            }

            await promisify(exec)(`reboot --reboot`);
        }
        catch (ex) {
            this.logger.log(['DeviceService', 'error'], `Failed to auto-restart device - will exit container now: ${ex.message}`);
        }

        // let Docker restart our container
        process.exit(1);
    }

    @bind
    private async restartDockerImage(containerName?: string): Promise<any> {
        this.logger.log(['DeviceService', 'info'], `Restarting DeepStream container...`);

        const options = {
            method: 'POST',
            socketPath: this.dockerSocket,
            uri: `http://v${this.dockerApiVersion}/containers/${containerName || this.deepStreamModuleName}/restart`,
            json: true
        };

        return this.dockerRequest(options);
    }

    private dockerRequest(options: any): Promise<any> {
        return new Promise((resolve, reject) => {
            request(options, (requestError, response, body) => {
                if (requestError) {
                    this.logger.log(['DeviceService', 'error', 'dockerRequest'], `dockerRequest error: ${requestError.message}`);
                    return reject(requestError);
                }

                if (response.statusCode < 200 || response.statusCode > 299) {
                    this.logger.log(['DeviceService', 'error', 'dockerRequest'], `Response status code = ${response.statusCode}`);

                    const errorMessage = body.message || body || 'An error occurred';
                    return reject(new Error(`Error statusCode: ${response.statusCode}, ${errorMessage}`));
                }

                return resolve(body);
            });
        });
    }
}
