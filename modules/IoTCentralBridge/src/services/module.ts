import { service, inject } from 'spryly';
import { Server } from '@hapi/hapi';
import { ConfigService } from './config';
import { LoggingService } from './logging';
import {
    ModuleInfoFieldIds,
    ModuleState,
    PipelineState,
    AIModelProvider,
    IoTCentralService
} from './iotCentral';
import { HealthState } from './health';
import * as _get from 'lodash.get';
import * as _random from 'lodash.random';
import * as request from 'request';
import * as fse from 'fs-extra';
import {
    resolve as pathResolve,
    parse as pathParse
} from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { bind } from '../utils';

const defaultStorageFolderPath: string = '/data/misc/storage';
const defaultResNetConfigFolderPath: string = '/data/misc/storage/ResNetSetup/configs';
const defaultONNXModelFolderPath: string = '/data/misc/storage/ONNXSetup/detector';
const defaultONNXConfigFolderPath: string = '/data/misc/storage/ONNXSetup/configs';
const defaultUnzipCommand: string = 'unzip -d ###UNZIPDIR ###TARGET';

const DSConfigInputMap = {
    wpVideoStreamInput1: 'SOURCE0',
    wpVideoStreamInput2: 'SOURCE1',
    wpVideoStreamInput3: 'SOURCE2',
    wpVideoStreamInput4: 'SOURCE3'
};

const MsgConvConfigMap = {
    wpVideoStreamInput1: 'SENSOR0',
    wpVideoStreamInput2: 'SENSOR1',
    wpVideoStreamInput3: 'SENSOR2',
    wpVideoStreamInput4: 'SENSOR3'
};

const defaultRowMap = '1:1:1:2:2:4:4:4:4';
const defaultColumnMap = '1:1:2:2:2:2:2:2:2';
const defaultBatchSizeMap = '1:1:2:4:4:8:8:8:8';
const defaultDisplayWidthMap = '1280:1280:1280:1280:1280:1280:1280:1280:1280';
const defaultDisplayHeightMap = '720:720:720:720:720:720:720:720:720';

@service('module')
export class ModuleService {
    @inject('$server')
    private server: Server;

    @inject('config')
    private config: ConfigService;

    @inject('logger')
    private logger: LoggingService;

    @inject('iotCentral')
    private iotCentral: IoTCentralService;

    private displayRowMap = defaultRowMap;
    private displayColumnMap = defaultColumnMap;
    private batchSizeMap = defaultBatchSizeMap;
    private displayWidthMap = defaultDisplayWidthMap;
    private displayHeightMap = defaultDisplayHeightMap;
    private storageFolderPath: string = defaultStorageFolderPath;
    private resNetConfigFolderPath = defaultResNetConfigFolderPath;
    private onnxModelFolderPath = defaultONNXModelFolderPath;
    private onnxConfigFolderPath = defaultONNXConfigFolderPath;
    private unzipCommand: string = defaultUnzipCommand;

    public async init(): Promise<void> {
        this.logger.log(['ModuleService', 'info'], 'initialize');

        this.server.method({ name: 'module.startService', method: this.startService });
        this.server.method({ name: 'module.updateDSConfiguration', method: this.updateDSConfiguration });

        this.displayRowMap = (this.config.get('DisplayRowMap') || defaultRowMap).split(':');
        this.displayColumnMap = (this.config.get('DisplayColumnMap') || defaultColumnMap).split(':');
        this.batchSizeMap = (this.config.get('BatchSizeMap') || defaultBatchSizeMap).split(':');
        this.displayWidthMap = (this.config.get('DisplayWidthMap') || defaultDisplayWidthMap).split(':');
        this.displayHeightMap = (this.config.get('DisplayHeightMap') || defaultDisplayHeightMap).split(':');
        this.storageFolderPath = (this.server.settings.app as any).storageRootDirectory;
        this.resNetConfigFolderPath = pathResolve(this.storageFolderPath, 'ResNetSetup', 'configs');
        this.onnxModelFolderPath = pathResolve(this.storageFolderPath, 'ONNXSetup', 'detector');
        this.onnxConfigFolderPath = pathResolve(this.storageFolderPath, 'ONNXSetup', 'configs');
        this.unzipCommand = this.config.get('unzipCommand') || defaultUnzipCommand;
    }

