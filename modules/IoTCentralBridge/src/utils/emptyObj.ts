export function emptyObj(object: any) {
    if (!object) {
        return false;
    }

    for (const key in object) {
        if (object.hasOwnProperty(key)) {
            return false;
        }
    }

    return true;
}
