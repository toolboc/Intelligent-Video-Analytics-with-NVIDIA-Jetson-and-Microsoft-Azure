import { manifest } from './manifest';
import { compose, ComposeOptions } from 'spryly';
import {
    type as osType,
    cpus as osCpus,
    freemem as osFreeMem,
    totalmem as osTotalMem
} from 'os';
import { forget } from './utils';

const composeOptions: ComposeOptions = {
    relativeTo: __dirname,
    logger: (t, m) => {
        const tags = ((t && Array.isArray(t)) ? `[opt,${t.join(',')}]` : '[opt]');

        // tslint:disable-next-line:no-console
        console.log(`[${new Date().toTimeString()}] ${tags} ${m}`);
    }
};

// process.on('unhandledRejection', (e: any) => {
//     // tslint:disable:no-console
//     console.log(['startup', 'error'], `Excepction on startup... ${e.message}`);
//     console.log(['startup', 'error'], e.stack);
//     // tslint:enable:no-console
// });

async function start() {
    try {
        const server = await compose(manifest(), composeOptions);

        server.log(['startup', 'info'], `🚀 Starting HAPI server instance...`);

        await server.start();

        server.log(['startup', 'info'], `✅ Core server started`);
        server.log(['startup', 'info'], `🌎 ${server.info.uri}`);
        server.log(['startup', 'info'], ` > Hapi version: ${server.version}`);
        server.log(['startup', 'info'], ` > Plugins: [${Object.keys(server.registrations).join(', ')}]`);
        server.log(['startup', 'info'], ` > Machine: ${osType()}, ${osCpus().length} core, ` +
            `freemem=${(osFreeMem() / 1024 / 1024).toFixed(0)}mb, totalmem=${(osTotalMem() / 1024 / 1024).toFixed(0)}mb`);

        server.log(['startup', 'info'], `👨‍💻 Starting IoT Central provisioning`);
        await (server.methods.iotCentral as any).connectToIoTCentral();
        server.log(['startup', 'info'], `👩‍💻 Finished IoT Central provisioning`);

        server.log(['startup', 'info'], `📷 Starting runtime initialzation`);
        await (server.methods.module as any).startService();
        server.log(['startup', 'info'], `📸 Finished runtime initialization`);
    }
    catch (error) {
        // tslint:disable-next-line:no-console
        console.log(`['startup', 'error'], 👹 Error starting server: ${error.message}`);
    }
}

forget(start);