    // @ts-ignore (testparam)
    public async sample1(testparam: any): Promise<void> {
        return;
    }

    @bind
    public async startService(): Promise<void> {
        this.logger.log(['ModuleService', 'info'], `Starting module service...`);

        await this.iotCentral.sendMeasurement({
            [ModuleInfoFieldIds.State.ModuleState]: ModuleState.Active,
            [ModuleInfoFieldIds.Event.VideoStreamProcessingStarted]: 'NVIDIA DeepStream'
        });
    }

    public async getHealth(): Promise<number> {
        const iotCentralHealth = await this.iotCentral.getHealth();

        if (iotCentralHealth < HealthState.Good) {

            this.logger.log(['ModuleService', 'info'], `Health check iot:${iotCentralHealth}`);

            return HealthState.Critical;
        }

        await this.iotCentral.sendMeasurement({
            [ModuleInfoFieldIds.Telemetry.SystemHeartbeat]: iotCentralHealth
        });

        return HealthState.Good;
    }

    public async saveUrlModelPackage(videoModelUrl: string): Promise<string> {
        let result = '';

        try {
            const fileParse = pathParse(videoModelUrl);
            const fileName = (_get(fileParse, 'base') || '').split('?')[0];
            let receivedBytes = 0;
            let progressChunk = 0;
            let progressTotal = 0;

            if (!fileName) {
                return '';
            }

            this.logger.log(['ModuleService', 'info'], `Downloading model package: ${fileName}`);

            result = await new Promise((resolve, reject) => {
                request
                    .get(videoModelUrl)
                    .on('error', (error) => {
                        this.logger.log(['ModuleService', 'error'], `Error downloading model package: ${error.message}`);
                        return reject(error);
                    })
                    .on('response', (data) => {
                        const totalBytes = parseInt(data.headers['content-length'], 10) || 1;
                        progressChunk = Math.floor(totalBytes / 10);

                        this.logger.log(['ModuleService', 'info'], `Downloading model package - total bytes: ${totalBytes}`);
                    })
                    .on('data', (chunk) => {
                        receivedBytes += chunk.length;

                        if (receivedBytes > (progressTotal + progressChunk)) {
                            progressTotal += progressChunk;

                            this.logger.log(['ModuleService', 'info'], `Downloading video model package - received bytes: ${receivedBytes}`);
                        }
                    })
                    .on('end', () => {
                        this.logger.log(['ModuleService', 'info'], `Finished downloading video model package: ${fileName}`);
                        return resolve(fileName);
                    })
                    .pipe(fse.createWriteStream(pathResolve(this.storageFolderPath, fileName)))
                    .on('error', (error) => {
                        return reject(error);
                    })
                    .on('close', () => {
                        return resolve(fileName);
                    });
            });
        }
        catch (ex) {
            this.logger.log(['ModuleService', 'error'], `Error downloading model package: ${ex.message}`);
            result = '';
        }

        return result;
    }

    @bind
    public async updateDSConfiguration() {
        await this.iotCentral.sendMeasurement({
            [ModuleInfoFieldIds.State.ModuleState]: ModuleState.Inactive
        });

        this.logger.log(['ModuleService', 'info'], `updateDSConfiguration:\n${JSON.stringify(this.iotCentral.detectionSettings, null, 4)}`);

        if (this.iotCentral.detectionSettings.wpDemoMode === true) {
            await this.saveDSResNetDemoConfiguration();
        }
        else if (this.iotCentral.detectionSettings.wpAIModelProvider === AIModelProvider.DeepStream) {
            await this.saveDSResNetConfiguration();
        }
        else if (this.iotCentral.detectionSettings.wpAIModelProvider === AIModelProvider.CustomVision) {
            await this.saveCustomVisionConfiguration();
        }
        else {
            this.logger.log(['ModuleService', 'warning'], `Updating DS configuration: nothing to set so skipping...`);
        }

        await this.iotCentral.sendMeasurement({
            [ModuleInfoFieldIds.State.ModuleState]: ModuleState.Active
        });
    }

