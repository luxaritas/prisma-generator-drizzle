import { DMMF, GeneratorOptions } from '@prisma/generator-helper'
import { genModelField } from './genModelField';

export const genModel = (model: DMMF.Model, options: GeneratorOptions) => {
    let tableFrom: string;
    let tableType: string;

    const provider = options.datasources[0].provider;
    if (provider === 'mysql') {
        tableFrom = 'drizzle-orm/mysql-core';
        tableType = 'mysqlTable';
    } else {
        throw new Error(`Provider ${provider} is not currently supported`)
    }

    const fields = model.fields.map((field) => genModelField(field, options));
    const fieldStr = fields
        .map((field) => field?.code ?? '')
        .filter((code) => code !== '')
        .join(',\n');

    return {
        code: `
            export const ${model.name} = ${tableType}('${model.dbName ?? model.name}', {
                ${fieldStr}
            });
        `,
        imports: [{from: tableFrom, name: tableType}, ...fields.flatMap(field => field?.imports)]
    };
}
