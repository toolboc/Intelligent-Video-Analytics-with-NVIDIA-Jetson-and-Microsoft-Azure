import * as fse from 'fs-extra';
import { resolve } from 'path';

export function pjson(): any {
    let result = {};

    try {
        const packagePath = resolve(__dirname, '..', '..', 'package.json');
        result = fse.readJSONSync(packagePath);
    }
    catch (ex) {
        // eat exception
    }

    return result;
}