    private async changeVideoModel(videoModelUrl: string): Promise<boolean> {
        let status = true;

        this.logger.log(['ModuleService', 'info'], `Changing video model...`);

        try {
            const fileName = await this.saveUrlModelPackage(videoModelUrl);
            if (fileName) {
                status = await this.extractAndVerifyModelFiles(fileName);

                if (status === true) {
                    status = await this.switchVisionModel(fileName);
                }
            }
        }
        catch (ex) {
            this.logger.log(['ModuleService', 'info'], `Error while changing video model: ${ex.message}`);
            status = false;
        }

        return status;
    }

    private async extractAndVerifyModelFiles(fileName: string): Promise<boolean> {
        const sourceFileName = fileName;
        const destFileName = sourceFileName;
        const destFilePath = pathResolve(this.storageFolderPath, destFileName);
        const destUnzipDir = destFilePath.slice(0, -4);

        try {
            if (fse.statSync(destFilePath).size <= 0) {
                this.logger.log(['ModuleService', 'error'], `Empty video model package detected - skipping`);
                return false;
            }

            this.logger.log(['ModuleService', 'info'], `Removing any existing target unzip dir: ${destUnzipDir}`);
            await promisify(exec)(`rm -rf ${destUnzipDir}`);

            const unzipCommand = this.unzipCommand.replace('###UNZIPDIR', destUnzipDir).replace('###TARGET', destFilePath);
            const { stdout } = await promisify(exec)(unzipCommand);
            this.logger.log(['ModuleService', 'info'], `Extracted files: ${stdout}`);

            this.logger.log(['ModuleService', 'info'], `Removing zip package: ${destFilePath}`);
            await promisify(exec)(`rm -f ${destFilePath}`);

            this.logger.log(['ModuleService', 'info'], `Done extracting in: ${destUnzipDir}`);
            return this.ensureModelFilesExist(destUnzipDir);
        }
        catch (ex) {
            this.logger.log(['ModuleService', 'error'], `Error extracting files: ${ex.message}`);
        }

        return false;
    }

    private async ensureModelFilesExist(modelFolder: string): Promise<boolean> {
        this.logger.log(['ModuleService', 'info'], `Ensure model files exist in: ${modelFolder}`);

        try {
            const modelFiles = await fse.readdir(modelFolder);
            if (modelFiles
                && modelFiles.find(file => file === 'model.onnx')
                && modelFiles.find(file => file === 'labels.txt')) {
                return true;
            }
        }
        catch (ex) {
            this.logger.log(['ModuleService', 'error'], `Error enumerating model files: ${ex.message}`);
        }

        return false;
    }

    private async switchVisionModel(fileName: any): Promise<boolean> {
        const sourceFileName = fileName;
        const destFileName = sourceFileName;
        const destFilePath = pathResolve(this.storageFolderPath, destFileName);
        const destUnzipDir = destFilePath.slice(0, -4);

        try {
            this.logger.log(['ModuleService', 'info'], `Copying new model files from: ${destUnzipDir}`);
            await promisify(exec)(`rm -f ${this.onnxModelFolderPath}/*.engine`);
            await promisify(exec)(`cp ${pathResolve(destUnzipDir, 'model.onnx')} ${this.onnxModelFolderPath}`);
            await promisify(exec)(`cp ${pathResolve(destUnzipDir, 'labels.txt')} ${this.onnxModelFolderPath}`);

            this.logger.log(['ModuleService', 'info'], `Removing unzipped model folder: ${destUnzipDir}`);
            await promisify(exec)(`rm -rf ${destUnzipDir}`);

            return true;
        }
        catch (ex) {
            this.logger.log(['ModuleService', 'error'], `Error extracting files: ${ex.message}`);
        }

        return false;
    }

