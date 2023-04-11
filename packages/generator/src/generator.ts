import { generatorHandler, GeneratorOptions } from '@prisma/generator-helper'
import path from 'path'
import { GENERATOR_NAME } from './constants'
import { writeFileSafely } from './utils/writeFileSafely'
import { genModel } from './helpers/genModel'

const { version } = require('../package.json')

generatorHandler({
  onManifest() {
    return {
      version,
      defaultOutput: '../generated',
      prettyName: GENERATOR_NAME,
    }
  },
  onGenerate: async (options: GeneratorOptions) => {
    const imports = new Map<string, Set<string>>();
    const addImport = (from: string, name: string) => {
      imports.set(from, (imports.get(from) ?? new Set()).add(name))
    }

    const outputFile = (fileName: string) => path.join(
      options.generator.output?.value!,
      `${fileName}.ts`,
    );
    
    const models = options.dmmf.datamodel.models.map(model => genModel(model, options));

    for (const importInfo of models.flatMap(model => model.imports)) {
      if (importInfo) addImport(importInfo.from, importInfo.name);
    }

    const importStr = Array.from(imports.entries()).map(
      ([from, vals]) => `import {${Array.from(vals.values())}} from '${from}';`
    ).join('\n');

    const modelStr = models.map(model => model.code).join('\n\n');
    await writeFileSafely(outputFile('schema'), `${importStr}\n\n${modelStr}`);
  },
})
