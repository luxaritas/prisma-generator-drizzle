import { DMMF, GeneratorOptions } from '@prisma/generator-helper'
import { GENERATOR_NAME } from '../constants';

const types = {
    mysql: new Map([
        ['String', {ctor: 'varchar', opts: {length: 191}}],
        // FIXME: Prisma actually maps this as TINYINT and then casts to boolean
        ['Boolean', {ctor: 'boolean'}],
        ['Int', {ctor: 'int'}],
        ['BigInt', {ctor: 'bigint', opts: {mode: 'bigint'}}],
        ['Float', {ctor: 'double'}],
        ['Decimal', {ctor: 'decimal', opts: {precision: 65, scale: 30}}],
        ['DateTime', {ctor: 'datetime', opts: {mode: 'date', fsp: 3}}],
        ['Json', {ctor: 'json'}],
        // TODO: Prisma actually maps this as LONGBLOB
        ['Bytes', {ctor: 'varbinary', opts: {length: 4294967295}}]
    ])
};

export const genModelField = (field: DMMF.Field, options: GeneratorOptions) => {
    const provider = options.datasources[0].provider;
    if (provider !== 'mysql') {
        console.log(`[WARN] ${GENERATOR_NAME}: Field ${field.name}: Provider ${provider} is not currently supported`);
        return {
            code: `// Field ${field.name} is unavailable due to unsupported provider ${provider}`,
            imports: [],
        }
    }
    if (field.kind === 'object') return;
    const fieldInfo = types[provider].get(field.type);
    if (!fieldInfo) {
        console.log(`[WARN] ${GENERATOR_NAME}: Field ${field.name}: Type ${field.type} is not supported`);
        return {
            code: `// Field ${field.name} is unavailable due to unsupported type ${field.type}`,
            imports: [],
        }
    }

    const imports = [{name: fieldInfo.ctor, from: 'drizzle-orm/mysql-core'}];

    const dbName: string = field.dbName ?? field.name;
    const opts = fieldInfo.opts ? `, ${JSON.stringify(fieldInfo.opts)}` : '';
    const notNull = field.isRequired ? '.notNull()' : '';
    const primaryKey = field.isId ? '.primaryKey()' : '';
    const getDefault = () => {
        if (!field.default) return '';
        if (
            typeof field.default === 'string'
            || typeof field.default === 'number'
            || typeof field.default === 'boolean'
        ) {
            return `.default(${field.default})`;
        }
        if (Array.isArray(field.default)) {
            return `.default([${field.default}])`;
        }
        if ('name' in field.default) {
            if (field.default.name === 'autoincrement') {
                return '.autoincrement()';
            }
            if (field.default.name === 'dbgenerated') {
                imports.push({name: 'sql', from: 'drizzle-orm'})
                return `.default(sql\`${field.default.args[0]}\`)`;
            } else if (field.default.name === 'now') {
                return `.default(sql\`now()\`)`;
            } else {
                // ex uuid outside of postgres, cuid
                console.log(`[WARN] ${GENERATOR_NAME}: Field ${field.name}: Default ${field.default.name} is unsupported`);
                return `/* Default ${field.default.name} unsupported */`;
            }
        }
    }

    return {
        code: `${field.name}: ${fieldInfo.ctor}('${dbName}'${opts})${notNull}${primaryKey}${getDefault()}`,
        imports,
    };
}
