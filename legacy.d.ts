/** Compatibility mapping from persian 1.0.1; does not modify String.prototype. */
declare function replaceFromMap(input: string | String, map: { [pattern: string]: any }): string;
export = replaceFromMap;
