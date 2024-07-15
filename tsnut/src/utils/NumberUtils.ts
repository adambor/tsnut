
export function isInteger(num: number): boolean {
    return num!=null && !isNaN(num) && isFinite(num) && Number.isSafeInteger(num);
}

export function isIntegerOrNull(num: number): boolean {
    if(num==null) return true;
    return isInteger(num);
}