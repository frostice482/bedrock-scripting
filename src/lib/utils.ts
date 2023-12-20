/**
 * `Array.findIndex` but instead of returning `-1` if none found returns 0 instead
 */
export function findIndexZero<T extends Array<any> | ReadonlyArray<any>>(arr: T, predicate: (value: T[number], index: number, obj: T) => unknown, thisArg?: any) {
    const o = arr.findIndex(predicate as any, thisArg)
    return o === -1 ? 0 : o
}