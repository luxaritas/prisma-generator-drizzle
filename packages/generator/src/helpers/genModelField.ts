import { DMMF, GeneratorOptions } from '@prisma/generator-helper'
import { GENERATOR_NAME } from '../constants';

const types = {
    mysql: new Map([
        ['String', { ctor: 'varchar', opts: { length: 191 }, generic: '<string, string, Readonly<[string, ...string[]]>>' }],
        // FIXME: Prisma actually maps this as TINYINT and then casts to boolean
        ['Boolean', { ctor: 'boolean', generic: '<string>' }],
        ['Int', { ctor: 'int', generic: '<string>' }],
        ['BigInt', { ctor: 'bigint', opts: { mode: 'bigint' }, generic: '<string, \'bigint\'>' }],
        ['Float', { ctor: 'double', generic: '<string>' }],
        ['Decimal', { ctor: 'decimal', opts: { precision: 65, scale: 30 }, generic: '<string>' }],
        ['DateTime', { ctor: 'datetime', opts: { mode: 'date', fsp: 3 }, generic: '<string, \'bigint\'>' }],
        ['Json', { ctor: 'json', generic: '<string>' }],
        // FIXME: Prisma actually maps this as LONGBLOB
        ['Bytes', { ctor: 'varbinary', opts: { length: 4294967295 }, generic: '<string>' }],
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
            return `.default(${field.default}${field.type === 'BigInt' ? 'n' : ''})`;
        }
        if (Array.isArray(field.default)) {
            const defaultVals = field.default
                .map((defaultVal) => field.type === 'BigInt' ? `${defaultVal}n` : defaultVal)
                .join(',')
            return `.default([${defaultVals}])`;
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
        return '';
    }

    const specifyGeneric = options.generator.config['looseColumnNameType'] === 'true';

    return {
        code: `${field.name}: ${fieldInfo.ctor}${specifyGeneric ? fieldInfo.generic : ''}('${dbName}'${opts})${notNull}${primaryKey}${getDefault()}`,
        imports,
    };
}
