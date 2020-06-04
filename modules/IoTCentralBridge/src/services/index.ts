
import { HealthService } from './health';
import { ConfigService } from './config';
import { LoggingService } from './logging';
import { StorageService } from './storage';
import { StateService } from './state';
import { ModuleService } from './module';
import { DeviceService } from './device';
import { IoTCentralService } from './iotCentral';

export default [
    HealthService,
    ConfigService,
    LoggingService,
    StorageService,
    StateService,
    ModuleService,
    DeviceService,
    IoTCentralService
];
