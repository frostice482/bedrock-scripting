interface JSON {
    parse(text: Buffer, reviver?: (this: any, key: string, value: any) => any): any;
}