    private async saveDSResNetDemoConfiguration() {
        this.logger.log(['ModuleService', 'info'], `Setting carsDemo configuration`);
        await promisify(exec)(`cp ${pathResolve(this.resNetConfigFolderPath, 'carsConfig.txt')} ${pathResolve(this.storageFolderPath, 'DSConfig.txt')}`);

        await this.iotCentral.setPipelineState(PipelineState.Active);
    }

    private getActiveStreams(): number {
        let activeStreams: number = 0;

        for (const key in this.iotCentral.videoStreamInputSettings) {
            if (!this.iotCentral.videoStreamInputSettings.hasOwnProperty(key)) {
                continue;
            }

            const input = this.iotCentral.videoStreamInputSettings[key];
            if (_get(input, 'cameraId') && _get(input, 'videoStreamUrl')) {
                activeStreams++;
            }
        }

        return activeStreams;
    }

    private computeDSConfiguration(activeStreams: number): string[] {
        const rows = this.displayRowMap[activeStreams];
        const columns = this.displayColumnMap[activeStreams];

        const sedCommands = [`sed "`];
        sedCommands.push(`s/###DISPLAY_ROWS/${rows}/g;`);
        sedCommands.push(`s/###DISPLAY_COLUMNS/${columns}/g;`);
        sedCommands.push(`s/###DISPLAY_WIDTH/${this.displayWidthMap[activeStreams]}/g;`);
        sedCommands.push(`s/###DISPLAY_HEIGHT/${this.displayHeightMap[activeStreams]}/g;`);

        for (const key in this.iotCentral.videoStreamInputSettings) {
            if (!this.iotCentral.videoStreamInputSettings.hasOwnProperty(key)) {
                continue;
            }

            const configSource = DSConfigInputMap[key];
            const input = this.iotCentral.videoStreamInputSettings[key];
            const active = (_get(input, 'cameraId') && _get(input, 'videoStreamUrl')) ? '1' : '0';
            const videoStreamUrl = (_get(input, 'videoStreamUrl') || '').replace(/\//g, '\\/');
            const videoStreamType = videoStreamUrl.startsWith('rtsp') ? '4' : '3';
            sedCommands.push(`s/###${configSource}_ENABLE/${active}/g;`);
            sedCommands.push(`s/###${configSource}_TYPE/${videoStreamType}/g;`);
            sedCommands.push(`s/###${configSource}_VIDEOSTREAM/${videoStreamUrl}/g;`);
        }

        return sedCommands;
    }

    private async saveDSResNetConfiguration(): Promise<boolean> {
        let status = false;

        try {
            const activeStreams = this.getActiveStreams();
            const sedCommands = this.computeDSConfiguration(activeStreams);

            sedCommands.push(`s/###BATCH_SIZE/${this.batchSizeMap[activeStreams]}/g;`);
            sedCommands.push(`" ${pathResolve(this.resNetConfigFolderPath, 'DSConfig_Template.txt')} > ${pathResolve(this.storageFolderPath, 'DSConfig.txt')}`);

            this.logger.log(['ModuleService', 'info'], `Executing sed command: ${sedCommands.join('')}`);

            await promisify(exec)(sedCommands.join(''));

            await this.iotCentral.setPipelineState(activeStreams > 0 ? PipelineState.Active : PipelineState.Inactive);

            await this.saveDSMsgConvConfiguration(this.resNetConfigFolderPath);

            status = true;
        }
        catch (ex) {
            this.logger.log(['ModuleService', 'error'], `Exception while updating DSConfig.txt: ${ex.message}`);
        }

        return status;
    }

    private async saveCustomVisionConfiguration(): Promise<boolean> {
        let status = false;

        try {
            const customVisionModelUrl = this.iotCentral.detectionSettings.wpCustomVisionModelUrl;

            if (!customVisionModelUrl) {
                this.logger.log(['ModuleService', 'warning'], `No Custom Vision model url - skipping...`);
                return false;
            }

            await this.iotCentral.sendMeasurement({
                [ModuleInfoFieldIds.Event.ChangeVideoModel]: customVisionModelUrl
            });

            await this.changeVideoModel(customVisionModelUrl);

            // TODO:
            // Rewrite the labels.txt file because it can be packaged with Windows-style line endings ('/r/n')
            // from the Custom Vision service. DeepStream interprets these explicitly and the detection class
            // names include a '/r' on the end.
            const labelData = (fse.readFileSync(pathResolve(this.onnxModelFolderPath, 'labels.txt'), 'utf8') || '').replace(/\r\n|\r|\n/g, '\n');
            fse.writeFileSync(pathResolve(this.onnxModelFolderPath, 'labels.txt'), labelData);

            const numClasses = labelData.split('\n').length;
            this.logger.log(['ModuleService', 'info'], `Number of class labels detected: ${numClasses}`);

            const sedConfigInferCommands = [`sed "`];
            sedConfigInferCommands.push(`s/###CLASSES_COUNT/${numClasses}/g;`);
            sedConfigInferCommands.push(`" ${pathResolve(this.onnxConfigFolderPath, 'config_infer_onnx_template.txt')} > ${pathResolve(this.onnxConfigFolderPath, 'config_infer_onnx.txt')}`);

            this.logger.log(['ModuleService', 'info'], `Executing sed command: ${sedConfigInferCommands.join('')}`);

            await promisify(exec)(sedConfigInferCommands.join(''));

            const activeStreams = this.getActiveStreams();
            const sedCommands = this.computeDSConfiguration(activeStreams);

            sedCommands.push(`" ${pathResolve(this.onnxConfigFolderPath, 'onnxConfig_template.txt')} > ${pathResolve(this.storageFolderPath, 'DSConfig.txt')}`);

            this.logger.log(['ModuleService', 'info'], `Executing sed command: ${sedCommands.join('')}`);

            await promisify(exec)(sedCommands.join(''));

            await this.iotCentral.setPipelineState(activeStreams > 0 ? PipelineState.Active : PipelineState.Inactive);

            await this.saveDSMsgConvConfiguration(this.onnxConfigFolderPath);

            status = true;
        }
        catch (ex) {
            this.logger.log(['ModuleService', 'error'], `Exception while updating DSConfig.txt: ${ex.message}`);
        }

        return status;
    }

    private async saveDSMsgConvConfiguration(configFilePath: string): Promise<boolean> {
        let status = false;

        try {
            const sedCommands = [`sed "`];

            for (const key in this.iotCentral.videoStreamInputSettings) {
                if (!this.iotCentral.videoStreamInputSettings.hasOwnProperty(key)) {
                    continue;
                }

                const input = this.iotCentral.videoStreamInputSettings[key];
                const cameraId = (_get(input, 'cameraId') || 'NOT_SET').replace(/\ /g, '_');
                sedCommands.push(`s/###${MsgConvConfigMap[key]}_ID/${cameraId}/g;`);
            }

            sedCommands.push(`" ${pathResolve(configFilePath, 'msgconv_config_template.txt')} > ${pathResolve(configFilePath, 'msgconv_config.txt')}`);

            this.logger.log(['ModuleService', 'info'], `Executing sed command: '${sedCommands.join('')}'`);

            await promisify(exec)(sedCommands.join(''));
            status = true;
        }
        catch (ex) {
            this.logger.log(['ModuleService', 'error'], `Exception while updating msgconv_config.txt: ${ex.message}`);
        }

        return status;
    }
}
