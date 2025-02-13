const isDebug = true; // 或者从外部获取（如通过 query 参数）
export function log(message) {
    if (isDebug) {
        console.log(message);
    }
}
