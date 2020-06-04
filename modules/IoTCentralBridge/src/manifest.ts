import { ComposeManifest } from 'spryly';
import { resolve as pathResolve } from 'path';

const DefaultPort = 9014;
const PORT = process.env.PORT || process.env.port || process.env.PORT0 || process.env.port0 || DefaultPort;

export function manifest(config?: any): ComposeManifest {
    return {
        server: {
            port: PORT,
            app: {
                rootDirectory: pathResolve(__dirname, '..'),
                storageRootDirectory: process.env.DATAMISC_ROOT || '/data/misc/storage',
                slogan: 'NVIDIA Jetson Nano local service'
            }
        },
        services: [
            './services'
        ],
        plugins: [
            ...[
                {
                    plugin: '@hapi/good',
                    options: generateLoggingOptions(config)
                }
            ],
            // ...[
            //     {
            //         plugin: './plugins'
            //     }
            // ],
            ...[
                {
                    plugin: './apis'
                }
            ]
        ]
    };
}

// @ts-ignore (config)
function generateLoggingOptions(config: any) {
    return {
        ops: {
            interval: 1000
        },
        reporters: {
            console: [
                {
                    module: '@hapi/good-squeeze',
                    name: 'Squeeze',
                    args: [
                        {
                            log: '*',
                            response: '*',
                            request: '*',
                            error: '*'
                        }
                    ]
                },
                {
                    module: '@hapi/good-console',
                    args: [
                        {
                            format: '[[]hh:mm:ss [GMT]ZZ[]]',
                            utc: false
                        }
                    ]
                },
                'stdout'
            ]
        }
    };
}
